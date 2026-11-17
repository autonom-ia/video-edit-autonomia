---
name: postar-e-medir
description: Lê os números de um Reel já postado (do jeito que o aluno mandar, inclusive foto da tela), acha pelos portões o pedaço do vídeo que falhou, fecha a hipótese do roteiro, compara com os vídeos anteriores dele e tira 1 ou 2 regras para o próximo vídeo. Também decide o vencedor de um teste com 3 versões. Use quando o aluno disser "como foi meu vídeo", colar números, mandar print dos insights do Instagram ou perguntar o que aprendeu.
---

# Postar e medir

Três dias depois de postar, o aluno volta e conta como foi. Você lê os números, compara com o histórico dele e guarda o que aprender. Nunca posta nada e nunca entra na conta dele.

Comandos: no Mac e no Windows com Git Bash, `./estudio <comando>`. No PowerShell do Windows, `.\estudio.cmd <comando>`. Sempre de dentro da pasta do estúdio. Leia só a última linha (JSON) e traduza o `codigo` pelo `kit/mensagens.json`.

## Leia antes

- `guias/postagem.md` (o que cada número diz, os portões, o veredito, o banco de peças e o teste com 3 versões).
- `guias/textos-do-estudio.md` (M-01 e M-02).
- `minha-marca/aprendizados.md`, se existir.
- As medições anteriores: `projetos/*/medicao.md`.
- O `roteiro.md` do projeto: código, variável e hipótese.

## Passo a passo

### 1. Achar o vídeo
O projeto mais recente com `estado.etapa` = `postagem`. Se houver mais de um sem medição, pergunte qual, mostrando a capa de cada um (`./estudio abrir 3-videos-prontos/<nome>-capa.jpg`):
> Qual vídeo você quer medir?
> 1. {{título do mais novo}} ★
> 2. {{título do outro}}

### 2. Pedir os números
Se o aluno ainda não mandou, diga o M-01. O jeito padrão é ele escrever os 5 números; a foto da tela é alternativa. Se ele já colou números ou mandou foto, pule direto para ler.

Se o vídeo foi postado há menos de 24 horas e está com 0 visualizações: diga que é atraso comum do Instagram e peça para voltar em 1 dia. Não tire regra.

### 3. Ler
- Leia os números do texto ou da imagem, do jeito que estão. Não invente o que faltar: escreva "não informado".
- `./estudio estado --projeto P --etapa medicao`.
- Grave `projetos/P/medicao.md` pelo molde `modelos/medicao.md`.

### 4. Comparar pelos portões
- Compare cada número com a **mediana** das medições anteriores do aluno (`projetos/*/medicao.md`). Nunca com perfis grandes.
- Leia os 4 portões em ordem e pare no primeiro que quebrou (`guias/postagem.md`, "Ler pelos portões"). Ele aponta o pedaço do vídeo a consertar.
- O portão 2 usa a % do vídeo vista (tempo médio dividido pela duração), nunca os segundos soltos.
- Confira a regra do público errado: 3 s acima da mediana e % do vídeo vista abaixo quer dizer que o gancho parou gente de fora do público. A correção é no gancho, não no meio.
- Primeiro vídeo: não há mediana. Diga qual portão parece fraco, marque "a confirmar" e diga que a comparação de verdade começa no terceiro vídeo.
- Ligue cada diferença a algo do vídeo: a fórmula do gancho (em `roteiro.md`), o visual do quadro 0, a duração, a música, o tipo de pedido.

### 5. Fechar a hipótese e tirar regras
- Feche a hipótese do `roteiro.md` com um veredito: validada, caiu (a reconfirmar) ou inconclusiva, pelo portão da variável (`guias/postagem.md`, "Veredito da hipótese"). Roteiro antigo sem hipótese: escreva "sem hipótese" e siga.
- No máximo 2 regras, cada uma com a origem (o número comparado com a mediana).
- Regra que já está em `aprendizados.md`: marque como confirmada. Regra que contradiz uma anterior: anote as duas e espere a próxima medição.
- Se `minha-marca/aprendizados.md` não existir, crie a partir de `modelos/aprendizados.md`.
- Acrescente uma linha no "Banco de peças" e uma entrada no "Histórico", e atualize "Regras que valem para este perfil" (só as confirmadas em 2 vídeos ou mais). Nunca apague entrada antiga.
- `aprendizados.md` antigo sem "Banco de peças": crie a seção pelo molde antes de escrever.

### Teste com 3 versões
Se o aluno contar que subiu 3 versões do vídeo como Reel de teste (ele monta as versões 2 e 3 por conta; o estúdio monta uma por projeto):
1. Diga o M-01b no lugar do M-01.
2. Siga "Teste com 3 versões" de `guias/postagem.md`, passo a passo.
3. Preencha a seção "Teste com 3 versões" de `projetos/P/medicao.md` (molde `modelos/medicao.md`). O veredito e a linha do banco de peças falam da abertura inteira. Só os números da vencedora entram na mediana dos próximos vídeos; teste inconclusivo não entra.
4. Diga o M-02b no lugar do M-02.

### 6. Contar ao aluno
Diga o M-02, em linguagem simples, sem número técnico além dos que ele mandou.

Rode `./estudio estado --projeto P --etapa concluido`.

## Regras

- 0 visualizações nas primeiras horas, com a conta em dia, é atraso: orientar a esperar 24 horas.
- Nunca recomendar repostar o mesmo vídeo. As versões de um teste com 3 versões não contam como repostagem: cada uma tem abertura própria.
- Nunca pedir senha nem entrar na conta do Instagram.
- Nunca concluir nada de um vídeo só. Uma regra vira certeza em 3 medições.
- Nunca inventar número que o aluno não mandou.

## Saídas

`projetos/P/medicao.md` e `minha-marca/aprendizados.md`.

## Onde você para e pergunta

M-01 ou M-01b (e a escolha do vídeo, se houver mais de um sem medição).
