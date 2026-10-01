---
titulo: Provario
data: 2026-09-30
status: aprovado
origem: brainstorming
---

# Roadmap: Provario

## Visão geral
Uma professora de Ciências do Ensino Fundamental II da rede pública de Santos gasta muito tempo montando provas objetivas manualmente. O Provario é uma aplicação web estática, publicada no GitHub Pages, que usa IA para gerar as questões e o gabarito a partir de parâmetros definidos pela professora, aplica um modelo com o cabeçalho institucional e entrega a prova pronta para imprimir ou salvar em PDF. A usuária principal (e única, no MVP) é essa professora.

## Decisões
- **Usuária única, sem login.** O app atende só a professora. Se outros professores quiserem usar, cada um configura o seu próprio navegador.
- **Sem backend.** O GitHub Pages hospeda só arquivos estáticos, e toda a lógica roda no navegador.
- **IA: Google Gemini, com a chave da própria professora.** A chave é colada numa tela de configurações e salva só no navegador. O plano gratuito do Gemini deixa o custo em zero e dispensa um servidor para esconder a chave.
- **Vários perfis institucionais.** É comum professor da rede pública dar aula em mais de uma escola, então ela escolhe o perfil a cada prova.
- **Campos do perfil:** nome do perfil, nome da escola, secretaria/rede, logo (upload de imagem), nome da professora e ano/período letivo.
- **Parâmetros da prova:** perfil, disciplina (padrão Ciências, editável), ano/série (6º ao 9º) e turma(s), conteúdo (texto livre), quantidade de questões (1 a 20), alternativas por questão (4 ou 5), dificuldade (fácil, média, difícil ou mista), título da prova e observações extras para a IA (opcional).
- **Cabeçalho impresso:** logo, escola, professora e disciplina, seguidos das linhas Aluno, Nº, Turma, Data e Nota.
- **Revisão antes de imprimir.** Ela pode editar enunciados e alternativas, trocar o gabarito, excluir questões e regerar uma questão individualmente, porque a IA erra e a professora sempre revisa.
- **Persistência local.** Os perfis e o histórico de provas ficam salvos no navegador, com exportação e importação de backup em arquivo, já que limpar o navegador apaga os dados.
- **Gabarito em página separada,** depois da prova, para que a prova saia limpa para os alunos.
- **Questões só com texto no MVP.** A IA não gera diagramas científicos confiáveis.
- **Stack:** Vite + React + TypeScript + Tailwind CSS, com deploy no GitHub Pages via GitHub Actions.

## Premissas
- O PDF é gerado pela impressão do navegador ("Salvar como PDF"), com CSS próprio para impressão e sem biblioteca de PDF.
- A IA devolve JSON num formato fixo, e o app valida a resposta antes de exibir.
- A interface é toda em português, pensada para computador, mas funcional no celular.
- A tela de configurações traz um passo a passo curto de como criar a chave no Google AI Studio.
- A logo é guardada como imagem embutida (base64) no próprio perfil.

## Fora do escopo
- Imagens nas questões
- Versões A/B embaralhadas
- Folha de respostas para o aluno
- Alinhamento com habilidades da BNCC ou do Currículo Paulista
- Outros provedores de IA
- Sincronização em nuvem ou login
- Questões discursivas

## Fases

### Visão geral das fases
| Fase | Nome | Entrega principal | Depende de |
|---|---|---|---|
| 1 | Fundação, deploy e conexão com o Gemini | Site no ar no GitHub Pages, com tela de configurações que salva a chave e testa a conexão | — |
| 2 | Perfis institucionais | Cadastro, edição e exclusão de vários perfis, com upload de logo | 1 |
| 3 | Geração da prova | Formulário de parâmetros, chamada ao Gemini, validação do JSON e a prova gerada salva e exibida | 1, 2 |
| 4 | Pré-visualização e impressão | Layout da prova com cabeçalho e gabarito em página separada, pronto para imprimir ou salvar em PDF | 3 |
| 5 | Revisão e edição de questões | Edição de questões, troca de gabarito, exclusão e regeração de uma questão isolada | 3, 4 |
| 6 | Histórico e backup | Lista de provas salvas, com reabrir, reimprimir, duplicar e excluir, e exportação/importação de backup | 3 |

## Fase 1 — Fundação, deploy e conexão com o Gemini
**Status:** concluída
**Objetivo:** Colocar o projeto no ar no GitHub Pages e validar cedo a chamada ao Gemini direto do navegador, que é o maior risco técnico.
**Entregas:**
- Projeto com Vite, React, TypeScript e Tailwind CSS configurado
- Roteamento compatível com o GitHub Pages (hash routing) e layout base com navegação em pt-BR
- Camada de armazenamento local reutilizável pelas fases seguintes
- Workflow do GitHub Actions publicando o site no GitHub Pages
- Tela de configurações para colar e salvar a chave do Gemini, com passo a passo de como criá-la no Google AI Studio
- Botão "Testar conexão", que faz uma chamada simples ao Gemini e mostra sucesso ou erro
**Depende de:** nenhuma
**Critérios de conclusão:**
- O site abre pela URL do GitHub Pages
- A chave salva continua lá depois de recarregar a página
- "Testar conexão" retorna sucesso com uma chave válida e mostra uma mensagem clara com uma chave inválida

## Fase 2 — Perfis institucionais
**Status:** concluída
**Objetivo:** Permitir que a professora cadastre e mantenha os perfis das escolas onde dá aula.
**Entregas:**
- Lista de perfis com criar, editar e excluir
- Formulário com nome do perfil, escola, secretaria/rede, logo, professora e ano/período letivo
- Upload da logo com pré-visualização, guardada como imagem embutida no perfil
- Persistência dos perfis no navegador
**Depende de:** Fase 1
**Critérios de conclusão:**
- É possível cadastrar mais de um perfil, e todos continuam salvos depois de recarregar a página
- A logo aparece na pré-visualização do perfil
- A exclusão pede confirmação

## Fase 3 — Geração da prova
**Status:** pendente
**Objetivo:** Gerar as questões e o gabarito com o Gemini a partir dos parâmetros da professora.
**Entregas:**
- Formulário de parâmetros: perfil, disciplina (padrão Ciências), ano/série (6º ao 9º) e turma(s), conteúdo, quantidade de questões (1 a 20), alternativas (4 ou 5), dificuldade, título e observações extras
- Prompt com as instruções pedagógicas e o formato JSON esperado
- Chamada ao Gemini com saída estruturada e validação da resposta
- Estados de carregamento e de erro (chave ausente ou inválida, limite do plano gratuito, resposta fora do formato)
- Prova gerada salva no navegador assim que chega, com questões, alternativas e gabarito exibidos numa visualização simples
**Depende de:** Fases 1 e 2
**Critérios de conclusão:**
- Uma prova com os parâmetros escolhidos é gerada com o número correto de questões e alternativas, e todas têm resposta no gabarito
- Uma resposta inválida da IA gera uma mensagem de erro clara, sem quebrar a tela
- A prova gerada continua disponível depois de recarregar a página
**Pendências:** qual modelo do Gemini usar e o texto final do prompt

## Fase 4 — Pré-visualização e impressão
**Status:** pendente
**Objetivo:** Transformar a prova gerada num documento pronto para imprimir ou salvar em PDF.
**Entregas:**
- Pré-visualização em formato de folha, com o cabeçalho institucional (logo, escola, professora, disciplina, e as linhas Aluno, Nº, Turma, Data e Nota) e o título
- Questões numeradas, com alternativas identificadas por letras
- Gabarito numa página separada no fim
- CSS de impressão com o variante `print:` do Tailwind: esconde a interface e controla as quebras de página, sem cortar questões no meio
- Botão "Imprimir / Salvar PDF" usando a impressão do navegador
**Depende de:** Fase 3
**Critérios de conclusão:**
- O PDF salvo pelo navegador mostra só a prova, sem botões ou menus
- O gabarito começa numa página nova
- Nenhuma questão fica dividida entre duas páginas, salvo quando não couber numa página inteira
**Pendências:** visual final do cabeçalho, que pode seguir um modelo de prova que a professora já usa

## Fase 5 — Revisão e edição de questões
**Status:** pendente
**Objetivo:** Permitir que a professora corrija e ajuste a prova gerada antes de imprimir.
**Entregas:**
- Edição do enunciado e das alternativas de cada questão
- Troca da alternativa correta no gabarito
- Exclusão de questão, com renumeração automática
- Botão "Regerar questão", que pede ao Gemini uma nova questão sobre o mesmo conteúdo, sem repetir as existentes
- Alterações salvas na prova e refletidas na pré-visualização e na impressão
**Depende de:** Fases 3 e 4
**Critérios de conclusão:**
- As edições continuam salvas depois de recarregar a página e aparecem no PDF
- Regerar uma questão troca só aquela questão e atualiza o gabarito
- Excluir uma questão renumera as demais e o gabarito

## Fase 6 — Histórico e backup
**Status:** pendente
**Objetivo:** Deixar a professora reaproveitar provas antigas e proteger os dados contra perda.
**Entregas:**
- Tela de histórico com as provas salvas (título, conteúdo, série, perfil e data)
- Ações para reabrir (editar e reimprimir), duplicar e excluir, com confirmação na exclusão
- Estado vazio amigável quando ainda não houver provas
- Exportar backup: um arquivo JSON com perfis e provas
- Importar backup, com validação do arquivo e aviso antes de substituir ou mesclar os dados
**Depende de:** Fase 3
**Critérios de conclusão:**
- Uma prova antiga pode ser reaberta, editada e reimpressa
- Duplicar gera uma cópia independente
- Exportar, limpar os dados do navegador e importar restaura perfis e provas por completo

## Evolução futura
- Upload manual de imagem por questão
- Versões A/B com questões embaralhadas e gabaritos próprios
- Folha de respostas para o aluno
- Alinhamento com habilidades da BNCC ou do Currículo Paulista
- Suporte a outros provedores de IA (Claude, OpenAI)
- Sincronização em nuvem entre computadores
- Questões discursivas
