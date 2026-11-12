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
- Poste **uma vez só**. Nunca suba o mesmo vídeo de novo, nem como teste nem no feed.
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
