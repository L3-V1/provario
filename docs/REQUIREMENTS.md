# Requisitos — Provario (MVP)

Documento consolidado a partir de entrevista técnica de levantamento de
requisitos. Todas as decisões abaixo foram respondidas pelo usuário durante a
entrevista; nada foi inventado.

## 1. Visão geral

Aplicação web para professores do ensino fundamental elaborarem provas com
apoio de I.A. Fluxo original proposto pelo usuário:

1. O professor configura variáveis como matéria, ano e quantidade de questões.
2. O sistema gera um prompt pronto para copiar e colar em algum chat de I.A.
3. A I.A devolve um conteúdo em markdown.
4. O professor preenche outros campos referentes ao template de impressão
   (informações de cabeçalho e logo institucional).
5. O professor cola o markdown gerado pela I.A no campo das questões.
6. O sistema monta uma pré-visualização da prova, que o professor pode salvar
   e imprimir.

Stack: template atual do repositório (VILT — Laravel + Inertia + Vue 3 +
Tailwind, com PrimeVue 4).

## 2. Escopo do MVP

- **Persistência**: apenas "perfis institucionais" (nome da instituição,
  escola, professor, logo) são salvos no banco, vários por professor. A prova
  em si **não** é persistida no servidor.
- **Rascunho**: enquanto o professor preenche o wizard, o estado fica salvo em
  localStorage do navegador. É limpo **apenas** quando o professor clicar em
  "Nova prova" — nunca automaticamente (nem após imprimir).
- **Impressão**: via navegador (`window.print()` + CSS `@media print`). Sem
  geração de PDF no servidor, sem nova dependência de PDF.
- **Autenticação**: reaproveita o cadastro público já existente no template.
  Sem papéis/permissões.
- **Tema**: Aura padrão do PrimeVue, sem identidade visual institucional.

## 3. Fluxo detalhado (wizard em etapas)

### Passo 1 — Configuração
- Matéria (select fechado): Português, Matemática, Ciências, História,
  Geografia, Arte, Inglês, Educação Física, Ensino Religioso.
- Ano (select fechado): 1º ao 9º ano do ensino fundamental.
- Quantidade de questões (numérico).

### Passo 2 — Prompt
- Sistema monta o texto do prompt a partir de um template fixo, com base nas
  variáveis do Passo 1.
- Exibido em textarea somente leitura, com botão "Copiar prompt"
  (`navigator.clipboard`).
- O prompt deixa a I.A decidir livremente a mistura entre questões de
  múltipla escolha e verdadeiro/falso.
- O prompt exige que a resposta siga o formato markdown estrito descrito na
  seção 6, incluindo o gabarito.

### Passo 3 — Conteúdo e cabeçalho
- Professor cola o markdown retornado pela I.A em um textarea.
- Pode selecionar um perfil institucional salvo, que pré-preenche os campos
  de cabeçalho — editar os campos no formulário **não** altera o perfil
  salvo.
- Preenche/ajusta os campos de cabeçalho (seção 4).
- Escolhe layout de impressão em 1 ou 2 colunas.

### Passo 4 — Pré-visualização e impressão
- Preview em folha A4, montado a partir do parse do markdown colado.
- Gabarito é **sempre** impresso, como última página, separado por quebra de
  página.
- Botão que aciona a impressão do navegador (o professor usa "Salvar como
  PDF" da própria caixa de impressão, se quiser um arquivo).

## 4. Campos do cabeçalho da prova

- Instituição, escola, disciplina, professor.
- Título da prova, bimestre/período, valor total.
- Linhas em branco para o aluno preencher à mão: nome, turma, data, nota.
- Um logo institucional (imagem única), vinculado ao perfil institucional
  selecionado/salvo.

## 5. Tipos de questão suportados no MVP

- Múltipla escolha (alternativas a–e).
- Verdadeiro ou falso.
- **Fora de escopo no MVP**: dissertativa, complete/associação.

## 6. Contrato de formato do markdown

O prompt gerado no Passo 2 deve exigir que a I.A responda exatamente neste
formato, e o parser do sistema deve consumir esse mesmo formato:

- Cada questão começa com um cabeçalho `## Questão N (tipo)`, onde `tipo` é
  `múltipla escolha` ou `verdadeiro ou falso`.
- Questões de múltipla escolha têm alternativas em linhas `a) texto` até
  `e) texto`.
- Questões de verdadeiro ou falso têm afirmações em linhas
  `N. ( ) texto`.
- Ao final, uma seção `## Gabarito` traz uma linha de resposta por questão,
  na mesma numeração.
- Formatação inline suportada no enunciado: apenas `**negrito**` e
  `*itálico*`. Qualquer outro markdown (tabelas, listas, imagens, código) não
  é interpretado — vira texto puro.

Exemplo completo:

```
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

## 7. Perfis institucionais (única entidade persistida)

- CRUD completo, escopado ao professor logado.
- Um professor pode ter **vários** perfis (ex.: mais de uma escola).
- Campos: nome da instituição, nome da escola, nome do professor, logo
  (upload de arquivo — um único logo por perfil).

## 8. Tratamento de erro de parsing

Quando o markdown colado não corresponde ao formato esperado (ex.: menos
questões que o pedido, tipo de questão não reconhecido, gabarito incompleto),
o sistema exibe um aviso, mas ainda assim renderiza a pré-visualização com o
que conseguiu interpretar. O textarea de markdown permanece editável para o
professor corrigir manualmente.

## 9. Fora do escopo do MVP

- Geração de PDF no servidor.
- Mais de um logo no cabeçalho.
- Formatação além de negrito/itálico no enunciado (tabelas, listas, imagens,
  código).
- Questões dissertativas e de complete/associação.
- Papéis/permissões de usuário.
- Identidade visual institucional/branding.
- Histórico, reabertura ou duplicação de provas geradas (a prova não é
  persistida).

## 10. Notas técnicas de referência

Stack já existente no template, para orientar a implementação:

- Laravel 13 + Inertia + Vue 3 + PrimeVue 4 (Aura) + Tailwind 4.
- Arquitetura Controller → Service → Repository; repositórios são classes
  concretas, sem interface; nomenclatura de domínio em português.
- Parser do markdown implementado em TypeScript no frontend, sem depender de
  lib de markdown.
- Vitest a ser adicionado como dependência de teste, exclusivamente para
  cobrir o parser.
