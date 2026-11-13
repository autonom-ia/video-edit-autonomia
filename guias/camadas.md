# O método das 5 camadas

> Adaptado de "bolo-de-camadas", sob a licença MIT.
> Copyright (c) 2026 Cauhi (cauhi.com). Texto integral da licença em `licencas/MIT-bolo-de-camadas.txt`.
> Mudanças: português do Brasil, motor HyperFrames, sobrescritas do estúdio marcadas com "Aqui no estúdio", e o guia de `cenas.json`.

Um Reel falado bem editado é um bolo de 5 camadas, uma em cima da outra. O aluno só grava a fala. O resto é com você: o molde do kit é o ponto de partida, e a tabela de cenas diz o que cada trecho pede. Quando a cena pede mais que o molde, desenhe a tela (`guias/tela-livre.md`).

1. **O take**: a fala gravada, cortada.
2. **A legenda**: palavra por palavra, no tempo da fala.
3. **O rosto**: o take, grande, que muda de formato quando o assunto muda.
4. **A tela**: em cima, algo que mostra o que está sendo falado, entrando na palavra.
5. **Zoom e som**: zoom no rosto na ênfase e um som em cada movimento.

## Camada 1: o take

- É a base. O corte é feito pelo kit (`./estudio cortar`) a partir do `trechos.json` que você escreve: melhor tomada de cada bloco, sem respiro maior que 0,4 s, sem muleta e sem silêncio no fim.
- A cor não é mexida, a não ser o ajuste automático de vídeo HDR do iPhone para cor normal.
- Aqui no estúdio: se a gravação estiver ruim de luz ou de som, isso é dito ao aluno como pedido de regravar o trecho (texto F-03), não escondido com filtro.

## Camada 2: a legenda

- 1 a 3 palavras por vez, até 22 caracteres, no tempo de cada palavra (transcrição com tempo por palavra).
- A palavra de ênfase troca de fonte: fonte de título, caixa alta, marca-texto na cor de destaque. No máximo uma por cena.
- Aqui no estúdio: a legenda nunca fica sobre a boca. Com o rosto cheio, fica no peito. Com faixa, acompanha a faixa e troca de cor. O kit faz isso sozinho a partir de `faixa` e `enfase`.

## Camada 3: o rosto

- Aqui no estúdio, a regra mais importante: **o rosto é grande ou não aparece.** Só dois formatos:
  - `cheio`: o rosto ocupa a tela toda;
  - `dividido`: a faixa cor de papel em cima e o rosto embaixo, de ponta a ponta, sem moldura.
- Bolha, janela, quadrado pequeno e cartão com borda **não existem** aqui. Eles reduzem quem vende a um enfeite.
- `nenhum`: só enquanto uma tela prova algo, por 1,5 a 4 s, e o rosto volta inteiro.
- Troque o formato quando o assunto muda, uns a cada 5 s, para não cansar.

## Camada 4: a tela

- Uma tela nova a cada 2 a 4 s, entrando na palavra que a nomeia (o kit adianta uns 4 quadros).
- **A tela mostra acontecendo o que a fala diz.** Fala "abro o Codex": aparece o Codex abrindo. Fala "aprova as caixinhas": aparece a caixinha. Na ordem de força: a gravação de tela do aluno (`midia`), a tela redesenhada a partir da referência real (`livre`), a tela do molde.
- Uma direção de arte só no vídeo inteiro: as cores e as letras da marca nos cartões e nos textos. A tela de um app real tem a cara do app.
- Tela do molde fica no ar até 4 s; tela livre e mídia, até 8 s, desde que nada fique parado mais de 2 s.
- Aqui no estúdio: **sem selo de "simulação"** e sem etiqueta de "fictício". O conteúdo dentro da tela é inventado por nós: nome comum, nada de cliente real, número só com prova.
- **App que o aluno usa de verdade e cita na fala aparece como é**, a partir da referência pesquisada: nome, logo, cores e desenho. Declare em `apps_reais`. App que ele não usa não entra só para enfeitar.
- Aqui no estúdio: número na tela só com prova, redondo, com a origem anotada no campo `origem`, que nunca aparece.

## Camada 5: zoom e som

- Zoom de abertura no começo, punch-in na palavra de ênfase, zoom lento em fala longa. Os valores estão no kit e em `guias/regras-de-producao.md` (regra 34).
- Um efeito em cada batida visual: whoosh na troca, pop no que chega, subida e impacto na revelação, teclado só enquanto um texto se digita (e só se a pessoa não estiver falando o texto).
- Aqui no estúdio: os 14 efeitos livres que vêm em `kit/sfx/` (CC0). Nunca som de marca.
- Aqui no estúdio: voz em cerca de −20 LUFS antes do ganho final; efeitos de 3 a 6 LU abaixo da voz; trilha 14 dB abaixo da voz; final em −14 LUFS, estéreo.

---

## Como a tabela de cenas vira `cenas.json`

Você escreve `projetos/<P>/cenas.json` e, ao lado, `cenas.md` (a mesma coisa em tabela legível, pelo molde `modelos/cenas.md`). O kit valida com `./estudio telas --projeto <P>`. A forma do arquivo é fixa (chave fora das listadas reprova); o desenho das telas, não: para isso existem `livre` e `midia`.

### O topo do arquivo

| Campo | O que é |
|---|---|
| `versao` | Sempre `1`. |
| `duracao_alvo_s` | Duração esperada em segundos (médio: 30 a 45; curto: até 30). |
| `direcao_de_arte` | Lista de trechos `{"de", "ate", "domina", "porque"}`: o que domina a tela em cada trecho e por quê. Escreva antes das cenas. |
| `legenda_rosto_y` | Opcional. Topo da legenda com o rosto cheio, de 250 a 1424 (padrão 1424). Olhe um quadro do take: abaixo da boca se couber; se o rosto estiver baixo e a boca passar de ~1350, acima da cabeça, sem cobrir o gancho, tela solta ou selo do pedido. Veja a regra 39 de `guias/regras-de-producao.md`. |
| `titulo_gancho` | `{"texto", "publico"}`: o gancho escrito do quadro 0 (até 10 palavras) e, se quiser, quem é o público (até 12 palavras ou `""`). Obrigatório. |
| `apps_reais` | Opcional. Lista `{"nome", "referencia", "porque", "citado_como"}` (o último, opcional: como o aluno chamou o app na fala) dos apps que o aluno usa de verdade e cita na fala. Libera o nome e as cores deles neste vídeo. Veja `guias/tela-livre.md`. |
| `serie` | Opcional. `{"titulo", "itens": [{"nome", "em"}]}`: série numerada ("5 erros", "3 passos"). Cabeçalho no alto com o número, o nome do item e uma barra em segmentos que enche a cada item; some quando entra uma tela e volta depois. De 2 a 20 itens, nome de até 3 palavras, `em` em ordem. Use quando a fala é uma lista de verdade: dá motivo para ficar até o fim. |
| `cenas` | A lista de cenas, em ordem. |
| `telas` | A lista de telas que aparecem por cima. |
| `cta` | `{"palavra", "em"}`: a palavra do pedido (uma só, sem espaço) e o segundo em que ela aparece. |

### Cada cena

| Campo | Valores |
|---|---|
| `id` | `c01`, `c02`... |
| `fala` | O texto falado naquela cena, igual ao que foi gravado. |
| `inicio`, `fim` | Segundos no take. A primeira cena começa em `0`. Cada cena começa onde a anterior terminou (buraco de no máximo 0,05 s). Antes de gravar, são estimativas; o `./estudio alinhar` acerta depois. |
| `rosto` | `cheio`, `dividido` ou `nenhum`. |
| `faixa` | `0`, `35`, `50` ou `100`. `100` só com tela e por até 3,5 s. |
| `zoom` | `abertura` (só na primeira cena), `punch` (na ênfase), `lento` (fala longa) ou `nenhum`. |
| `tela` | O `id` de uma tela da lista `telas`, ou `null`. |
| `enfase` | No máximo 1: `[{"palavra", "inicio"}]`. A palavra tem que estar na `fala`. O `inicio` é preenchido pelo `alinhar`. |
| `sons` | `[{"efeito", "em", "volume"}]`. `efeito` é um dos 14 nomes abaixo. `em` é o segundo em que o som bate. `volume` 1,4 nas viradas, 0,6 a 1,0 nos demais. Som da chegada de uma tela: ponha no `entra` dela (até 1 quadro depois); o estúdio leva para o quadro em que ela aparece (4 quadros antes). Som mais longe do `entra` fica onde você pôs. Whoosh, swish e zip demoram a crescer: o estúdio começa antes para o pico cair no `em`. |
| `virada` | `true` quando a cena muda o rumo da fala. Leva golpe de som. |
| `reconstrucao` | `true` quando a cena foi remontada a partir de outra tomada ou fora da ordem gravada. |
| `efeito` | Opcional. Efeito de cena do kit: `{"nome", "porque", ...campos}`. `./estudio efeitos` lista os nomes, o "quando usar" e os campos de cada um. Só com `faixa` 0, depois do gancho, sem repetir o da cena anterior, no máximo 1 a cada 5 s. Veja "Efeitos de cena" abaixo. |

Efeitos: `impacto-forte`, `impacto-medio`, `whoosh-rapido`, `whoosh-medio`, `swish`, `pop`, `zip`, `teclado`, `brilho`, `notificacao-saida`, `notificacao-sucesso`, `vibrar`, `subida`, `cintilar`.

### Cada tela

`{"id": "t01", "tipo": "...", "campos": {...}, "entra": 2.3, "sai": 5.8}`. `sai` menos `entra` é no máximo 4 s. O estúdio põe um som na chegada de cada tela, no quadro em que ela aparece; o QA reprova se nenhum som bater a até 2 quadros dele.

Palavras contadas por espaço:

| Tipo | Campos | Limites |
|---|---|---|
| `card` | `texto` | até 6 palavras |
| `frase` | `texto`, `apoio` (opcional) | até 8 · até 6 |
| `numero` | `numero`, `apoio`, `origem` | até 4 · até 6 · `origem` obrigatória, nunca exibida |
| `lista` | `titulo` (opcional), `itens` | título até 10 · de 2 a 4 itens de até 7 |
| `passos` | `itens`, `atual` | de 2 a 5 itens de até 7 · `atual` é o passo da vez, **contando do 0**: o primeiro passo é `0`, o segundo é `1` (tem barra de progresso que soma) |
| `conversa` | `nome`, `status` (opcional), `mensagens` | `nome` comum de até 3 palavras · `status` de até 3 palavras ("online", "digitando...") · de 1 a 5 mensagens `{"de": "outro" ou "eu", "texto"}` de até 35. É chat de celular; app de computador vai em `livre` |
| `prompt` | `prompt`, `resposta` | até 40 · até 25 (tela de IA genérica, sem marca) |
| `notificacao` | `app`, `texto` | `app` é "Mensagens", "E-mail" ou "Agenda" · até 35 |
| `cta` | `palavra`, `frase` | 1 palavra · até 8 |
| `checklist` | `titulo` (opcional), `itens` | título até 6 · de 2 a 20 itens de até 4 · contador grande que sobe a cada item marcado; acima de 8 itens, duas colunas. Bom no fim de uma série, para recapitular |
| `livre` | `arquivo`, `descricao`, `entrada` (opcional) | `arquivo` = `telas-livres/<id>.html` no projeto · `descricao` em uma frase · `entrada` = `padrao` ou `propria` · até 8 s no ar. Veja `guias/tela-livre.md` |
| `midia` | `arquivo`, `descricao`, `encaixe` (opcional) | `arquivo` = `midia/<nome>` preparado pelo `./estudio midia` · `encaixe` = `cobrir` ou `conter` · até 8 s no ar |

Nunca use a chave `etiqueta`. Ela existia para escrever "simulação" na tela e foi proibida.

### Como pensar a tabela (o que deu nota alta)

1. **0 a 3 s:** rosto cheio e gancho escrito, zoom de abertura, palavra-soco com `impacto-forte` antes de 2,5 s.
2. **Dor:** rosto cheio ou dividido com faixa 35 e um cartão curto. Nada parado mais de 2 s.
3. **Prova:** a faixa sobe para 50 ou 100 enquanto a tela mostra acontecendo (lista entrando, passos somando, conversa chegando). Rosto `nenhum` por no máximo 4 s, depois volta.
4. **Fala longa sem tela:** zoom `lento` e um som curto a cada linha nova.
5. **Pedido:** tela `cta` com a palavra, rosto dividido, e a última fala voltando ao gancho.
6. **Fio que soma:** quando der, um número ou uma lista que cresce ao longo do vídeo (passo 1 de 4, 2 de 4...). Dá motivo para ficar até o fim.
7. **Prova acontecendo:** cada tela ou ação citada na fala aparece. Gravação de tela do aluno, se houver; senão, a tela redesenhada da referência real, com movimento (digitação, clique, caixinha aprovada, resultado chegando).
8. **Repertório de movimento:** texto que se mexe, forma virando outra, câmera em movimento, 3D, rastro, desenho que se traça. Cada um com função. Lista e exemplos em `guias/tela-livre.md`.

### Efeitos de cena

Um efeito de cena muda o rosto inteiro por uma cena: capa de revista com o nome atrás da cabeça, fundo trocado (papel, estúdio, fundo verde), quebra do fundo, câmera "REC", gráfico subindo atrás da pessoa, manchetes voando, ícones em órbita, vidro líquido, zoom-relâmpago, mergulho no rosto que atravessa o corte. Os que encolhem o rosto (cartão inclinado, celular, conversa em vídeo, portal) existem, mas fogem do método: aviso `ROSTO_PEQUENO`, só se o aluno pedir.

1. **Escolha pelo sentido da fala, nunca por palavra.** Rode `./estudio efeitos` e leia a `funcao` de cada um. Pergunte: este trecho fica mais claro com este efeito? Se a resposta for "fica mais bonito", não use.
2. **Escreva o `porque`**: o trecho da fala que o efeito ajuda a entender, em 4 palavras ou mais. O revisor confere se o efeito serve à fala.
3. **Poucos.** No máximo 1 a cada 5 s, nunca o mesmo em seguida, nunca no gancho, nunca com tela por cima. Muitas vezes o melhor vídeo tem dois ou três.
4. **Recorte.** Efeito com `recorte: true` precisa da pessoa recortada do fundo. Rode `./estudio recortar --projeto <P>` depois de alinhar e antes de montar. Ele recorta só as cenas com esse efeito, leva alguns minutos (avise o aluno) e mede onde está a cabeça, para o efeito pôr o texto atrás dela. Mudou o tempo da cena ou o take: rode de novo (o `montar` reprova com `RECORTE_FALTANDO`). `--cenas c03,c05` recorta outras cenas para testar.
5. **Confira nos quadros** (passo 7 da skill `fazer-video`): o texto atrás da cabeça está atrás mesmo? O rosto ficou livre? A saída é limpa antes da próxima cena?
6. **Ao criar ou mudar um efeito**, estes limites do render do HyperFrames já custaram rodadas (testados na 0.9.20):
   - `backdrop-filter` não enxerga o vídeo: o vidro só vê o fundo vazio da página. Para entortar o take, use filtro SVG (`feDisplacementMap`) no próprio `#cam`, como o efeito `vidro`.
   - `clip-path` com canto arredondado no vídeo é ignorado. Para cartão de canto redondo, recorte uma `div` por fora do vídeo, ou use canto reto.
   - Borda e sombra num elemento do tamanho do quadro inteiro, dentro do `#cam`, não aparecem. Desenhe a moldura numa camada separada (`c.fundo` ou `c.frente`).
   - `inset(0 0 0 0)` é encurtado pelo navegador para `inset(0px)` e o tween de `clipPath` quebra. Escreva os quatro valores com unidade diferente de zero, ou anime de `inset(0.01px ...)`.
   - O render pula para cada quadro (`seek`), sem rodar callback: só `tl.set`, `tl.to`, `tl.fromTo`. Nada de `onUpdate`, `Math.random`, `Date` nem `repeat: -1`.
