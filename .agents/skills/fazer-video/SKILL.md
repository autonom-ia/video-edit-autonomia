---
name: fazer-video
description: Transforma o vídeo gravado pelo aluno num Reel pronto para postar - corta pausas e erros, escreve a legenda, desenha as telas, monta, faz a prévia, escolhe a música com o aluno, confere tudo, passa no avaliador e entrega na pasta 3-videos-prontos. Use quando o aluno disser "faz meu vídeo", "gravei", "pus o vídeo na pasta", "edita meu vídeo", e para retomar um projeto parado entre o recebimento e a entrega.
---

# Fazer o vídeo

O aluno gravou. Você faz o resto. Ele só decide: o plano das cenas (só no caminho B), a prévia e a música. Qual vídeo (F-01b, F-01d) e regravar um trecho (F-03) só aparecem quando o caso exige. Todo o resto você decide pelas regras, sem perguntar.

Comandos: no Mac e no Windows com Git Bash, `./estudio <comando>`. No PowerShell do Windows, `.\estudio.cmd <comando>`. Sempre de dentro da pasta do estúdio. Leia só a última linha (JSON) e traduza o `codigo` pelo `kit/mensagens.json`, seguindo a `acao`. Exit 2 = reprovado: corrija pela causa e rode de novo.

No Codex: siga a regra única do CLAUDE.md, seção 5. Em resumo, `musica` pede internet; `abrir`, `amostras`, `telas`, `quadros`, `montar`, `previa`, `render`, `variantes`, `entregar` e `pacote-revisor` pedem para sair da área protegida. Avise antes com a frase de lá.

## Leia antes

- `minha-marca/briefing.json`, `minha-marca/marca.json` e, se existir, `minha-marca/aprendizados.md`.
- `guias/regras-de-producao.md`, `guias/camadas.md`, `guias/textos-do-estudio.md` (F-00 a F-09), `guias/postagem.md`.

Sem `minha-marca/marca.json`: rode a skill `minha-marca` antes.

## Passo a passo

Mostre a linha de progresso do F-02 ao começar cada etapa (1 de 7 a 7 de 7). Sem pergunta.

### 1. Achar o projeto
- Projeto em andamento (`estado.etapa` entre `recebido` e `final`): continue de onde parou.
- Senão, o projeto mais recente com `etapa` = `gravacao` (caminho A).
- Se não houver: `./estudio novo-projeto --titulo "video-<AAAA-MM-DD>" --caminho B`.

### 2. Receber o vídeo
Rode `./estudio receber --projeto P`. Ele olha a pasta 2-videos-brutos e também os vídeos das últimas 24 horas na pasta Downloads (onde o AirDrop e o navegador salvam). No Mac, antes da primeira vez, avise: "O Mac pode perguntar se eu posso olhar a pasta Downloads. Pode permitir."
- Vídeo achado só em Downloads: diga o F-01d. "Sim": siga o que o resultado indica para trazer o arquivo (código e `acao` em `kit/mensagens.json`). "Não": siga como `SEM_VIDEO`.
- `SEM_VIDEO`: diga o F-01c e o F-00 no sentido do celular para o computador. Depois do "pronto", rode `receber` de novo.
- `dados.candidatos[]` com mais de um: abra as miniaturas de `projetos/P/bruto/candidatos/` e diga o F-01b. Depois rode `./estudio receber --projeto P --arquivo <nome escolhido>`.
- Um vídeo: diga o F-01 (duração do `bruto/origem.json`; tempo estimado: uns 15 minutos mais 1 minuto por minuto de vídeo).
- Avisos `VIDEO_DEITADO` e `VIDEO_LONGO`: diga o texto do código em palavras simples e siga a `acao`.

### 3. Escolher as falas (corte)
1. `./estudio transcrever --projeto P --fonte bruto`.
2. Leia `projetos/P/transcricao-bruta.json` e escreva `projetos/P/trechos.json`:
   - a melhor tomada de cada bloco (caminho A: compare com `roteiro.md`; prefira a mais firme e natural, não a mais longa);
   - sem respiro maior que 0,4 s dentro do trecho;
   - sem muleta ("é...", "tipo", "né" soltos, palavra repetida por gaguejo), sem falso começo, sem silêncio no fim;
   - começo e fim de trecho no meio do silêncio, nunca cortando sílaba;
   - caminho B: pode reordenar para o melhor gancho ficar no começo (marque `motivo`).
3. F-03 só se um trecho mudar o sentido, ferir a verdade (afirmação sem prova, `palavras_proibidas`, `cuidados_do_nicho`) ou se não houver nenhuma tomada usável do gancho. Escolha de tomada comum nunca vira pergunta.
4. `./estudio cortar --projeto P`. `TRECHOS_INVALIDOS`: corrija e rode de novo.
5. `./estudio transcrever --projeto P --fonte take`.

### 4. Conferir a legenda
1. Compare `transcricao-take.json` palavra por palavra com o roteiro (caminho A) e com o briefing: nome da marca, @, palavra do pedido, termos obrigatórios, números.
2. Escreva `projetos/P/correcoes.json` (`[]` se nada mudar). Corrija só o que o transcritor errou, nunca o jeito de falar do aluno.
3. `./estudio aplicar-correcoes --projeto P`. Correção que não casou vira aviso: confira o `inicio` e rode de novo.
4. `./estudio estado --projeto P --etapa alinhamento`.

### 5. Caminho B: roteiro, plano e GATE 1
Só quando o vídeo foi gravado sem roteiro nosso (`caminho` = `B`).
1. Escreva `projetos/P/roteiro.md` a partir da fala, pelo molde.
2. Confira a verdade: toda afirmação tem prova no briefing? Se houver afirmação sobre o público, rode a skill `avaliar`, tipo `premissa`. Se cair, F-03 para regravar o trecho, ou tire o trecho.
3. Escreva `cenas.json` (com os tempos do take) e `cenas.md`, pelo guia de `guias/camadas.md`.
4. `./estudio telas --projeto P` até passar. `./estudio amostras --tipo estilo --projeto P`. Depois `./estudio pagina-de-aprovacao --projeto P` (abre a página do vídeo no papel). Nunca abra `roteiro.md` nem `cenas.md` para o aluno.
5. F-04. Mudança pedida: aplique e mostre só o que mudou. "Trocar o estilo": `amostras` de novo.
6. `./estudio estado --projeto P --gate cenas=aprovado`.

### 6. Alinhar
`./estudio alinhar --projeto P`. Ele acerta os tempos das cenas e das ênfases pela fala real. Para cada aviso de cena sem casamento, ajuste a `fala` da cena em `cenas.json` ao que foi dito e rode de novo. Atualize `cenas.md` se mudou algo que o aluno viu.

### 7. Telas, montagem e conferência dos quadros
1. `./estudio telas --projeto P` (de novo, com os tempos reais).
2. `./estudio montar --projeto P`.
3. `./estudio quadros --projeto P --fonte comp --momentos cenas,transicoes`.
4. Olhe a folha de quadros e os quadros um por um, procurando:
   - sobras esmaecidas da tela anterior;
   - tela branca ou vazia;
   - texto fora da zona segura (a sobreposição marca);
   - legenda sobre a boca;
   - rosto pequeno, cortado ou emoldurado;
   - trecho parado mais de 2 s.
5. Achou: corrija em `cenas.json` (tempo, faixa, tela, zoom) e repita de 1 a 4. No máximo 3 vezes. Se sobrar defeito, ele vai para o avaliador.

### 8. GATE 2: a prévia
Antes da prévia, corrija em silêncio tudo o que já se sabe que mexe na imagem (defeitos do passo 7). Assim a prévia é mostrada uma vez.
1. `./estudio previa --projeto P`. Ele roda a checagem de marca antes. `MARCA_REPROVADA`: leia `projetos/P/checagem-marca.json`, corrija a causa (cor ou termo proibido) e rode de novo. `POUCO_ESPACO_RENDER`: rode `./estudio espaco` e siga a skill `consertar`.
2. Diga o F-05.
3. "Quero mudar uma coisa": aplique, volte ao passo 7 e mostre a nova prévia.
4. "Aprovar": `./estudio estado --projeto P --etapa trilha --gate previa=aprovado`. A partir daqui, **a imagem está congelada**. Se a imagem precisar mudar depois (avaliador, QA), junte todas as mudanças e mostre **uma única** nova prévia (F-05, com "É a última prévia"). Nunca reabra a prévia mais de uma vez depois da aprovação.

### 9. Render sem música
`./estudio render --projeto P`. Gera `sem-trilha.mp4`. `PREVIA_NAO_APROVADA`: volte ao passo 8.

### 10. A música (pula se `musica.preferencia` = `nunca`)
1. Monte a busca em inglês, de 2 a 4 palavras, coerente com o `tom`: `calmo` "calm ambient piano", `animado` "upbeat electronic groove", `divertido` "playful quirky", `direto` "minimal beat". Ajuste ao assunto.
2. `./estudio musica --projeto P --busca "<termos>" --quantas 3`. `LIMITE_OPENVERSE`: espere 1 minuto e tente uma vez; se falhar, siga sem música e avise o aluno em uma frase. `SEM_MUSICA_BOA`: troque os termos e tente de novo, até 2 vezes.
3. `./estudio variantes --projeto P`. Ele testa cada música no celular e copia só as aprovadas para `projetos/P/escolha-da-musica/musica-1..3.mp4`, abre essa pasta e grava `escolha-da-musica/escolhas.json` (`musica`, `opcao`, `esquema`, `descricao`). Nunca abra a pasta `trilha`.
4. Se sobrarem menos de 3: `./estudio musica --projeto P --busca "<outros termos>" --quantas 3 --acrescentar` (não apaga as boas) e `./estudio variantes --projeto P` de novo. No máximo 2 vezes. Com 1 ou 2, mostre as que houver.
5. Diga o F-06 com a `descricao` de cada uma, sem inventar como ela soa, e logo depois o F-00 no sentido do computador para o celular. Recomende (★) a primeira da lista, salvo se o título dela brigar com o `tom`.
6. Escolha "música N": pegue em `escolhas.json` a linha com `musica` = N e rode `./estudio mixar --projeto P --opcao <opcao> --esquema <esquema>`. "Sem música": `./estudio mixar --projeto P --sem-musica`.
7. Se `musica.preferencia` = `nunca`: `./estudio mixar --projeto P --sem-musica` direto, sem perguntar.

### 11. Conferência técnica
`./estudio qa --projeto P`. Item reprovado: leia `projetos/P/qa/relatorio.json`, corrija pela causa (som: mixar de novo; imagem: só com novo F-05) e rode de novo. Nunca entregue com QA reprovado.

### 12. O avaliador do vídeo
1. Rode a skill `avaliar`, tipo `video`, rodada 1.
2. Abaixo de 8,5 ou "parece cópia" = sim: confira cada problema, corrija e rode a rodada seguinte. Lembre: mexer só em som e texto não passa de uns 8. Para passar de 8,5, mexa na imagem (gancho, trecho parado, zoom). Junte todas as correções de imagem das rodadas e mostre uma única nova prévia (F-05) antes de entregar, não uma por rodada. Aprovada essa prévia, rode `render` e `mixar` de novo com a mesma música e o mesmo esquema já escolhidos, sem perguntar, e o `qa`.
3. No máximo 3 rodadas. Abaixo de 8,5 na terceira: F-07. "Regravar o trecho": diga o que falar, em uma frase, e volte ao passo 2 quando o vídeo novo chegar. "Trocar o assunto": rode a skill `criar-roteiro`. "Postar assim": siga.

### 13. Entrega
1. `./estudio creditar --projeto P`.
2. Escreva `projetos/P/postagem.txt` seguindo `guias/postagem.md` (com o crédito da música CC BY, se houver).
3. `./estudio contar-legenda --arquivo projetos/P/postagem.txt`. Corrija cada item de `problemas` e rode de novo.
4. `./estudio qa --projeto P --arquivo final.mp4`.
5. `./estudio entregar --projeto P`.
6. Diga o F-08, com o texto de `postagem.txt` inteiro na conversa, pronto para copiar. Logo depois, o F-00 no sentido do computador para o celular.

## O que você nunca pergunta

Formato, fps, codec, volume, filtros; tamanho, posição e animação de legenda, cartão, faixa e zoom; quais efeitos e onde; onde cortar e qual tomada (só se duas forem equivalentes e mudarem o sentido); nomes de arquivo e ferramentas; se roda conferência ou avaliador (roda sempre); correção óbvia de transcrição; "posso seguir?" depois de um gate aprovado.

## Pedidos pagos

Se o aluno pedir voz gerada, avatar, música paga ou qualquer serviço de nuvem: F-09. Voz sintética, rosto simulado e filtro de rosto o estúdio não faz.

## Saídas

`projetos/P/`: `bruto/`, `transcricao-bruta.json`, `trechos.json`, `take.mp4`, `voz.wav`, `transcricao-take.json`, `correcoes.json`, `transcricao.json`, `cenas.json`, `cenas.md`, `telas/`, `comp/`, `quadros/`, `checagem-marca.json`, `previa.mp4`, `sem-trilha.mp4`, `trilha/`, `final-mix.mp4`, `qa/`, `revisor/`, `revisao-video-N.md`, `final.mp4`, `postagem.txt`. Em `3-videos-prontos/`: o vídeo, a capa e a legenda.

## Onde você para e pergunta

F-04 (só caminho B), F-05, F-06. Quando o caso exige: F-01b, F-01d, F-01c, F-03, F-07, F-09. Nada mais.
