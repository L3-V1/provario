# Tarefas — Feature 1: Perfis institucionais

Deriva de [../plans/perfis-institucionais.md](../plans/perfis-institucionais.md).
Marcar `[x]` ao concluir. TDD: tarefas RED antes das GREEN correspondentes.

Legenda de estado: `[ ]` pendente · `[~]` em andamento · `[x]` concluída

## Etapa 0 — Andaime

- [x] 0.1 Migration `create_perfis_institucionais_table` com colunas da spec §2
- [x] 0.2 `PerfilInstitucionalFactory`
- [x] 0.3 Model `PerfilInstitucional` (`$table`, `$fillable`, `user()`, accessor `logoUrl`)
- [x] 0.4 `User::perfisInstitucionais()` HasMany
- [x] 0.5 `php artisan migrate` ok em ambiente local e de teste

## Etapa 1 — Repository

- [x] 1.1 RED: teste `paraProfessor` filtra por `user_id` e ordena por `instituicao`
- [x] 1.2 RED: teste `encontrarDoProfessor` lança `ModelNotFoundException` para id de outro professor
- [x] 1.3 RED: teste `criar` / `atualizar` / `remover` persistem
- [x] 1.4 GREEN: `PerfilInstitucionalRepository` com os 5 métodos
- [x] 1.5 REFACTOR: phpstan nível 7 limpo

## Etapa 2 — Service

- [x] 2.1 RED: `criar` sem logo → `logo_path` null
- [x] 2.2 RED: `criar` com logo → arquivo em `logos/`, `logo_path` setado
- [x] 2.3 RED: `atualizar` com novo logo → antigo apagado, novo salvo
- [x] 2.4 RED: `atualizar` com `removerLogo=true` → antigo apagado, `logo_path` null
- [x] 2.5 RED: `atualizar` sem alteração de logo → mantém
- [x] 2.6 RED: `remover` → arquivo apagado + registro removido
- [x] 2.7 GREEN: `PerfilInstitucionalService`
- [x] 2.8 REFACTOR

## Etapa 3 — Form Request

- [x] 3.1 `SalvarPerfilRequest` com regras da spec §4 e mensagens pt_BR

## Etapa 4 — Controller + rotas

- [x] 4.1 RED: convidado redirecionado para login em todas as 6 rotas
- [x] 4.2 RED: `index` lista apenas perfis do professor logado
- [x] 4.3 RED: `store` sem logo cria perfil
- [x] 4.4 RED: `store` valida campos obrigatórios
- [x] 4.5 RED: `store` valida mimes e tamanho máx do logo
- [x] 4.6 RED: `store` com logo grava arquivo + `logo_path`
- [x] 4.7 RED: `edit` / `update` / `destroy` de perfil de outro professor → 404
- [x] 4.8 RED: `update` trocando logo apaga o arquivo antigo
- [x] 4.9 RED: `update` com `remover_logo` apaga arquivo e zera `logo_path`
- [x] 4.10 RED: `destroy` remove registro + arquivo + flash toast
- [x] 4.11 GREEN: `PerfilInstitucionalController` (6 ações, resolve manual via service)
- [x] 4.12 GREEN: 6 rotas explícitas em `routes/web.php` (grupo `auth`, URLs `criar`/`editar`)
- [x] 4.13 REFACTOR

## Etapa 5 — Frontend

- [x] 5.1 Tipo `Perfil` em `resources/js/types/perfil.ts` + export no `index.ts`
- [x] 5.2 `pages/perfis/Index.vue`: DataTable, thumbnail, botão novo, estado vazio
- [x] 5.3 `Index.vue`: excluir com `useConfirm` (`<ConfirmDialog />` já é global em `AppLayout.vue`)
- [x] 5.4 `components/PerfilForm.vue`: campos + `FileUpload` básico (captura `File`)
- [x] 5.5 `pages/perfis/Create.vue` usando `PerfilForm`
- [x] 5.6 `pages/perfis/Edit.vue` usando `PerfilForm` (`_method: 'put'`, multipart)
- [x] 5.7 `Edit.vue`: exibe logo atual + botão "Remover logo" (`remover_logo=true`)
- [x] 5.8 Erros de validação por campo (`form.errors`)
- [x] 5.9 Item "Perfis institucionais" na sidebar (`AppSidebar.vue`, ícone `Building2`)
- [x] 5.10 `npm run types:check` e `npm run build` verdes

## Etapa 6 — Fechamento

- [~] 6.1 `composer test`: phpstan nível 7 e `artisan test` verdes; `pint --test` falha em `routes/auth.php`/`database/seeders/DatabaseSeeder.php` — **pré-existente, fora do escopo desta feature** (nenhum arquivo meu reprova pint)
- [x] 6.2 `npm run check` verde (arquivos da feature; docs pré-existentes com pendência de formatação fora do escopo)
- [x] 6.3 Revisão do checklist da spec §7
- [x] 6.4 Este arquivo com todas as tarefas marcadas
