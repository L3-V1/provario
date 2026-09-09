# Spec: Painel inicial

**Status:** gerado
**Slug:** painel-inicial

## Problema

A tela inicial (`route('dashboard')`, `resources/js/pages/Dashboard.vue`) hoje é
só um `Card` com texto placeholder. O professor logado chega ao sistema sem
nenhum ponto de partida: não vê se tem uma prova em andamento, não tem atalhos
para os fluxos principais, não vê seus perfis institucionais e não tem
orientação sobre como o fluxo de criação de prova funciona.

Público-alvo: professores do ensino fundamental já autenticados (único tipo de
usuário; sem papéis/permissões).

## Escopo

### Dentro

- Enriquecer `Dashboard.vue` com quatro blocos, sem nova entidade persistida e
  sem nova dependência:
    1. **Card de rascunho** — lê `provario:rascunho-prova` do `localStorage` via o
       composable existente `useRascunhoProva`.
    2. **Atalhos rápidos** — ações para criar prova (`prova.criar`), novo perfil
       (`perfis.create`) e gerenciar perfis (`perfis.index`).
    3. **Resumo de perfis** — lista compacta dos perfis institucionais do
       professor (logo, instituição, escola) com link para o CRUD; estado vazio
       com CTA.
    4. **Guia do fluxo** — passo a passo estático (configurar → gerar prompt →
       colar markdown da I.A. → pré-visualizar/imprimir) com lembrete do contrato
       de formato do markdown.
- Ajuste no `DashboardController` para passar a prop `perfis` ao Inertia, via
  `PerfilInstitucionalService::listar` (mesmo padrão já usado por
  `ProvaController`).
- Primeiros componentes de "stat/widget" do front, em `resources/js/components/painel/`.

### Fora

- Qualquer bloco além dos quatro acima.
- Nova entidade persistida ou nova dependência (lib de markdown, PDF, etc.).
- Novo item de menu (o Dashboard já está no `AppSidebar`).
- Persistir prova no servidor ou histórico/duplicação de provas.
- Novos testes de backend além do ajuste de prop do controller; Vitest (não
  toca no parser).
- Limpeza automática do rascunho — só pelo botão "Nova prova".

## Restrições

- Stack fixa: Laravel 13 + Inertia 3 + Vue 3 + PrimeVue 4 (Aura) + Tailwind 4 +
  Ziggy; backend em camadas Controller → Service → Repository.
- Rascunho vive só em `localStorage`; o composable `useRascunhoProva` já é
  tolerante a ausência de chave, JSON inválido e versão de schema diferente.
- Dark mode via classe `.dark`; todo utilitário de cor precisa do par `dark:`.
- Nomenclatura de domínio e UI em português; locale `pt_BR`.
- Rotas consumidas via Ziggy `route()`; nomes já existentes: `dashboard`,
  `prova.criar`, `perfis.index`, `perfis.create`.
- Limpar rascunho usa `limparRascunho()` do composable, sempre atrás de um
  `ConfirmDialog` do PrimeVue.
- DoD global: `vp check`, `npm run types:check`, Pint, PHPStan nível 7, suíte
  verde; ciclo TDD.

## Critérios de aceite (EARS)

- **AC-01** — Enquanto o professor autenticado está na rota `dashboard`, o
  sistema deve exibir os quatro blocos: card de rascunho, atalhos rápidos,
  resumo de perfis e guia do fluxo.
- **AC-02** — O sistema deve considerar que existe um rascunho de prova quando,
  no estado devolvido por `useRascunhoProva`, `passoAtual` for maior que 1 OU
  algum campo de configuração estiver preenchido (`materia`, `ano` ou
  `quantidade` não nulos) OU o `markdown` colado não estiver vazio.
- **AC-03** — Enquanto existe um rascunho de prova, o card de rascunho deve
  exibir matéria, ano, quantidade de questões e o passo atual (1–4), além dos
  botões "Retomar" e "Nova prova".
- **AC-04** — Quando o professor aciona "Retomar" no card de rascunho, o
  sistema deve navegar para `route('prova.criar')` sem alterar o rascunho.
- **AC-05** — Quando o professor aciona "Nova prova" no card de rascunho, o
  sistema deve pedir confirmação via `ConfirmDialog` antes de qualquer
  alteração.
- **AC-06** — Quando o professor confirma o `ConfirmDialog` de "Nova prova", o
  sistema deve chamar `limparRascunho()` e o card deve passar a exibir o estado
  "sem rascunho".
- **AC-07** — Enquanto não existe um rascunho de prova, o card de rascunho deve
  exibir apenas a CTA "Criar prova", que navega para `route('prova.criar')`.
- **AC-08** — O bloco de atalhos rápidos deve oferecer, sempre visíveis, as
  ações "Criar prova" (`prova.criar`), "Novo perfil" (`perfis.create`) e
  "Gerenciar perfis" (`perfis.index`), cada uma navegando para a rota
  correspondente.
- **AC-09** — O `DashboardController` deve passar ao Inertia a prop `perfis` do
  professor logado, obtida via `PerfilInstitucionalService::listar`.
- **AC-10** — Enquanto o professor tem um ou mais perfis institucionais, o
  bloco de resumo de perfis deve listar todos eles com logo, instituição e
  escola, e um link para `route('perfis.index')`.
- **AC-11** — Enquanto o professor não tem nenhum perfil institucional, o bloco
  de resumo de perfis deve exibir um estado vazio com CTA para criar o primeiro
  perfil (`perfis.create`).
- **AC-12** — O bloco guia do fluxo deve exibir conteúdo 100% estático: os
  passos configurar → gerar prompt → colar markdown da I.A. →
  pré-visualizar/imprimir e um lembrete do contrato de formato do markdown, sem
  depender de nenhum dado.

## Comportamentos indesejados

- **AC-13** — Se o `localStorage` estiver indisponível ou o conteúdo da chave
  `provario:rascunho-prova` for JSON inválido ou de versão diferente, então o
  sistema deve tratar como "sem rascunho" (AC-07) e renderizar o painel sem
  lançar erro.
- **AC-14** — Se o professor cancelar (ou fechar) o `ConfirmDialog` de "Nova
  prova", então o sistema não deve alterar o rascunho e o card deve continuar
  exibindo o rascunho atual.
- **AC-15** — Se o carregamento dos perfis falhar ou vier vazio, então o bloco
  de resumo deve cair no estado vazio (AC-11) sem quebrar os demais blocos.
- **AC-16** — O painel inicial não deve, em nenhuma hipótese, limpar ou
  modificar o rascunho automaticamente — apenas pela ação explícita de "Nova
  prova" confirmada.

## Próximos passos

Próxima etapa: `/plan painel-inicial`
