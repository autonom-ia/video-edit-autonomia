# Tela livre, gravação de tela e app real

Os 9 tipos de tela do molde (`card`, `frase`, `numero`, `lista`, `passos`, `conversa`, `prompt`, `notificacao`, `cta`) são o ponto de partida. Quando a cena pede mais, você desenha a tela do jeito que ela merece. O estúdio confere o resultado, não a forma.

**A pergunta de cada cena é: o que mostra isso acontecendo?** Se a fala diz "abro o Codex", a tela mostra o Codex abrindo. Se diz "aprova as caixinhas", mostra a caixinha sendo aprovada. Prova só na fala derruba a nota do avaliador.

## Por ordem de força

1. **Gravação de tela real** do aluno fazendo a coisa. É a prova mais forte. Tipo `midia`.
2. **Tela livre redesenhada a partir da referência real** do app: o print público, a página oficial ou a própria gravação do aluno. Tipo `livre`.
3. **Tela do molde**, quando um cartão, uma lista ou uma conversa bastam.

Use quantas telas livres a cena pedir, no vídeo inteiro se precisar. O limite é o avaliador (8,5) e a verdade, não o número de telas.

## Pesquisar a referência antes de desenhar

Quando a fala cita um app, um site ou uma ação na tela:
- procure como ele é de verdade: site oficial, documentação, print público, vídeo do próprio fabricante, ou a gravação do aluno;
- anote em `apps_reais` do `cenas.json` de onde veio (`referencia`);
- redesenhe com fidelidade: a disposição, as cores, a letra parecida, os rótulos, o jeito de mexer. Uma tela genérica no lugar de um app que o aluno usa de verdade parece falsa;
- o conteúdo dentro da tela continua inventado por nós e verdadeiro no sentido: nada de cliente real, número sem prova, resultado ou depoimento.

## App real (`apps_reais`)

App que o aluno **usa de verdade e cita na fala** aparece como é: nome, logo, cores, desenho. Declare no topo do `cenas.json`:

```json
"apps_reais": [
  { "nome": "Codex", "referencia": "https://openai.com/codex e a gravação de tela do aluno", "porque": "o aluno usa o Codex e cita na fala" }
]
```

- A checagem de marca libera o nome e as cores daquele app (e do grupo dele: Codex libera OpenAI e ChatGPT) só neste vídeo.
- As `marcas_proibidas` do próprio aluno continuam valendo, mesmo que o app esteja na lista.
- Logo real só do site oficial ou da Wikimedia, salvo em `projetos/<P>/midia/`.
- Continua proibido: imitar a marca ou o visual de outro criador, e usar app que o aluno não usa só para enfeitar.
- O app precisa aparecer na fala. Se o aluno chamou de outro jeito ("o chat", "a IA"), ponha as palavras dele em `citado_como`. Sem isso, o `telas` reprova.

## Gravação de tela (`midia`)

O aluno pode ter gravado a tela do computador ou do celular fazendo o que fala. Pergunte uma vez (F-01e). Com o arquivo em mãos:

```
./estudio midia --projeto P --arquivo "<caminho do arquivo>" --nome codex-instalando --de 1196 --ate 1400 --velocidade 40 --corte 0,0,1600,1000
```

- `--de` e `--ate`: o trecho, em segundos do arquivo original.
- `--velocidade`: acelera (timelapse). 1 é normal; até 120.
- `--corte x,y,largura,altura`: recorta um pedaço da tela, em pixels do original. Use para dar zoom no que importa (a caixa de texto, o botão).
- Imagem (print, logo, foto): `./estudio midia --projeto P --arquivo print.png --nome print-site`. Ela é só copiada.

O comando grava `midia/<nome>.mp4` (sem som) e um quadro `midia/<nome>.jpg`. Na tabela:

```json
{ "id": "t05", "tipo": "midia", "campos": { "arquivo": "midia/codex-instalando.mp4", "descricao": "Gravação real do Codex instalando, acelerada", "encaixe": "conter" }, "entra": 10.65, "sai": 13.9 }
```

- A mídia ocupa a faixa de ponta a ponta (a tela toda na faixa 0 e 100) e faz uma aproximação lenta sozinha.
- `encaixe`: `cobrir` enche o espaço e corta as bordas; `conter` mostra tudo.
- Até 8 s no ar.
- **Confira cada quadro da gravação antes de usar**: senha, chave, e-mail, nome de cliente, caminho de pasta com nome da pessoa, notificação pessoal. Corte o trecho ou recorte com `--corte`. Nada disso pode ir ao ar.

## Tela livre (`livre`)

Um arquivo HTML em `projetos/<P>/telas-livres/<id>.html`, com três partes: o estilo, o desenho e a animação.

```html
<style>
#tela-t02 .janela { position: absolute; left: 70px; top: 280px; width: 940px; height: 600px; border-radius: 28px; background: #1d1d1f; }
#tela-t02 .frase { font: 500 38px/1.3 var(--fonte-leitura); color: #fff; }
</style>
<div class="janela"><span class="frase">instale o estúdio com este link</span></div>
<script>
window.__telaLivre = window.__telaLivre || {};
window.__telaLivre['t02'] = function (tl, ctx) {
  var letras = SplitText.create(ctx.sel + ' .frase', { type: 'chars' });
  tl.fromTo(ctx.sel + ' .janela', { rotationX: 28, y: 120, opacity: 0 }, { rotationX: 0, y: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, ctx.entrada);
  tl.set(letras.chars, { opacity: 0 }, 0);
  tl.to(letras.chars, { opacity: 1, duration: 0.01, stagger: 0.035 }, ctx.entrada + 0.45);
};
</script>
```

Na tabela:

```json
{ "id": "t02", "tipo": "livre", "campos": { "arquivo": "telas-livres/t02.html", "descricao": "A janela do Codex chega e a frase é digitada", "entrada": "propria" }, "entra": 5.71, "sai": 7.69 }
```

**O que você recebe:**
- o quadro inteiro, 1080 x 1920. Posicione tudo com `position: absolute`;
- as cores e as letras da marca como variáveis: `var(--principal)`, `var(--destaque)`, `var(--papel)`, `var(--tinta)`, `var(--fundo)`, `var(--fonte-titulo)`, `var(--fonte-leitura)`, `var(--peso-titulo)`;
- o GSAP inteiro, com os plugins `SplitText`, `MorphSVGPlugin`, `DrawSVGPlugin`, `MotionPathPlugin`, `Flip`, `CustomEase`, `CustomBounce`, `CustomWiggle`, `TextPlugin`, `ScrambleTextPlugin`, `EasePack`, `Physics2DPlugin` e `PhysicsPropsPlugin`. Basta citar o nome no arquivo, e o `montar` traz o plugin;
- 3D de CSS (`perspective`, `rotationX`, `rotationY`), SVG, gradientes, máscaras, filtros;
- imagens e vídeos da pasta `midia` do projeto, pelo endereço `assets/midia/<nome>`.

**A função de animação** recebe a linha do tempo do vídeo (`tl`) e `ctx` com `sel` (o seletor da tela), `el`, `entrada` (quando a tela começa a entrar), `entra`, `sai` e `duracao`. Ponha cada movimento em `tl`, no tempo absoluto (`ctx.entrada + 0.4`).

**`entrada`:**
- `padrao`: o estúdio faz a chegada (de 94%, com leve desfoque) e a saída. Você anima o que acontece dentro.
- `propria`: a sua animação faz a chegada e a saída. Termine a saída até `ctx.sai + 0.35`.

**O que o estúdio confere (e reprova):**
- arquivo dentro da pasta do projeto;
- CSS começando sempre por `#tela-<id>`, para não vazar para o resto do vídeo;
- nada que mude a cada montagem: `Math.random`, `Date`, `setTimeout`, `setInterval`, `requestAnimationFrame`, repetição infinita (`repeat: -1`);
- nada da internet na hora de montar (`http://`, `https://`, `fetch`). Baixe antes, ponha em `midia`;
- sem `data-start` dentro da tela (o tempo vem de `entra` e `sai`);
- até 8 s no ar;
- `descricao`: uma frase sobre o que a tela mostra. Vai para o avaliador.

**O que você confere olhando os quadros** (o `telas` fotografa no meio da animação, e o `quadros` mostra o vídeo):
- texto importante dentro da zona segura (y de 250 a 1500, 60 px da borda esquerda, 230 da direita);
- letra legível no celular: título a partir de uns 60 px, texto a partir de uns 34 px;
- contraste: texto claro sobre fundo escuro ou o contrário, nunca meio-termo;
- nada parado mais de 2 s;
- legenda e rosto livres. A legenda fica por cima da tela: deixe espaço onde ela passa (na tela cheia, de y 1424 a 1500; veja `guias/regras-de-producao.md`, regra 39);
- som em cada movimento: o estúdio põe um som na entrada da tela. Para cada batida dentro dela (clique, digitação, notificação), ponha um efeito em `sons` da cena.

## Repertório (do método bolo de camadas, do Cauhi)

Cada efeito precisa de uma função. Use os que a cena pede:

- **Texto que se mexe:** letras ou palavras entram uma a uma, com ~0,1 s entre elas, com peso e direção. A palavra de ênfase ganha cor ou escala (`SplitText`).
- **Forma virando outra:** em vez de um cartão novo surgir do nada, a forma que está na tela vira a próxima. Círculo vira estrela, barra vira curva, etiqueta vira quadro (`MorphSVGPlugin`, `Flip`).
- **Câmera em movimento:** aproximação lenta, panorâmica entre elementos, leve balanço contínuo para nada ficar parado.
- **3D:** cartão que gira no eixo, camadas em perspectiva, uma janela que se levanta (`rotationX`, `rotationY`, `perspective`).
- **Chegadas suaves:** rápido no início e assentando devagar, em 0,5 a 0,7 s, saindo de leve desfoque e de 94% do tamanho. Mola exagerada só se o nicho pedir energia.
- **Rastro:** o que viaja pela tela deixa um rastro curto; marca clara sobre fundo escuro pode ter brilho leve (`MotionPathPlugin`).
- **Desenho que se traça:** linha, seta ou gráfico que se desenha na palavra (`DrawSVGPlugin`).
- **Digitação real:** texto que se digita na caixa do app, com som de teclado só durante a digitação e só se a pessoa não estiver falando o texto.

## Princípios de movimento (a régua para conferir)

A primeira lista vem dos 12 princípios de animação da Disney (livro *The Illusion of Life*, 1981), adaptados para vídeo; o último item dela vem da prática de edição. A segunda vem de leis de usabilidade. Nada aqui passa por cima das regras de `guias/regras-de-producao.md`. São para conferir a tela nos quadros, não uma lista para encher a tela de efeito.

- **Antecipação:** antes de um movimento grande, um recuo curto (~0,1 s) para o lado oposto. O cartão desce 8 px antes de subir.
- **Peso no impacto:** o que cai ou bate amassa uns 5% e volta. Só em forma (botão, selo, bola); nunca em texto nem no rosto.
- **Uma coisa por vez:** só um elemento faz o movimento principal de cada vez (entrar, sair, crescer ou atravessar a tela). Um título com letras entrando uma a uma conta como um elemento. O resto segue com movimento leve (deslizar até 10 px, brilho, escala até 1,02) e nunca fica parado mais de 2 s (regra 33). O olho segue o que se mexe.
- **Continua depois de parar:** o que vem junto (sombra, etiqueta, ícone) chega 0,05 a 0,1 s depois do principal (`stagger`).
- **Acelera e desacelera:** nunca velocidade constante (`ease: 'none'`), a não ser em contador ou rolagem mecânica.
- **Arcos:** o que viaja longe faz curva, não linha reta (`MotionPathPlugin`).
- **Ação secundária:** um detalhe pequeno reforça a ação principal (o check pisca quando a linha é riscada).
- **Tempo:** coisa pequena de interface (botão, ícone, check) em 0,2 a 0,35 s; cartão e tela inteira em 0,5 a 0,7 s. Mais de 1 s só em revelação de propósito.
- **Exagero com sentido:** só no momento-chave (a palavra de ênfase, o erro na tela), uma vez por cena. Exagero é de movimento (velocidade, recuo, amassado), não de tamanho: o zoom continua no máximo 1,1x com cartão na tela (regra 34).
- **Volume:** uma rotação leve (`rotationY` de 8 a 15 graus) dá profundidade a cartão e aparelho.
- **Quanto mais repete, menos anima:** o terceiro cartão do mesmo tipo entra mais simples que o primeiro. O que aparece o tempo todo (legenda, série) não pula.

Quando a tela imita um app:

- **Alvo grande:** botão e campo com pelo menos 120 px de altura no quadro de 1080 px de largura (os 44 pt mínimos de toque da Apple, num celular de 390 pt de largura) e texto de 34 px ou mais. No celular de quem assiste, botão pequeno não se lê.
- **Poucas opções:** em menu, abas ou botões de app, até 4 opções por vez. Vem da lei de Hick (mais opções, decisão mais lenta) somada ao limite de uns 4 blocos do item abaixo; é escolha do estúdio, não número da lei. Mais que isso, divida em duas telas ou agrupe. Não vale para as telas prontas do kit (`passos` de 2 a 5, `checklist` e `serie`), que têm limite próprio.
- **Blocos de até 4:** a memória curta segura uns 4 blocos (os "7" de Miller, de 1956, são estimativa antiga). Número longo aparece separado: `11 9876-5432`, nunca `11987654321`.
- **Resposta em até 0,4 s:** depois de um clique mostrado na tela, algo reage em até 0,4 s. Clique sem resposta parece app travado.
- **Parecido com o que a pessoa conhece:** padrões de app comum, sem inventar interface. Vale junto com a seção "App real" acima.

Estilos por nicho, com imagens e movimentos de cada profissão: `guias/nichos/`. As cores e as letras continuam as da marca do aluno; o nicho dá o repertório.
