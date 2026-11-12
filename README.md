# Estúdio de Reels

> **Assistente de IA (Claude ou Codex):** se você acabou de baixar esta pasta para instalar o estúdio, leia o arquivo `AGENTS.md` inteiro e siga a seção 2, começando pela skill `instalar-estudio`. Fale com a pessoa em português simples, um passo por vez, e peça licença antes de instalar cada programa.

Um estúdio para fazer Reels falados com ajuda do Claude Code ou do Codex, no Mac ou no Windows.

Você grava o vídeo no celular. O assistente monta o roteiro com você, corta as pausas, escreve a legenda, desenha as telas, escolhe a música com você e entrega o vídeo pronto para postar. Ele para e pergunta só nas decisões que são suas.

Tudo roda no seu computador. O seu vídeo não sobe para lugar nenhum. Nada pago é usado sem você pedir.

## Antes de começar

Você precisa de:

- **Claude Code** ou **Codex** instalado e com login feito (ensinado na aula).
- Mac com macOS 13.5 ou mais novo, ou Windows 10 (versão 22H2) ou Windows 11. Em computador Windows com chip ARM, só Windows 11.
- 8 GB de memória (recomendado).
- 12 GB livres no disco.
- Internet durante a instalação.

Funciona melhor em Mac com chip Apple ou Windows x64. Em Mac Intel e Windows 11 ARM tudo funciona, menos a conferência automática da música.

## Instalar (um texto só)

**No app do Codex** (Mac ou Windows):

1. Abra o app do Codex.
2. Embaixo da caixa de escrever, clique no modo de licença e escolha **Solicitar aprovação**.
3. Clique em **Escolher projeto** e depois em **Novo projeto**. Escreva o nome **Instalação** e clique em **Adicionar**.
4. Na coluna da esquerda, clique na **casinha com o seu nome** e depois em **Abrir**. Clique em **Criar projeto** e em **Confiar na pasta**.
5. Cole o texto abaixo e aperte Enter.

**No app do Claude** (Mac ou Windows): na aba **Code**, comece uma sessão nova, escolha a **casinha com o seu nome** como pasta, cole o texto abaixo e aperte Enter.

**Pelo Terminal** (quem preferir): abra o Terminal (Mac) ou o PowerShell (Windows), digite `claude` ou `codex` e aperte Enter. Na pergunta em inglês sobre confiar na pasta, aperte **Enter** na opção **1. Yes**. Cole o texto abaixo e aperte Enter.

```
instale: https://github.com/autonom-ia/video-edit-autonomia/releases/latest/download/estudio-de-reels.zip
```

A primeira caixinha de licença aparece logo, para baixar o arquivo. Aprove: no app, clique no botão de aprovar; no Terminal, escolha a opção 1, que começa com Yes.

Depois disso, o assistente explica cada programa e pede licença antes de instalar. A caixinha de aprovação do Claude Code ou do Codex sempre aparece: é a sua segurança. Leva uns 30 minutos.

**Se fechar sem querer**, abra o app do mesmo jeito e cole o mesmo texto de novo: eu continuo de onde parou.

Outras formas de instalar (repositório fechado ou zip da plataforma do curso): [instalar/comandos-unicos.md](instalar/comandos-unicos.md).

## As caixinhas de licença

No app do Codex elas vêm em português: clique no botão de aprovar. No app do Claude, clique no botão de aprovar da caixinha. Pelo Terminal, elas vêm em inglês:

| Quando aparece | Claude Code | Codex |
|---|---|---|
| Primeira vez numa pasta (hoje na pasta pessoal; amanhã na pasta do estúdio) | "Do you trust the files in this folder?": Enter em **1. Yes, proceed** | a pergunta se pode trabalhar na pasta: a primeira opção, a que começa com **Yes** |
| O assistente vai mexer no computador | Enter em **1. Yes** | a primeira opção, a que começa com **Yes** |
| O assistente vai gravar um arquivo | uma vez, **Yes, allow all edits during this session** | a primeira opção, a que começa com **Yes** |

Se escolher "No" na primeira pergunta, o programa fecha. É só abrir de novo.

## Como usar amanhã

No fim da instalação, o assistente ensina um passo que se faz uma vez só: abrir o app direto na pasta do estúdio.

- **App do Codex:** **Escolher projeto**, depois **Novo projeto**, com o nome **Estúdio de Reels**. Em **Adicionar**, clique na casinha com o seu nome, depois na pasta **estudio-de-reels**, e em **Abrir**. Clique em **Criar projeto** e em **Confiar na pasta**.
- **App do Claude:** aba **Code**, sessão nova, pasta **estudio-de-reels** (dentro da casinha com o seu nome).
- **Terminal:** clique duas vezes em **Abrir o Estúdio**, na Área de Trabalho.

Daí em diante, abra o projeto **Estúdio de Reels** e escreva **quero gravar um vídeo**.

Já gravou? Clique duas vezes em **Estúdio de Reels**, na Área de Trabalho, ponha o vídeo na pasta **2-videos-brutos** e escreva **faz meu vídeo**. O Reel pronto aparece na pasta **3-videos-prontos**.

Três dias depois de postar, escreva **como foi meu vídeo** para aprender com os números.

## Onde fica cada coisa

| Pasta | O que tem |
|---|---|
| `estudio-de-reels/1-referencias` | 4 vídeos de exemplo feitos com o Claude Opus 5.5 (com a régua de cada um) e os que você admira |
| `estudio-de-reels/2-videos-brutos` | o vídeo que você gravou |
| `estudio-de-reels/3-videos-prontos` | o Reel pronto, a capa e o texto do post |
| `estudio-de-reels/minha-marca` | as suas respostas sobre o negócio |
| `estudio-de-reels/projetos` | o trabalho de cada vídeo |
| `estudio-de-reels/.ferramentas` | os programas do estúdio (pasta escondida; não precisa abrir) |

A pasta `estudio-de-reels` fica na sua pasta pessoal. No Windows, quando o nome do usuário tem acento ou espaço, ela fica em `C:\EstudioDeReels\estudio-de-reels`.

## Atualizar

Com o app aberto na pasta do estúdio, escreva **atualizar o estúdio**. Se o seu estúdio é da versão 1.0.3 ou anterior, escreva assim, uma vez só: **atualizar o estúdio, eu autorizo rodar a ação atualizar do instalador**. Nos dois casos, o seu trabalho, a sua marca e os seus vídeos ficam como estão, e a versão de antes fica guardada.

## Desinstalar

Peça ao assistente: **desinstalar o estúdio**. Ele mostra o que vai apagar e pede confirmação. Saem os programas (a pasta `.ferramentas` e as peças do montador) e os dois atalhos da Área de Trabalho. Os seus vídeos, a sua marca e os projetos ficam. Se quiser tirar tudo, apague depois a pasta `estudio-de-reels`, guardando antes os vídeos que quiser.

## Para quem mantém o estúdio

| Sistema | Instalador | Kit |
|---|---|---|
| Mac | `bash instalar/instalar.sh <ação> ...` | `./estudio <comando>` |
| Windows (PowerShell) | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/instalar.ps1 <ação> ...` | `.\estudio.cmd <comando>` |
| Windows (Git Bash) | o mesmo instalador do Windows, com **barra normal**: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/instalar.ps1 <ação> ...` | `./estudio <comando>` |

O `instalar.sh` recusa o Windows (código `USE_O_INSTALADOR_DO_WINDOWS`). Antes de publicar uma versão, rode `npm run conferir-distribuicao`; os passos de publicação estão em [instalar/comandos-unicos.md](instalar/comandos-unicos.md).

## Licenças

O código e as peças de terceiros estão listados em [CREDITOS.md](CREDITOS.md) e na pasta `licencas/`.
