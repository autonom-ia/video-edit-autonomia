---
name: pesquisar-mercado
description: Descobre com o aluno com quem ele disputa atenção, lê o que esse mercado está anunciando na biblioteca de anúncios da Meta e postando nos perfis de referência, e traduz o que funciona para o nicho dele, em pautas prontas para a criação de roteiro. Use quando o aluno perguntar o que está funcionando no mercado dele, o que os concorrentes anunciam, o que está em alta, pedir pesquisa de mercado ou ideias a partir do que outros perfis fazem.
---

# Pesquisar o mercado

Você descobre com o aluno quem disputa a atenção do público dele, lê o que esse mercado faz e traduz para o nicho dele. O aluno responde 4 perguntas na primeira vez (R-01a a R-01d) e confirma a lista de referências (R-02). Todo o resto você faz em silêncio.

Comandos: no Mac e no Windows com Git Bash, `./estudio <comando>`. No PowerShell do Windows, `.\estudio.cmd <comando>`. Sempre de dentro da pasta do estúdio.

## Leia antes

- `guias/pesquisar-mercado.md`: o método inteiro.
- `guias/textos-do-estudio.md`: R-01a a R-04.
- `minha-marca/briefing.json`: nicho, público e dores, para não perguntar o que já está lá.
- `minha-marca/mercado.md`, se existir: as respostas e as rodadas anteriores.
- `minha-marca/aprendizados.md`, se existir: o que já foi testado. Achado já testado e que caiu em 2 vídeos não volta como novidade.

Se `minha-marca/briefing.json` faltar, rode a skill `minha-marca` primeiro.

## Passo a passo

### 1. Quem somos (só na primeira vez)
Se `minha-marca/mercado.md` não existir, ou existir com algum campo de "Quem somos" ou "Referências" ainda com `{{`:
1. Peça a confirmação do nicho que o briefing já diz (R-01a).
2. Faça R-01b, R-01c e R-01d, uma mensagem de cada vez, esperando a resposta: mercado amplo, referências e diferencial. Pergunte só o que ainda falta.
3. Com navegador, sugira perfis que caibam no mercado amplo e que você abriu e viu que existem. Sem navegador, não sugira: use só os que o aluno indicou. Peça a confirmação (R-02) e use só os confirmados.
4. Só agora grave `minha-marca/mercado.md` pelo molde `modelos/mercado.md`, com as respostas.

Se o arquivo já existir completo, não pergunte nada: siga para o passo 2.

### 2. Biblioteca de anúncios
1. Escolha de 3 a 6 buscas: palavras do mercado amplo e palavras do nicho.
2. **Com navegador na sessão:** abra `facebook.com/ads/library`, só anúncios ativos, país do aluno, e leia em ritmo normal.
3. **Sem navegador:** diga o R-03 com os links de busca já preenchidos e leia as fotos de tela que o aluno mandar. Sem print de anúncio, siga só com o orgânico e anote o limite. Sem print de anúncio e sem nada do orgânico (nem print nem o que o aluno contou), não grave rodada nem diga o R-04: diga em uma frase que sem os prints não dá para olhar o mercado e que é só mandar quando puder.
4. Anote o que o guia pede (seção 3). Separe grupo A, grupo B e teste.

### 3. Orgânico
Leia os Reels recentes de cada referência confirmada (seção 4 do guia). Sem navegador, use os prints que o aluno mandou no R-03 ou o que ele contar. Nunca use robô de coleta, nunca peça senha.

### 4. Contar e traduzir
1. Conte um voto por conta (seção 5 do guia). Marque "sem contraste" quando o grupo B tiver menos de 8 contas.
2. Separe o que dura do que está quente.
3. Escreva as traduções para o nicho (seção 6). Cada uma com premissa e prova de `provas[]`, ou "hipótese". A coluna "Usada em" começa vazia.
4. Atualize as micro-personas com o que apareceu nos comentários (seção 2). Só confirme com 3 ocorrências em 2 fontes.
5. Acrescente a rodada no fim de `minha-marca/mercado.md`. Nunca apague rodada antiga.

### 5. Contar ao aluno
Diga o R-04. Em até 5 frases, sem número técnico:
- o que está durando no mercado dele;
- o que está quente agora;
- as 2 ou 3 traduções mais fortes, cada uma virando uma ideia de vídeo.

Se ele aceitar, rode a skill `criar-roteiro`: as traduções entram nas pautas e o P-02 continua sendo a escolha dele.

## Regras

- Nunca copiar frase de anúncio, título, imagem ou nome de produto de outra pessoa no material do aluno.
- Nunca chamar repetição de anúncio de gasto: a biblioteca não mostra dinheiro.
- Nunca chamar frequência de prova: sem 8 contas no grupo B, é "sem contraste".
- Nunca inventar micro-persona, frase de cliente ou número.
- Nunca pedir senha, nunca entrar na conta do aluno, nunca coletar em volume.
- Nunca postar nem comentar em nome do aluno.

## Saídas

`minha-marca/mercado.md`.

## Onde você para e pergunta

R-01a a R-01d (só na primeira vez), R-02 (confirmar referências), R-03 (só sem navegador) e R-04 (no fim). Esta skill fica fora do orçamento de 5 decisões por vídeo.
