# Especificação — Feature 2: Wizard de criação de prova

Slug: `wizard-criacao-prova`. Deriva de [../constitution/provario.md](../constitution/provario.md)
(feature `wizard-criacao-prova`, "Contrato de formato do markdown",
"Tratamento de erro de parsing"). As decisões abaixo vieram das rodadas de
perguntas; nada foi inventado.

## 1. Decisões da entrevista técnica

| Tema                       | Decisão                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Arquitetura                | Página Inertia única (`GET /prova/criar`) + Stepper client-side de 4 passos                        |
| Persistência               | Nenhuma no servidor. Estado só em `localStorage`, salvo a cada alteração                           |
| Limpeza do rascunho        | Apenas pelo botão "Nova prova" (Passo 4) com `ConfirmDialog`. Nunca automática                     |
| Template do prompt         | Texto fixo em pt_BR (seção 5 deste doc), variáveis do Passo 1 interpoladas                         |
| Preview Passo 4            | Markdown bruto em `<pre>` + cabeçalho montado + layout 1/2 colunas visível. Sem parser (feature 3) |
| Fonte dos perfis           | Prop Inertia no load de `/prova/criar` (sem endpoint JSON)                                         |
| Campos de cabeçalho extras | `titulo`, `bimestre`, `valor_total` — todos opcionais, texto livre                                 |
| Menu                       | Um item na sidebar: "Criar prova" → `prova.criar` (ícone `FileText`)                               |
| Testes                     | Só feature test PHP (render da rota + prop de perfis). Vitest só na feature 3                      |

## 2. Backend

Sem migration, sem model, sem service/repository novos. A prova não é persistida.

### Controller — `app/Http/Controllers/ProvaController.php`

- `__invoke(Request $request)` (single action), `->middleware('auth')`.
- Retorna `Inertia::render('prova/Criar', ['perfis' => ...])`.
- `perfis`: lista dos perfis do professor logado, reaproveitando
  `PerfilInstitucionalService::listar($request->user())`, mapeada para
  `['id', 'instituicao', 'escola', 'professor', 'logo_url']`.
- Nenhum endpoint de escrita.

### Rota — `routes/web.php` (dentro do grupo `middleware(['auth'])`)

```php
Route::get('prova/criar', ProvaController::class)->name('prova.criar');
```

## 3. Frontend

### Página — `resources/js/pages/prova/Criar.vue`

- Props: `perfis: PerfilResumo[]`.
- `AppLayout` + `Breadcrumbs` (`Criar prova`).
- PrimeVue `Stepper` (ou `Steps` + conteúdo controlado) com `v-model` no passo atual.
    - Navegação para trás: livre. Para frente: bloqueada enquanto o passo atual for inválido.
- Cada passo é um componente em `resources/js/components/prova/`:
    - `PassoConfiguracao.vue`
    - `PassoPrompt.vue`
    - `PassoConteudo.vue`
    - `PassoPreview.vue`
- O estado do wizard vem do composable `useRascunhoProva()` (seção 4); a página
  não guarda estado próprio além do passo atual (que também é persistido).

### Passo 1 — `PassoConfiguracao.vue`

- `materia`: PrimeVue `Select`, opções fechadas (9): Português, Matemática,
  Ciências, História, Geografia, Arte, Inglês, Educação Física, Ensino Religioso.
- `ano`: `Select`, opções `1º ano` … `9º ano` (valor `1`–`9`).
- `conteudo`: `InputText`, texto livre, obrigatório. Conteúdo didático da prova
  (ex.: `Genética, Reprodução, Ciclo da Água`).
- `quantidade`: `InputNumber`, inteiro, mín 1, máx 30 (default vazio).
- Válido quando `materia`, `ano`, `conteudo` preenchidos e `quantidade >= 1`.

### Passo 2 — `PassoPrompt.vue`

- `Textarea` somente leitura com o prompt montado por `buildPromptProva(config)`
  (seção 5). Recalcula ao entrar no passo / mudar o Passo 1.
- Botão "Copiar prompt": `navigator.clipboard.writeText(...)` + toast de sucesso
  (`FlashToasts` já existe; usar `useToast` do PrimeVue no cliente).
- Sempre válido (não exige input).

### Passo 3 — `PassoConteudo.vue`

- `Textarea` `conteudo.markdown`: professor cola o markdown da I.A. Sem validação
  de formato (parser é feature 3); campo continua editável em qualquer momento.
- `Select` opcional "Usar perfil institucional": lista `perfis` (label
  `instituicao — escola`). Ao escolher, pré-preenche `cabecalho.instituicao`,
  `.escola`, `.professor` e guarda `cabecalho.perfil_id` + `logo_url`.
  Editar os campos depois **não** altera o perfil salvo e **não** limpa
  `perfil_id` (o `logo_url` segue o do perfil escolhido).
  Opção "Nenhum" zera `perfil_id` e `logo_url`.
- Campos de cabeçalho (todos `InputText`, opcionais):
  `instituicao`, `escola`, `disciplina` (default = `materia` do Passo 1 se vazio),
  `professor`, `titulo`, `bimestre`, `valor_total`.
- `layout`: `SelectButton` / `RadioButton` com `1` ou `2` colunas (default `1`).
- Sempre válido.

### Passo 4 — `PassoPreview.vue`

- Bloco de cabeçalho montado a partir de `cabecalho` + `logo_url` (img quando houver):
  instituição, escola, disciplina, professor, título, bimestre, valor total, e
  linhas em branco fixas para o aluno (nome, turma, data, nota).
- `<pre>` com `conteudo.markdown` cru (classe para respeitar `white-space: pre-wrap`).
- Container do `<pre>` reflete `layout` (1 ou 2 colunas via CSS `columns`), só como
  demonstração visual — parsing real e impressão chegam nas features 3 e 4.
- Aviso fixo: "Pré-visualização completa (questões formatadas e impressão) chega
  na próxima etapa do projeto."
- Botão "Nova prova": `useConfirm()` + `<ConfirmDialog />`. Ao confirmar,
  `limparRascunho()` e volta ao Passo 1. Fica na barra de navegação do rodapé,
  no lugar do botão "Avançar" (à direita, ao lado de "Voltar"); renderizado só
  no último passo. A ação vive em `Criar.vue`, não em `PassoPreview.vue`.

### Composable — `resources/js/composables/useRascunhoProva.ts`

- Chave `localStorage`: `provario:rascunho-prova`.
- Estado reativo (`reactive`/`ref`) com shape versionado:

```ts
type RascunhoProva = {
    versao: 1;
    passoAtual: number; // 0..3
    config: {
        materia: string | null;
        ano: number | null;
        conteudo: string;
        quantidade: number | null;
    };
    conteudo: { markdown: string };
    cabecalho: {
        perfil_id: number | null;
        logo_url: string | null;
        instituicao: string;
        escola: string;
        disciplina: string;
        professor: string;
        titulo: string;
        bimestre: string;
        valor_total: string;
    };
};
```

- `carregar()`: lê a chave; se ausente, JSON inválido ou `versao` diferente,
  retorna o estado inicial vazio (sem lançar).
- `watch` profundo → grava no `localStorage` a cada alteração (debounce leve
  opcional, ~200 ms).
- `limparRascunho()`: `localStorage.removeItem(...)` + reseta o estado para o inicial.
- Nunca limpa sozinho (nem em `onMounted`, nem ao trocar de passo, nem ao sair).

### Builder do prompt — `resources/js/lib/promptProva.ts`

- `buildPromptProva(config): string` — função pura, sem dependências.
- Usada só pelo Passo 2. (Testada por Vitest apenas na feature 3.)

### Tipos — `resources/js/types/prova.ts`

```ts
export type PerfilResumo = {
    id: number;
    instituicao: string;
    escola: string;
    professor: string;
    logo_url: string | null;
};

export const MATERIAS = [
    'Português',
    'Matemática',
    'Ciências',
    'História',
    'Geografia',
    'Arte',
    'Inglês',
    'Educação Física',
    'Ensino Religioso',
] as const;
```

(mais `RascunhoProva` da seção 4.)

### Menu — `resources/js/components/AppSidebar.vue`

Adicionar ao array `items`, após "Perfis institucionais":

```ts
{
    label: 'Criar prova',
    href: route('prova.criar'),
    icon: FileText, // de @lucide/vue
    active: route().current('prova.*'),
}
```

## 4. Template do prompt (Passo 2)

`buildPromptProva({ materia, ano, conteudo, quantidade })` produz exatamente:

```
Você é um professor do ensino fundamental brasileiro. Elabore uma prova de
{materia} para o {ano}º ano sobre os seguintes conteúdos: {conteudo}, com
{quantidade} questões no total.

Regras do conteúdo:
- Misture livremente questões de múltipla escolha e de verdadeiro ou falso,
  na proporção que julgar melhor para o conteúdo.
- Questões de múltipla escolha têm de 4 a 5 alternativas.
- Use linguagem adequada à faixa etária.

Responda SOMENTE com o markdown da prova, exatamente neste formato, sem
comentários antes ou depois:

- Cada questão começa com um cabeçalho: `## Questão N (tipo)`, onde `tipo` é
  `múltipla escolha` ou `verdadeiro ou falso`.
- Logo abaixo do cabeçalho vem o enunciado.
- Questões de múltipla escolha: uma alternativa por linha, de `a)` até `e)`.
- Questões de verdadeiro ou falso: uma afirmação por linha, no formato
  `N. ( ) texto da afirmação`.
- No enunciado use apenas **negrito** e *itálico*. Não use tabelas, listas,
  imagens, código ou títulos.
- Ao final, uma única seção `## Gabarito` com uma linha de resposta por
  questão, na mesma numeração. Para verdadeiro ou falso, use o formato
  `N. 1-V, 2-F, ...`.

Exemplo do formato esperado:

## Questão 1 (múltipla escolha)
Qual é a capital do Brasil?

a) São Paulo
b) Rio de Janeiro
c) Brasília
d) Salvador

## Questão 2 (verdadeiro ou falso)
Julgue as afirmações:

1. ( ) O Sol é uma estrela.
2. ( ) A Terra é plana.

## Gabarito
1. c
2. 1-V, 2-F
```

`{materia}`, `{ano}`, `{conteudo}`, `{quantidade}` interpolados a partir do
Passo 1. O nome da matéria entra por extenso; o ano como número; `{conteudo}` é
o texto livre do campo "Conteúdo didático".

> **Aprovação pendente:** confirmar este texto antes da implementação do Passo 2.

## 5. Testes (TDD — RED/GREEN/REFACTOR)

### `tests/Feature/Prova/CriarProvaTest.php`

- convidado em `GET /prova/criar` → redireciona para login.
- professor autenticado → resposta 200, `Inertia` component `prova/Criar`.
- prop `perfis` traz só os perfis do professor logado, com as chaves
  `id, instituicao, escola, professor, logo_url` (e não vaza `logo_path`).
- professor sem perfis → prop `perfis` é array vazio.

Sem Vitest nesta feature (o builder do prompt e o composable de `localStorage`
serão cobertos na feature 3, junto do parser).

## 6. Comandos de verificação

```bash
composer test        # pint --test + phpstan nível 7 + artisan test
npm run build        # garante que as páginas/componentes Vue compilam
npm run types:check   # vue-tsc
```

## 7. Fora do escopo desta feature

- Parser do markdown e preview real de questões (feature 3).
- Folha A4, CSS `@media print`, `window.print()`, gabarito paginado (feature 4).
- Qualquer persistência da prova no servidor; histórico; duplicação.
- Edição de perfis institucionais a partir do wizard.
- Validação do formato do markdown colado.
