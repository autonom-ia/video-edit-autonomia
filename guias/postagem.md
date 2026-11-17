# Postagem e medição

> Partes adaptadas de "instagram-agent-skill" (ig-caption), de Jake Schincariol, sob a licença MIT.
> Copyright (c) 2026 Jake Schincariol. Texto integral em `licencas/MIT-instagram-agent-skill.txt`.
> Mudanças: português do Brasil, regras do estúdio, sem o script do original.

Este guia é lido na hora de escrever `projetos/<P>/postagem.txt` e na hora de medir o resultado. O estúdio nunca posta: quem posta é o aluno.

## A legenda do post (`postagem.txt`)

O Reel já traz o gancho dele, falado e escrito. A legenda não é um segundo gancho. O trabalho dela é: o pedido, o contexto que dá sentido ao pedido e as palavras que as pessoas buscam.

### Formato

```
Linha 1     O pedido, de forma simples, ou a frase que resume o que o vídeo entrega.
            Até 125 caracteres (é o que aparece antes do "mais").
            Nunca começa com saudação, hashtag ou emoji.

Corpo       De 2 a 4 parágrafos curtos, com uma linha em branco entre eles.
            Aqui entram as palavras de busca, em frases normais.

O pedido    Um só. O mesmo do vídeo: comentar a palavra, chamar no Direct, salvar ou seguir.

Hashtags    De 0 a 5, numa linha só, no fim. Específicas do assunto.

Crédito     Se houver música CC BY, a linha de crédito que o kit gerou.
```

### Regras

1. **Linha 1 com até 125 caracteres.** O `./estudio contar-legenda` mede.
2. **Um pedido só, igual ao do vídeo.** Se o pedido é comentar, a palavra aparece escrita igual, em caixa alta. O kit confere se a palavra está lá.
3. **Sem link.** Link na legenda não é clicável. Se houver site, a legenda diz "link na bio". O kit reprova link.
4. **Até 5 hashtags, específicas.** O Instagram limitou a 5 por post. `#viral`, `#fyp` e `#explorepage` não descrevem nada: nunca.
5. **Palavras de busca em frase normal.** A busca do Instagram lê o texto da legenda. Escreva o assunto do jeito que alguém digitaria ("cardápio para emagrecer"), numa frase que soa natural.
6. **A legenda não promete mais que o vídeo.** Se o vídeo mostra uma demonstração, a legenda não diz "meus clientes".
7. **Emoji como pontuação, não enfeite.** No máximo 1 ou 2.
8. **Sem número inventado.** Número só de `provas[]`, redondo, sem citar a fonte.
9. **Passe por `guias/naturalidade.md`** antes de contar.
10. **Crédito da música** (CC BY): a linha vem pronta em `projetos/<P>/trilha/opcao-N.json` (campo do texto de crédito). Cole no fim da legenda. CC0 não precisa, mas pode.

### Exemplo de forma (não copie o texto)

```
Comenta CARDÁPIO que eu te mando o cardápio de 7 dias no Direct.

Começar a dieta na segunda e largar na quarta é mais comum do que parece. O problema quase nunca é força de vontade.

Neste cardápio, cada dia tem um prato que fica pronto em 15 minutos.

Comenta CARDÁPIO.

#nutricao #cardapiosemanal #emagrecercomsaude
```

## Levar o vídeo para o celular

O vídeo pronto vai para o celular sem perder qualidade pelo caminho do texto F-00 (`guias/textos-do-estudio.md`): AirDrop entre iPhone e Mac; Google Drive nos outros casos. Nunca pelo WhatsApp normal nem por e-mail. O texto da legenda é mostrado também na conversa, pronto para copiar.

Outra opção: o instagram.com, no navegador do computador, também aceita subir Reel. Avise que algumas opções, como o Reel de teste, podem não aparecer lá.

## Reel de teste

O Instagram tem a opção de publicar como **Reel de teste**: o vídeo aparece primeiro para quem não segue o perfil.

- Use quando o vídeo for de um formato novo ou houver dúvida.
- Poste **uma vez só**. Nunca suba o mesmo vídeo de novo, nem como teste nem no feed. As 3 versões de um teste (seção "Teste com 3 versões") não são o mesmo vídeo: cada uma tem abertura própria.
- Se for bem em 3 dias (72 horas), toque em **"Compartilhar com todos"** no próprio Reel de teste.
- Se a conta estiver em dia e o vídeo ficar com 0 visualizações nas primeiras horas, é atraso do Instagram. Espere 24 horas antes de concluir qualquer coisa.

## O que medir (3 dias depois)

No Instagram: tocar no Reel, depois em "Ver insights".

| Número | O que diz |
|---|---|
| Visualizações | Quantas vezes o vídeo começou a tocar. Compare com a mediana dos vídeos do próprio perfil, nunca com perfis grandes. |
| Retenção nos 3 primeiros segundos | Se o gancho segurou. Abaixo da média do perfil: o problema está no começo. |
| Tempo médio assistido | Se o meio segurou. Compare com a duração do vídeo. |
| Salvamentos | Se o conteúdo é útil o bastante para voltar depois. |
| Compartilhamentos | Se alguém achou que outra pessoa precisava ver. |
| Comentários com a palavra | Se o pedido funcionou. |
| Novos seguidores vindos do Reel | Se o perfil convenceu. |

## Como tirar uma regra

- Uma regra nova sai de **um número comparado com a mediana do próprio perfil**, nunca de um vídeo isolado.
- Escreva a regra com a origem: "Gancho com pergunta segurou mais nos 3 primeiros segundos (vídeo de 12/11, retenção acima da média)."
- No máximo 2 regras por medição.
- Uma regra que se repete em 3 medições vira certeza. Uma que contradiz a anterior: anote as duas e espere a próxima.
- Nunca recomende repostar.

## Ler pelos portões

Um número sozinho não diz o que mudar. Leia em ordem e pare no primeiro portão que quebrou: ele aponta o pedaço do vídeo a consertar.

| Portão | Número | Pergunta | Se quebrou, o pedaço é |
|---|---|---|---|
| 1. Interromper | retenção nos 3 primeiros segundos | o começo fez a pessoa parar? | o gancho falado, o escrito e o visual do quadro 0 |
| 2. Sustentar | quanto do vídeo a pessoa viu: tempo médio assistido dividido pela duração, em % | o vídeo segurou? | o meio do vídeo, **ou um gancho que atraiu o público errado** |
| 3. Pedir | comentários com a palavra, por mil visualizações | o pedido funcionou? | o pedido: a palavra, o que a pessoa recebe, onde aparece |
| 4. Fechar | mensagens ou vendas que vieram do vídeo, se o aluno souber | quem pediu foi até o fim? | a entrega no Direct, a oferta |

**A regra mais útil:** se a retenção nos 3 s ficou acima da mediana e a % do vídeo vista ficou abaixo, o gancho parou gente que não é do público. A correção é no gancho (filtro de público), não no meio do vídeo.

Cada portão é comparado com a **mediana do próprio aluno**, nunca com perfis grandes. Sem mediana (primeiros vídeos), diga qual portão parece fraco e marque "a confirmar".

## Veredito da hipótese

O roteiro de cada vídeo traz código, variável e hipótese (`guias/ganchos.md`, "Código e hipótese"). Na medição, feche com um veredito:

| Variável | Portão que decide |
|---|---|
| gancho | 1 (e confira o público errado) |
| formato | 2 |
| pedido | 3 |
| assunto | 1 e 2: validada só com os dois acima; caiu com qualquer um abaixo |

- **validada:** o portão da variável ficou acima da mediana;
- **caiu:** ficou abaixo. Num vídeo só, a combinação fica "a reconfirmar"; só sai do jogo depois de cair em 2 vídeos;
- **inconclusiva:** faltou número ou ainda não há mediana (primeiros vídeos).

Poucas visualizações costumam ser efeito de um começo fraco, porque o Instagram para de mostrar o vídeo. Por isso, vídeo com menos da metade das visualizações da mediana e portão 1 abaixo da mediana fica "caiu (a reconfirmar)", não inconclusivo. Com poucas visualizações e portão 1 acima, aí sim é inconclusivo.

Ficar acima da mediana acontece em cerca de metade dos vídeos, por isso um vídeo só nunca vira regra. A hipótese validada em 2 vídeos vira regra do perfil. Com 3 vídeos, vira base fixa.

## Banco de peças e a regra 70/30

Toda medição acrescenta uma linha ao "Banco de peças" de `minha-marca/aprendizados.md`: código, tipo (base ou teste), variável, hipótese, portão que quebrou e veredito. Uma combinação que caiu em 2 vídeos não volta como novidade.

Uma linha validada é um vídeo só. O que vale como base é o que está em "Regras que valem para este perfil" (confirmado em 2 vídeos). Quando houver **2 regras ou mais** ali, a criação de roteiro segue a regra 70/30:
- **7 de cada 10 vídeos** (base) usam só essas regras (formato, tipo de gancho, pedido);
- **3 de cada 10** testam uma variável nova sobre essa base.

Antes disso, todo vídeo é exploração.

## Teste com 3 versões

Quando o aluno sobe 3 versões como Reel de teste (`guias/ganchos.md`, "Teste com 3 versões"):

1. Meça cada versão 72 horas depois da **própria** postagem.
2. Versão com menos da metade das visualizações da mediana do perfil não entra. Com menos de 2 versões válidas, o teste é inconclusivo. Sem mediana (primeiros vídeos), o resultado é uma pista fraca: diga isso ao aluno.
3. Tire da disputa a versão que caiu na regra do público errado (3 s mais alto que as outras e % do vídeo vista mais baixa).
4. Entre as que sobraram, vence a maior % do vídeo vista (portão 2). Diferença relativa menor que 10% é empate. Exemplo: 50% contra 46% é empate.
5. No empate, desempatam os comentários com a palavra por mil visualizações e depois as mensagens.
6. Com essas visualizações, o resultado é uma pista, não uma prova. A vencedora pode ir para o feed. O aprendizado vale para a abertura inteira, não para uma parte dela.
