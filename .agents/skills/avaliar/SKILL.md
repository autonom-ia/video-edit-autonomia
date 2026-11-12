---
name: avaliar
description: Abre um avaliador independente, sem o histórico da conversa, para dar nota a um roteiro ou a um vídeo pela régua do estúdio (nota mínima 8,5, "parece cópia?" reprova), ou para tentar derrubar a premissa de uma pauta. Use quando outra skill pedir avaliação (tipos premissa, roteiro ou video) e quando o aluno pedir uma nota ou uma revisão, como "dá uma nota", "revisa meu vídeo" ou "está bom?".
---

# Avaliar

Quem fez não dá nota. Esta skill abre um avaliador novo, que não viu nada desta conversa, passa só o pacote e o brief, e traz o resultado de volta. Ela nunca pergunta nada ao aluno: quem pergunta é a skill que chamou.

Comandos: no Mac e no Windows com Git Bash, `./estudio <comando>`. No PowerShell do Windows, `.\estudio.cmd <comando>`. Sempre de dentro da pasta do estúdio. Leia só a última linha (JSON) e traduza o `codigo` pelo `kit/mensagens.json`.

## Leia antes

`guias/regua-do-revisor.md`: a régua, os pesos, as 3 perguntas fixas e os 3 modelos de brief.

## Tipos

| Tipo | Quando | Brief | Dá nota? |
|---|---|---|---|
| `premissa` | Antes de mostrar pautas; quando o roteiro do caminho B afirma algo sobre o público | `derrubador-de-premissa` | Não. Só "De pé", "De pé com ajuste" ou "Cai" |
| `roteiro` | Depois de escrever o roteiro, antes do GATE 1 | `revisor-roteiro` | Sim, régua de roteiro |
| `video` | Depois do QA aprovado, antes da entrega | `revisor-video` | Sim, régua de vídeo |

## Passo a passo

### 1. Montar o pacote
Rode `./estudio pacote-revisor --projeto P --tipo <tipo> --rodada N`. Ele cria `projetos/P/revisor/<tipo>-rodada-N/` com o roteiro, a legenda (se houver), o resumo do briefing, a direção de arte, as regras e a régua. No tipo `video`, também as folhas de quadros, a transcrição e a folha de som. Ele nunca põe vídeo de referência.

`N` é o número de pastas `projetos/P/revisor/<tipo>-rodada-*` que já existem, mais 1. Depois de montar, registre com `./estudio estado --projeto P --nota "avaliacao <tipo> rodada N"`.

No tipo `premissa`, depois de montar o pacote, escreva nele o arquivo `pautas.md` com cada pauta e a premissa dela, sem o seu veredito e sem dizer qual você prefere (o pacote ainda não traz as pautas).

Comparação A e B (duas versões ou duas ideias): ponha as duas no pacote como `A` e `B`, em ordem sorteada, sem dizer qual é a nova.

### 2. Abrir o avaliador
- **Claude Code:** use a ferramenta de subagente (Agent ou Task). Passe só o brief do tipo, copiado de `guias/regua-do-revisor.md`, com o caminho completo da pasta do pacote.
- **Codex:** use subagente, se existir. Se não existir, rode um processo novo, só leitura, dentro da pasta do pacote: `codex exec --sandbox read-only --cd "<pasta do pacote>" "<brief>"`. Avise o aluno antes, em uma frase: "Vou chamar um avaliador separado para conferir. O Codex vai pedir licença. Pode aprovar."

### 3. O que nunca entra no brief
- A nota esperada ou a meta ("tem que passar de 8,5").
- Qual versão é a nova ou qual você prefere.
- "Justifique por que não deu mais."
- O problema que você acha que existe.
- Vídeo ou link de referência.
- Qualquer parte desta conversa.

### 4. Receber o resultado
O avaliador devolve: nota ponderada, notas por critério, problemas do mais grave ao menos grave (com o segundo ou o trecho e a correção) e as respostas às 3 perguntas fixas. No tipo `premissa`, o veredito de cada pauta.

Se faltar alguma parte, peça só aquela parte ao mesmo avaliador.

### 5. Conferir antes de aplicar
Avaliador também erra fato. Para cada correção:
- confira contra o briefing, as provas, a transcrição e os quadros;
- se o avaliador citou lei, número ou regra de fora, não aplique sem conferir; se não der para conferir, não aplique e anote;
- aplique só o que conferiu.

### 6. Gravar
Escreva `projetos/P/revisao-<tipo>-N.md` pelo molde `modelos/revisao.md`, com o que foi conferido e o que foi aplicado. Nos tipos `roteiro` e `video`, grave também a nota: `./estudio estado --projeto P --tipo <roteiro|video> --nota-revisor <nota> --parece-copia <sim|nao>`. O `entregar` lê essa nota.

### 7. Devolver para a skill que chamou
Uma linha: passou ou não, a nota, e os 2 maiores problemas.

## Regras

- A nota de quem fez não conta. A sua nota não existe aqui.
- Passa com **8,5 ou mais** e "parece cópia?" = não.
- "Parece cópia?" = sim reprova, com qualquer nota.
- Diferença de até 0,1 entre rodadas é ruído.
- Mexer só em som e texto costuma parar em 8. Para passar de 8,5, a correção precisa mexer na imagem: gancho, trechos parados, zoom.
- O derrubador não dá nota. Ele só tenta derrubar a premissa com dado.
- Cada rodada usa um avaliador **novo**. Nunca reaproveite o da rodada anterior.
- No máximo 3 rodadas por tipo. Quem decide o que fazer depois é a skill que chamou.

## Quando o aluno pede uma nota

"Dá uma nota", "revisa meu vídeo": descubra o projeto (o mais recente), escolha o tipo pelo estado (roteiro, se ainda não há vídeo; vídeo, se há `final-mix.mp4` ou `final.mp4`), rode a avaliação e conte ao aluno em até 3 frases: a nota, o que está melhor e o maior problema, com o segundo. Pergunte se ele quer que você corrija:
> Quer que eu corrija isso?
> 1. Sim, corrige ★
> 2. Não, deixa assim

Corrigir algo na imagem de um vídeo com prévia aprovada exige mostrar a prévia de novo (F-05).

## Saídas

`projetos/P/revisor/<tipo>-rodada-N/` e `projetos/P/revisao-<tipo>-N.md`.

## Onde você para e pergunta

Nunca, quando chamada por outra skill. Só a pergunta acima quando o próprio aluno pediu a nota.
