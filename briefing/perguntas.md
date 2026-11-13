# Perguntas do briefing

Este arquivo é lido pela skill `minha-marca`. Os textos entre aspas de citação (`>`) são ditos ao aluno **exatamente como estão**, trocando só o que estiver entre `{{ }}`.

## Na instalação: só 10 perguntas

Na instalação, faça só as perguntas que mudam o vídeo: **B1, B3, B4, B5, B7, B8, B9, B16, B18 e B19** (B8 e B9 só quando o pedido pede). Elas estão marcadas com "instalação" no título.

As outras **não são feitas na instalação**. No fim do briefing, antes do resumo, grave em silêncio o padrão de cada uma no `briefing.json` e acrescente o caminho do campo em `padroes_usados`. O aluno pode responder qualquer uma depois, dizendo por exemplo "quero pôr um número real" ou "muda minha música" (skill `minha-marca`, passo 7). Quando uma delas fizer diferença no primeiro roteiro (por exemplo, uma pauta que só funciona com um número real), a skill `criar-roteiro` usa a linha "Para ser verdade" do P-02, sem pergunta a mais.

| Pergunta | Campo | Padrão gravado em silêncio |
|---|---|---|
| B2 | `marca.arroba` | `""` |
| B6 | `oferta` | `""` |
| B10 | `provas[]` | `[]` |
| B11 | `tom` | `calmo` |
| B12 | `palavras_proibidas[]` | até 8 palavras de promessa exagerada comuns no nicho do aluno, escolhidas por você |
| B13 | `termos_obrigatorios[]` | `[]` |
| B14 | `cuidados_do_nicho[]` | `["resultado de cliente","preço","depoimento","prazo"]` |
| B15 | `marcas_proibidas[]` | `[]` |
| B17 | `marca.logo` | `null` |
| B20 | `gravacao.local` | `""` |
| B21 | `gravacao.microfone` | `nenhum` |
| B22 | `musica.preferencia` | `quando_combinar` |
| B23 | `duracao_alvo` | `medio` |
| B24 | `referencias[]` | `[]` |

**Gravar sem caixinha a cada resposta.** Na instalação, grave o `briefing.json` ao fim de cada parte (depois de B5, de B9, de B16 e de B19), não a cada resposta. Assim a pessoa vê no máximo 4 caixinhas de gravação, ou nenhuma se aprovou "allow all edits during this session". Se a conversa fechar no meio de uma parte, as respostas daquela parte são perguntadas de novo.

## Regras do questionário

1. **Uma pergunta por mensagem.** Nunca junte duas. Sempre com o exemplo que está no texto.
2. **Grave ao fim de cada parte.** Ao fim de cada parte, atualize `minha-marca/briefing.json` e o campo `atualizado_em` (data e hora ISO). Fora da instalação (quando o aluno muda uma resposta), grave logo depois da resposta. Assim o aluno pode parar e voltar depois perdendo no máximo uma parte.
3. **Quem entende a resposta é você.** O aluno pode responder com o número, com as palavras da opção ou com texto livre. Não compare com lista de palavras. Se não der para entender, pergunte de novo com outras palavras, uma vez.
4. **"Não sei" aplica o padrão.** Use o padrão da tabela, diga qual foi em uma frase ("Tudo bem, vou usar 'calmo e confiável'. Dá para mudar depois.") e acrescente o caminho do campo em `padroes_usados` (exemplo: `"tom"`).
5. **Campo obrigatório não aceita padrão.** Se o aluno disser "não sei" num campo obrigatório, ajude com até 3 sugestões tiradas do que ele já contou e peça para escolher uma.
6. **"Pode usar o padrão no resto".** A qualquer momento depois da B5, o aluno pode pedir isso. Aplique o padrão em todas as perguntas que faltam, menos as obrigatórias que ainda estiverem vazias, e registre cada uma em `padroes_usados`.
7. **Nunca invente prova.** Número em `provas[]` só com `origem`. Se o aluno der o número sem dizer de onde vem, pergunte: "De onde vem esse número? Só eu vou saber."
8. **Valores gravados no JSON** são sempre os códigos da coluna "Campo" (exemplo: `"comentar_palavra"`, `"calmo"`), nunca o texto da opção.
9. **No máximo 3 opções numeradas.** Escolha extra vai como frase ("ou me diga as suas cores").

## B-00

> Agora umas perguntas sobre o seu negócio. São 10 perguntas rápidas. Pode responder "não sei" em qualquer uma, que eu uso uma resposta comum e te aviso.

## Parte 1: o seu negócio

### B1 · instalação · campo `marca.nome` · obrigatório

> Como é o nome que aparece no seu perfil? Exemplo: "Ana Souza" ou "Clínica Sorriso".

### B2 · campo `marca.arroba` · padrão `""` · fora da instalação

> Qual é o seu @ no Instagram? Exemplo: "@anasouza.nutri". Se não quiser dizer, escreva "pular".

Grave com o @ na frente. "pular" grava `""`.

### B3 · instalação · campo `nicho.descricao` · obrigatório

> Com o que você trabalha? Diga do jeito que diria a um vizinho. Exemplo: "Sou nutricionista, atendo online."

### B4 · instalação · campo `publico.quem` · obrigatório

> Quem você quer que assista aos seus vídeos? Pense numa pessoa só. Exemplo: "Mulher de 30 a 45 anos que quer emagrecer sem dieta maluca."

### B5 · instalação · campo `publico.dores[]` · obrigatório, pelo menos 1

> O que mais incomoda essa pessoa? Use as palavras que ela usa. Pode dar até 3. Exemplo: "Começo a dieta na segunda e largo na quarta."

Grave cada dor como um texto da lista, nas palavras do aluno. Não corrija o jeito de falar: é o que vira gancho.

### B6 · campo `oferta` · padrão `""` · fora da instalação

> Você vende algum produto ou serviço que pode aparecer no vídeo? Exemplo: "minha consulta online".

Padrão `""`: os vídeos pedem relacionamento (comentar, salvar), sem vender.

## Parte 2: o que a pessoa faz depois

### B7 · instalação · campo `cta.tipo` · padrão `comentar_palavra`

> Depois de ver o vídeo, o que você quer que a pessoa faça?
> 1. Comentar uma palavra para receber algo ★
> 2. Chamar no Direct
> 3. Salvar o vídeo
>
> Ou me diga outra coisa, como seguir o seu perfil.

Códigos: 1 `comentar_palavra` · 2 `direct` · 3 `salvar` · "seguir o perfil" `seguir`.

### B8 · instalação · campo `cta.palavra` · padrão: você sugere 3

Só pergunte se `cta.tipo` for `comentar_palavra` ou `direct`.

> Qual palavra ela comenta? Uma só, fácil de digitar. Exemplo: "CARDÁPIO". Se não souber, eu sugiro 3.

Se o aluno disser que a palavra muda a cada vídeo, ou que ela "está no vídeo", grave `cta.por_video` = `true`, deixe `cta.palavra` e `cta.entrega` vazias, não pergunte o B9 e diga:
> Combinado: em cada vídeo eu pego a palavra e o presente do que você falar.

Se o aluno não souber, sugira 3 palavras ligadas à entrega, numeradas, a primeira com ★. Como a entrega (B9) vem depois, se ela ainda não existir, pergunte o B9 primeiro e volte ao B8. Grave em caixa alta, sem espaço. Palavra com acento é aceita, mas avise que sem acento é mais fácil de digitar e ofereça a versão sem acento.

### B9 · instalação · campo `cta.entrega` · obrigatório se `cta.tipo` = `comentar_palavra`

> O que a pessoa recebe quando faz isso? Exemplo: "Um cardápio de 7 dias em PDF."

Se a resposta for que muda a cada vídeo ou que "está no vídeo", siga como no B8: `cta.por_video` = `true`, entrega vazia, e a mesma frase de "Combinado".

### B10 · campo `provas[]` · padrão `[]` · fora da instalação

Duas mensagens, uma de cada vez. Primeiro o número:

> Você tem algum número real que prova o que você diz? Pode ser redondo. Exemplo: "Atendi mais de 200 pessoas" ou "7 de cada 10 voltam".

Se ele der um número, pergunte a origem na mensagem seguinte:

> De onde vem esse número? Só eu vou saber.

Cada prova vira `{"valor": "...", "origem": "..."}`. Padrão `[]`: os roteiros evitam número.

## Parte 3: cuidados

### B11 · campo `tom` · padrão `calmo` · fora da instalação

> Como você quer soar?
> 1. Calmo e confiável ★
> 2. Animado
> 3. Direto
>
> Ou me diga do seu jeito, por exemplo "divertido".

Códigos: 1 `calmo` · 2 `animado` · 3 `direto` · "divertido" `divertido`.

### B12 · campo `palavras_proibidas[]` · padrão: você sugere uma lista · fora da instalação

> Tem palavras que você nunca fala, ou que a sua profissão proíbe? Exemplo: "milagre, garantido, cura".

Se o aluno não souber, sugira até 8 palavras comuns de promessa exagerada no nicho dele (exemplo para saúde: "cura", "milagre", "garantido", "100%", "sem esforço") e peça para aprovar: "Posso usar esta lista? 1. Pode ★ 2. Quero tirar ou pôr alguma".

### B13 · campo `termos_obrigatorios[]` · padrão `[]` · fora da instalação

> Tem um jeito certo de chamar o seu trabalho? Exemplo: "Nunca só 'dieta'. Sempre 'plano alimentar'."

Cada item vira `{"evitar": "dieta", "usar": "plano alimentar"}`.

### B14 · campo `cuidados_do_nicho[]` · padrão `["resultado de cliente","preço","depoimento","prazo"]` · fora da instalação

> O que nunca pode ser inventado na sua área? Exemplo: "resultado de paciente, preço, prazo".

Mesmo que o aluno responda, mantenha os 4 itens do padrão e acrescente os dele.

### B15 · campo `marcas_proibidas[]` · padrão `[]` · fora da instalação

> Tem marca ou empresa que não pode aparecer nos seus vídeos? Exemplo: "o concorrente X".

A lista de apps famosos já vem no estúdio. Esta é só a do aluno.

## Parte 4: visual e gravação

### B16 · instalação · campo `rosto` · padrão `sim`

> Você aparece falando nos vídeos?
> 1. Sim ★ (é o rosto que vende)
> 2. Não

Códigos: 1 `sim` · 2 `nao`.

### B17 · campo `marca.logo` · padrão `null` · fora da instalação

Antes de perguntar, abra a pasta `minha-marca` com `./estudio abrir minha-marca`.

> Você tem logo? Ponha o arquivo do logo na pasta minha-marca (abri ela para você) e me escreva "pronto". Se não tiver, escreva "não tenho".

Com logo: siga o passo do logo na skill `minha-marca`. Sem logo: `null` (o nome entra em texto).

### B18 · instalação · campos `marca.cores`, `marca.paleta_escolhida` · padrão paleta 1

Antes de perguntar, rode `./estudio amostras --tipo paleta`.

Sem logo:

> Agora as cores. Fiz 3 jeitos com o seu nome e abri as imagens. Qual você prefere? 1 ★ · 2 · 3
>
> Ou me diga as suas cores (pode mandar o site, que eu tiro as cores).

Com logo (existe a imagem `paleta-0`), mostre só 3: a do logo e as duas primeiras:

> Agora as cores. Tirei as cores do seu logo (opção 0) e fiz mais 2 jeitos com o seu nome. Abri as imagens. Qual você prefere? 0 ★ · 1 · 2
>
> Ou me diga as suas cores.

Grave o número em `paleta_escolhida` e os 5 valores `#RRGGBB` em `marca.cores`. Se o aluno der cores próprias, monte as 5 (principal, destaque, papel, tinta, fundo) com contraste alto entre tinta e papel, mostre com `./estudio amostras --tipo paleta` de novo e grave `paleta_escolhida` = 0.

### B19 · instalação · campos `marca.fontes`, `marca.par_de_fontes_escolhido` · padrão par 1

Antes de perguntar, rode `./estudio amostras --tipo fonte`.

> Agora a letra. Abri 3 imagens com letras diferentes. Qual combina com você? 1 ★ · 2 · 3
>
> Ou me diga a letra da sua marca.

Grave o número e os nomes das famílias de título e de leitura. Se o aluno disser uma letra própria: `./estudio baixar-fonte --familia "<nome>"`, grave `par_de_fontes_escolhido` = `"proprio"` e use a família dele no título. Se a resposta for `FONTE_NAO_ACHADA`, diga o texto do código e volte para as 3 opções.

### B20 · campo `gravacao.local` · padrão `""` · fora da instalação

> Onde você vai gravar? Exemplo: "Na sala, perto da janela."

### B21 · campo `gravacao.microfone` · padrão `nenhum` · fora da instalação

> Você tem microfone?
> 1. De lapela (preso na roupa)
> 2. Fone de ouvido com fio
> 3. Nenhum

Códigos: 1 `lapela` · 2 `fone_com_fio` · 3 `nenhum`.

### B22 · campo `musica.preferencia` · padrão `quando_combinar` · fora da instalação

> Quer música de fundo nos vídeos?
> 1. Só quando combinar ★ (você escolhe ouvindo)
> 2. Sempre, baixinha
> 3. Nunca

Códigos: 1 `quando_combinar` · 2 `baixinha` · 3 `nunca`.

### B23 · campo `duracao_alvo` · padrão `medio` · fora da instalação

> Qual tamanho de vídeo você prefere?
> 1. Médio, de 30 a 45 segundos ★
> 2. Curto, até 30 segundos

Códigos: 1 `medio` · 2 `curto`.

### B24 · campo `referencias[]` · padrão `[]` · fora da instalação

> Tem 2 ou 3 vídeos que você acha bonitos, de qualquer área? Cole os links. Se não tiver, eu uso os exemplos da pasta 1-referencias.

Cada link vira `{"url": "...", "porque": "..."}`. Se o aluno não disser por que gosta, pergunte uma vez: "O que você mais gosta nesse vídeo?" Se ele não souber, grave `"porque": ""`.

## B-RESUMO

> Anotei assim:
> - Nome: {{marca.nome}}
> - Trabalho: {{nicho.descricao}}
> - Para quem: {{publico.quem}}
> - O que incomoda: {{dores[0]}}
> - Depois do vídeo: {{cta em palavras}}
> - Cores e letra: as que você escolheu
>
> Para o resto (jeito de falar, música, tamanho do vídeo), usei o comum. Dá para mudar quando quiser.
>
> Está certo?
> 1. Está certo ★
> 2. Quero mudar uma coisa

"Cta em palavras": exemplo "comentar CARDÁPIO para receber o cardápio de 7 dias". Os padrões vão em palavras simples ("jeito de falar", "música"), nunca com o nome do campo.

"Quero mudar uma coisa": pergunte o que mudar, refaça só aquela pergunta e mostre o resumo de novo.

Ao confirmar, rode `./estudio marca`. Se der `BRIEFING_INCOMPLETO`, faça só as perguntas dos campos em `dados.faltando[]`. Quando passar, diga:

> Guardei. Você pode mudar isso quando quiser. É só dizer, por exemplo, "muda minha cor".
