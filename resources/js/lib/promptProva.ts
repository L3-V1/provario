import type { ConfigProva } from '@/types/prova';

/**
 * Monta o texto fixo do prompt do Passo 2 a partir das variáveis do Passo 1.
 * Função pura — sem dependências de framework.
 *
 * O texto exige da I.A. o formato markdown estrito consumido pelo parser
 * (feature 3): cabeçalhos `## Questão N (tipo)`, alternativas `a)`–`e)`,
 * afirmações `N. ( )` e uma seção final `## Gabarito`.
 */
export function buildPromptProva(config: ConfigProva): string {
    const materia = config.materia ?? '—';
    const ano = config.ano ?? '—';
    const conteudo = config.conteudo?.trim() || '—';
    const quantidade = config.quantidade ?? '—';

    return `Você é um professor do ensino fundamental brasileiro. Elabore uma prova de ${materia} para o ${ano}º ano sobre os seguintes conteúdos: ${conteudo}, com ${quantidade} questões no total.

Regras do conteúdo:
- Misture livremente questões de múltipla escolha e de verdadeiro ou falso, na proporção que julgar melhor para o conteúdo.
- Questões de múltipla escolha têm de 4 a 5 alternativas.
- Use linguagem adequada à faixa etária.

Responda SOMENTE com o markdown da prova, exatamente neste formato, sem comentários antes ou depois:

- Cada questão começa com um cabeçalho: \`## Questão N (tipo)\`, onde \`tipo\` é \`múltipla escolha\` ou \`verdadeiro ou falso\`.
- Logo abaixo do cabeçalho vem o enunciado.
- Questões de múltipla escolha: uma alternativa por linha, de \`a)\` até \`e)\`.
- Questões de verdadeiro ou falso: uma afirmação por linha, no formato \`N. ( ) texto da afirmação\`.
- No enunciado use apenas **negrito** e *itálico*. Não use tabelas, listas, imagens, código ou títulos.
- Ao final, uma única seção \`## Gabarito\` com uma linha de resposta por questão, na mesma numeração. Para verdadeiro ou falso, use o formato \`N. 1-V, 2-F, ...\`.

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
2. 1-V, 2-F`;
}
