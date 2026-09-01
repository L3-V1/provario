# Especificação — Feature 1: Perfis institucionais

Slug: `perfis-institucionais`. Deriva de [../features/provario.md](../features/provario.md)
e [../REQUIREMENTS.md](../REQUIREMENTS.md) (seções 2, 7). Decisões abaixo vieram
da rodada de perguntas; nada foi inventado.

## 1. Decisões da entrevista técnica

| Tema | Decisão |
|------|---------|
| Model / tabela | `PerfilInstitucional` / `perfis_institucionais` |
| Campos de texto | `instituicao`, `escola`, `professor` — todos obrigatórios, `string` máx 255 |
| Logo | Opcional na criação e na edição |
| Upload | `png`, `jpg`/`jpeg`, `webp`; máx 2 MB; guardado como enviado (sem redimensionar) |
| Storage | Disk `public` + symlink; servido por URL |
| Troca de logo | Ao substituir, o arquivo antigo é apagado do storage |
| Exclusão de perfil | Apaga o logo do storage junto; delete real (sem soft delete) |
| Tela de form | Páginas dedicadas (`create` / `edit`) |
| Listagem | PrimeVue `DataTable`, sem paginação server-side; thumbnail do logo |
| Confirmação de exclusão | PrimeVue `ConfirmDialog` |
| Rota | Prefixo `/perfis`; nomes `perfis.*` |
| Menu | Item de topo na sidebar (`AppSidebar.vue`), label "Perfis institucionais" |
| Testes | Feature tests dos endpoints CRUD + isolamento por professor (TDD) |

## 2. Banco de dados

Migration `create_perfis_institucionais_table`:

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | `id` | |
| `user_id` | `foreignId` → `users`, `cascadeOnDelete` | dono do perfil |
| `instituicao` | `string(255)` | obrigatório |
| `escola` | `string(255)` | obrigatório |
| `professor` | `string(255)` | obrigatório |
| `logo_path` | `string`, nullable | caminho relativo no disk `public` (ex. `logos/ab12.png`) |
| `timestamps` | | |

## 3. Model — `app/Models/PerfilInstitucional.php`

- `protected $table = 'perfis_institucionais';`
- `$fillable`: `user_id`, `instituicao`, `escola`, `professor`, `logo_path`.
- Relação `user(): BelongsTo`.
- Accessor `logoUrl(): ?string` → `Storage::disk('public')->url($logo_path)` ou `null`.
- `User` recebe `perfisInstitucionais(): HasMany`.
- Factory `PerfilInstitucionalFactory` (para os testes).

## 4. Camadas backend (Controller → Service → Repository)

### Repository — `app/Repositories/PerfilInstitucionalRepository.php`

Classe concreta, sem interface. Todo método recebe o `User` e escopa a query.

- `paraProfessor(User $professor): Collection` — `orderBy('instituicao')`.
- `encontrarDoProfessor(User $professor, int $id): PerfilInstitucional` — `->findOrFail()` já filtrado por `user_id` (404 se for de outro professor).
- `criar(User $professor, array $dados): PerfilInstitucional`.
- `atualizar(PerfilInstitucional $perfil, array $dados): PerfilInstitucional`.
- `remover(PerfilInstitucional $perfil): void`.

### Service — `app/Services/PerfilInstitucionalService.php`

Depende do repository e de nada mais. Responsável pelo arquivo de logo.

- `listar(User $professor): Collection`.
- `buscar(User $professor, int $id): PerfilInstitucional`.
- `criar(User $professor, array $dados, ?UploadedFile $logo): PerfilInstitucional`
  - se `$logo`: `store('logos', 'public')` e grava `logo_path`.
- `atualizar(PerfilInstitucional $perfil, array $dados, ?UploadedFile $logo, bool $removerLogo): PerfilInstitucional`
  - `$logo` presente → apaga `logo_path` antigo (se houver), salva o novo.
  - `$removerLogo` true e sem `$logo` novo → apaga o antigo e seta `logo_path = null`.
  - nenhum dos dois → mantém.
- `remover(PerfilInstitucional $perfil): void` — apaga o arquivo de logo (se houver) e chama `repository->remover`.

Apagar arquivo sempre via `Storage::disk('public')->delete()` (silencioso se não existir).

### Controller — `app/Http/Controllers/PerfilInstitucionalController.php`

Resource controller, `->middleware('auth')`. Usa `$request->user()` como professor.
Segue o padrão do `ProfileController`: `Inertia::flash('toast', ...)` + `to_route`.

| Ação | Rota | Retorno |
|------|------|---------|
| `index` | `GET /perfis` → `perfis.index` | `Inertia::render('perfis/Index', ['perfis' => ...])` |
| `create` | `GET /perfis/criar` → `perfis.create` | `Inertia::render('perfis/Create')` |
| `store` | `POST /perfis` → `perfis.store` | flash sucesso + `to_route('perfis.index')` |
| `edit` | `GET /perfis/{perfil}/editar` → `perfis.edit` | `Inertia::render('perfis/Edit', ['perfil' => ...])` |
| `update` | `PUT /perfis/{perfil}` → `perfis.update` | flash sucesso + `to_route('perfis.index')` |
| `destroy` | `DELETE /perfis/{perfil}` → `perfis.destroy` | flash sucesso + `to_route('perfis.index')` |

`{perfil}` **não** usa route-model binding automático — o controller resolve via
`service->buscar($request->user(), $id)` para garantir o escopo por professor.
(Alternativa equivalente: binding + `Gate`/escopo; adotado o resolve manual para
manter o padrão simples do projeto.)

Payload enviado ao front por perfil: `id`, `instituicao`, `escola`, `professor`,
`logo_url` (accessor), `logo_path` (para saber se existe logo).

### Form Requests — `app/Http/Requests/Perfil/`

- `SalvarPerfilRequest` (usada em `store` e `update`):
  - `instituicao`, `escola`, `professor`: `required|string|max:255`.
  - `logo`: `nullable|image|mimes:png,jpg,jpeg,webp|max:2048`.
  - `remover_logo`: `nullable|boolean` (só relevante no `update`).
  - `authorize()`: `true` (escopo garantido no controller/repository; rota já é `auth`).
  - Mensagens em pt_BR.

## 5. Rotas — `routes/web.php`

Dentro do grupo `middleware(['auth'])`:

```php
Route::resource('perfis', PerfilInstitucionalController::class)
    ->parameters(['perfis' => 'perfil'])
    ->names('perfis')
    ->except([]); // todas as 6 ações padrão
```

Ajustar os verbos/URIs de `create`/`edit` para pt_BR (`criar`, `editar`) via
`Route::resource(...)->names(...)` + override manual, ou declarar as 6 rotas
explicitamente. **Decisão:** declarar as 6 rotas explicitamente para poder usar
`criar`/`editar` na URL sem ginástica.

## 6. Frontend (Inertia + Vue 3 + PrimeVue)

Páginas novas em `resources/js/pages/perfis/`:

### `Index.vue`
- Props: `perfis: Perfil[]`.
- `AppLayout` + `Breadcrumbs` (`Perfis institucionais`).
- Botão "Novo perfil" → `perfis.create`.
- `DataTable` (`:value="perfis"`, sem paginação) com colunas:
  - Logo: `<img>` da `logo_url` (miniatura ~40px) ou placeholder quando `null`.
  - Instituição, Escola, Professor.
  - Ações: botão editar (`perfis.edit`), botão excluir.
- Excluir: `useConfirm()` + `<ConfirmDialog />`; ao confirmar,
  `router.delete(route('perfis.destroy', id))`.
- Estado vazio: mensagem "Nenhum perfil cadastrado."

### `Create.vue` e `Edit.vue`
- Compartilham um componente `PerfilForm.vue` (campos + upload).
- `useForm` do Inertia. Campos: `instituicao`, `escola`, `professor`, `logo` (File | null), `remover_logo` (bool).
- Upload: PrimeVue `FileUpload` modo básico (`:auto="false"`, `accept="image/png,image/jpeg,image/webp"`, `:maxFileSize="2097152"`) ou `<input type="file">` estilizado; guarda o `File` no form.
- `Edit.vue`: mostra o logo atual (se houver) com botão "Remover logo" que seta `remover_logo = true`.
- Submit: `form.post` / `form.transform(...)` com `_method: 'put'` no `Edit` (multipart, por causa do arquivo).
- Erros de validação exibidos por campo (`form.errors`).
- Botão cancelar → volta para `perfis.index`.

### Tipos — `resources/js/types/`
```ts
export type Perfil = {
    id: number;
    instituicao: string;
    escola: string;
    professor: string;
    logo_url: string | null;
    logo_path: string | null;
};
```

### Menu — `resources/js/components/AppSidebar.vue`
Adicionar item ao array `items`:
```ts
{
    label: 'Perfis institucionais',
    href: route('perfis.index'),
    icon: Building2, // de @lucide/vue
    active: route().current('perfis.*'),
}
```

## 7. Testes (TDD — RED/GREEN/REFACTOR)

### `tests/Feature/Perfis/PerfilInstitucionalTest.php`
- convidado é redirecionado para login em todas as rotas.
- `index` só lista perfis do professor logado.
- `store` cria perfil sem logo; valida campos obrigatórios; valida mimes/tamanho do logo (`Storage::fake('public')`, `UploadedFile::fake()`).
- `store` com logo grava arquivo em `logos/` e persiste `logo_path`.
- `edit`/`update`/`destroy` de perfil de **outro** professor → 404.
- `update` trocando o logo apaga o arquivo antigo (`Storage::assertMissing`).
- `update` com `remover_logo` apaga o arquivo e zera `logo_path`.
- `destroy` remove o registro e o arquivo de logo.

### `tests/Unit/Services/PerfilInstitucionalServiceTest.php`
- lógica de logo: criar com/sem, substituir, remover, e limpeza no `remover`.

### `tests/Unit/Repositories/PerfilInstitucionalRepositoryTest.php`
- `paraProfessor` filtra por `user_id` e ordena por `instituicao`.
- `encontrarDoProfessor` lança `ModelNotFoundException` para id de outro professor.

Vitest **não** entra nesta feature (é da feature 3, Parser).

## 8. Comandos de verificação

```bash
composer test        # pint --test + phpstan nível 7 + artisan test
npm run build        # garante que as páginas Vue compilam
```

## 9. Fora do escopo desta feature

- Qualquer coisa ligada ao wizard, prompt, parser ou impressão.
- Múltiplos logos, redimensionamento/otimização de imagem, CDN.
- Compartilhamento de perfis entre professores; papéis/permissões.
