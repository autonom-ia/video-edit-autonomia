---
name: minha-marca
description: Faz o briefing do negócio do aluno, uma pergunta por vez, e grava as respostas, as cores, as letras e o logo da marca. Use logo depois da instalação, quando o aluno quiser mudar algo da marca (por exemplo "muda minha cor", "mudar o meu público", "mudar o briefing"), e antes de qualquer vídeo quando o briefing faltar ou estiver incompleto.
---

# Minha marca

Tudo o que o estúdio faz depende destas respostas: o gancho sai das dores do público, o pedido sai do CTA, as cores e as letras vão em todos os cartões. O aluno pode parar e voltar a qualquer momento: você grava ao fim de cada parte.

Dois modos:
- **Instalação** (chamada pela skill `instalar-estudio`, ou briefing que ainda não existe): só as 10 perguntas da instalação (B1, B3, B4, B5, B7, B8, B9, B16, B18, B19). As outras ficam com o padrão, gravado em silêncio e registrado em `padroes_usados` (tabela no começo de `briefing/perguntas.md`).
- **Mudar** (o aluno pede para mudar algo, por exemplo "muda minha cor" ou "quero pôr um número real"): refaz só aquela pergunta, qualquer uma de B1 a B24.

Comandos: no Mac e no Windows com Git Bash, `./estudio <comando>`. No PowerShell do Windows, `.\estudio.cmd <comando>`. Sempre de dentro da pasta do estúdio. Leia só a última linha (JSON) e traduza o `codigo` pelo `kit/mensagens.json`. No Codex, `amostras` e `abrir` pedem para sair da área protegida e `baixar-fonte` pede internet (CLAUDE.md, seção 5).

## Leia antes

- `briefing/perguntas.md`: os textos exatos (B-00 a B24 e B-RESUMO), os campos, os padrões e as regras do questionário.
- `briefing/briefing-em-branco.json`: o formato do arquivo.

## Passo a passo

### 1. Preparar o arquivo
- Se `minha-marca/briefing.json` não existir, copie o conteúdo de `briefing/briefing-em-branco.json` para ele.
- Se já existir, leia. Se estiver pela metade, continue da primeira pergunta sem resposta, dizendo: "Vamos continuar de onde paramos."

### 2. As perguntas de texto (B-00, B1, B3, B4, B5, B7, B8, B9, B16)
- Diga o B-00 (só se for o começo).
- Uma pergunta por mensagem, exatamente como em `perguntas.md`.
- Grave o `briefing.json` (e `atualizado_em`) ao fim de cada parte: depois de B5, de B9 e de B16. No modo mudar, grave logo depois da resposta.
- "Não sei": aplique o padrão, avise qual foi e registre em `padroes_usados`.
- Entre uma parte e outra (nunca no meio), a skill `instalar-estudio` pode ler o andamento dos ouvidos nos arquivos de estado. Não rode nenhum comando de andamento aqui.

### 3. O logo (B17, só no modo mudar)
1. Abra a pasta com `./estudio abrir minha-marca` e diga o B17.
2. Depois do "pronto", procure em `minha-marca/` um arquivo de imagem novo (PNG, JPG, SVG ou WEBP) que não seja `logo.*` nem esteja em `escolhas/`. Se houver mais de um, pergunte qual é, com até 3 opções.
3. Renomeie ou copie para `minha-marca/logo.<extensão original>` com a ferramenta de arquivo (fica dentro de `minha-marca/`, sem caixinha extra). Grave `marca.logo` = `"minha-marca/logo.<ext>"`.
4. Rode `./estudio cores-do-logo --arquivo minha-marca/logo.<ext>`. As cores viram a paleta 0, oferecida primeiro no B18.

Se o arquivo não abrir ou não for imagem, diga: "Não consegui abrir esse arquivo. Pode pôr o logo em PNG ou JPG na pasta minha-marca? Ou escreva 'não tenho'."

### 4. As cores (B18)
1. Rode `./estudio amostras --tipo paleta`. Ele gera e abre as imagens (`minha-marca/escolhas/paleta-*.png`).
2. Diga o B18 (a versão com logo, se existir a paleta 0: aí são só 0, 1 e 2).
3. Guarde (e grave junto com o B19, numa gravação só) `marca.paleta_escolhida` e os 5 valores de `marca.cores` (`principal`, `destaque`, `papel`, `tinta`, `fundo`), copiados da paleta escolhida em `kit/marca/paletas.json` ou, na paleta 0, das cores que o `cores-do-logo` devolveu.
4. Se o aluno der as cores dele (ou um site, ou o logo): monte as 5 cores com tinta escura sobre papel claro (contraste alto), mostre de novo com `./estudio amostras --tipo paleta` e confirme.

### 5. As letras (B19)
1. Rode `./estudio amostras --tipo fonte`.
2. Diga o B19.
3. Grave `marca.par_de_fontes_escolhido` e os nomes das famílias em `marca.fontes.titulo` e `marca.fontes.leitura`, copiados de `kit/marca/pares-de-fonte.json`.
4. Se o aluno disser uma letra própria: `./estudio baixar-fonte --familia "<nome>"`. Deu certo: `par_de_fontes_escolhido` = `"proprio"`, `fontes.titulo` = a família dele, `fontes.leitura` = a do par 1. `FONTE_NAO_ACHADA`: diga o texto do código e volte às 3 opções.

### 6. Padrões e resumo
1. Modo instalação: grave em silêncio, no `briefing.json`, o padrão de cada pergunta que não foi feita (tabela no começo de `perguntas.md`) e registre cada uma em `padroes_usados`. Nada de B20 a B24 na instalação.
2. Diga o B-RESUMO.
3. "Quero mudar uma coisa": refaça só aquela pergunta e mostre o resumo de novo.
4. "Está certo": rode `./estudio marca`.
   - `ok:true`: diga "Guardei. Você pode mudar isso quando quiser. É só dizer, por exemplo, "muda minha cor"."
   - `BRIEFING_INCOMPLETO`: faça só as perguntas dos campos em `dados.faltando[]` e rode de novo.
   - `NUMERO_SEM_ORIGEM`: pergunte "De onde vem esse número? Só eu vou saber." e rode de novo.

### 7. Mudar uma parte depois ("muda minha cor")
- Entenda o que o aluno quer mudar e ache a pergunta B correspondente em `perguntas.md`.
- Refaça só aquela pergunta (com as amostras, se for cor ou letra).
- Grave, rode `./estudio marca` e diga: "Mudei. Os próximos vídeos já saem assim."
- Vídeo com prévia já aprovada não muda sozinho: avise que a mudança vale a partir do próximo vídeo.

## Proibido

- Inventar prova, número ou resultado.
- Aceitar item de `provas[]` sem `origem`. Se faltar, pergunte: "De onde vem esse número? Só eu vou saber."
- Julgar a resposta do aluno por lista de palavras. Quem entende é você.
- Fazer duas perguntas na mesma mensagem.
- Corrigir o jeito de falar do aluno nas dores (B5): as palavras dele viram gancho.
- Mostrar o JSON, o nome de um campo ou um comando ao aluno.

## Saídas

- `minha-marca/briefing.json` (você escreve).
- `minha-marca/marca.json` (o kit gera com `./estudio marca`).
- `minha-marca/logo.*`, `minha-marca/fontes/`, `minha-marca/escolhas/`.

## Onde você para e pergunta

Na instalação, as 10 perguntas e o resumo. No modo mudar, só a pergunta que o aluno quis mudar. Nada mais.
