# Plano de implementação — Feature 1: Perfis institucionais

**ID:** 01
**Slug:** perfis-institucionais

Baseado em [../specs/01-perfis-institucionais.md](../specs/01-perfis-institucionais.md).
Abordagem TDD RED-GREEN-REFACTOR. Ordem pensada para cada camada nascer coberta
por teste antes da próxima depender dela.

## Ordem das etapas

### Etapa 0 — Andaime

1. `PerfilInstitucionalFactory` + migration `create_perfis_institucionais_table`.
2. Model `PerfilInstitucional` (table, fillable, `user()`, accessor `logoUrl`).
3. `User::perfisInstitucionais()` HasMany.
4. Rodar `php artisan migrate` no ambiente de teste (sqlite in-memory já configurado).

_Sem teste próprio; validado pelas etapas seguintes._

### Etapa 1 — Repository

- RED: `tests/Unit/Repositories/PerfilInstitucionalRepositoryTest.php`
    - `paraProfessor` filtra por `user_id`, ordena por `instituicao`.
    - `encontrarDoProfessor` → `ModelNotFoundException` para id de outro professor.
    - `criar` / `atualizar` / `remover` persistem corretamente.
- GREEN: `app/Repositories/PerfilInstitucionalRepository.php`.
- REFACTOR: tipos/phpstan nível 7.

### Etapa 2 — Service (lógica de logo)

- RED: `tests/Unit/Services/PerfilInstitucionalServiceTest.php` (`Storage::fake('public')`)
    - `criar` sem logo → `logo_path` null.
    - `criar` com logo → arquivo em `logos/`, `logo_path` setado.
    - `atualizar` com novo logo → antigo apagado, novo salvo.
    - `atualizar` com `removerLogo=true` → antigo apagado, `logo_path` null.
    - `atualizar` sem nada → logo mantido.
    - `remover` → arquivo apagado + registro removido.
- GREEN: `app/Services/PerfilInstitucionalService.php`.
- REFACTOR.

### Etapa 3 — Form Request

- `app/Http/Requests/Perfil/SalvarPerfilRequest.php`
    - regras: 3 textos `required|string|max:255`; `logo` `nullable|image|mimes:png,jpg,jpeg,webp|max:2048`; `remover_logo` `nullable|boolean`.
    - mensagens pt_BR.
- Coberto pelos feature tests da etapa 4 (casos de validação).

### Etapa 4 — Controller + rotas

- RED: `tests/Feature/Perfis/PerfilInstitucionalTest.php`
    - convidado → redirect login (todas as rotas).
    - `index` lista só do professor logado.
    - `store` sem logo cria; valida obrigatórios; valida mimes/tamanho.
    - `store` com logo grava arquivo + `logo_path`.
    - `edit`/`update`/`destroy` de outro professor → 404.
    - `update` troca logo → `Storage::assertMissing` no antigo.
    - `update` `remover_logo` → arquivo apagado, `logo_path` null.
    - `destroy` → registro e arquivo removidos; flash toast.
- GREEN:
    - `app/Http/Controllers/PerfilInstitucionalController.php` (6 ações, resolve manual via service).
    - 6 rotas explícitas em `routes/web.php` dentro do grupo `auth` (URLs `criar`/`editar`).
- REFACTOR.

### Etapa 5 — Frontend

1. Tipo `Perfil` em `resources/js/types/`.
2. `resources/js/pages/perfis/Index.vue` — DataTable + thumbnail + ConfirmDialog + estado vazio.
3. `resources/js/components/PerfilForm.vue` — campos + upload (FileUpload básico).
4. `resources/js/pages/perfis/Create.vue` e `Edit.vue` usando o form.
5. `Edit.vue`: logo atual + botão "Remover logo".
6. Item na sidebar `AppSidebar.vue` (ícone `Building2`).
7. `npm run build` + `npm run types:check` verdes.

### Etapa 6 — Fechamento

- `composer test` (pint --test + phpstan 7 + artisan test) verde.
- `npm run check` verde.
- Revisar checklist da spec seção 7.
- Atualizar `docs/tasks/01-perfis-institucionais.md` com o progresso.

## Arquivos criados/alterados

**Novos**

- `database/migrations/xxxx_create_perfis_institucionais_table.php`
- `database/factories/PerfilInstitucionalFactory.php`
- `app/Models/PerfilInstitucional.php`
- `app/Repositories/PerfilInstitucionalRepository.php`
- `app/Services/PerfilInstitucionalService.php`
- `app/Http/Requests/Perfil/SalvarPerfilRequest.php`
- `app/Http/Controllers/PerfilInstitucionalController.php`
- `resources/js/pages/perfis/Index.vue`, `Create.vue`, `Edit.vue`
- `resources/js/components/PerfilForm.vue`
- `tests/Unit/Repositories/PerfilInstitucionalRepositoryTest.php`
- `tests/Unit/Services/PerfilInstitucionalServiceTest.php`
- `tests/Feature/Perfis/PerfilInstitucionalTest.php`

**Alterados**

- `app/Models/User.php` (relação `perfisInstitucionais`)
- `routes/web.php` (6 rotas)
- `resources/js/components/AppSidebar.vue` (item de menu)
- `resources/js/types/index.ts` (ou arquivo de tipos equivalente — tipo `Perfil`)

## Riscos / pontos de atenção

- Upload multipart com `useForm` do Inertia em `Edit` exige `_method: 'put'` +
  `forceFormData`. Confirmar comportamento na versão do Inertia do projeto.
- `FileUpload` do PrimeVue: usar modo básico e capturar o `File` via evento
  `select`; não usar o upload automático do componente.
- Symlink `storage:link` precisa existir no ambiente (o `composer setup` já roda).
- Nome de tabela plural irregular (`perfis_institucionais`) exige `$table`
  explícito no model e cuidado na migration.
