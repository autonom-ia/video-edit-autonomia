# Estúdio de Reels

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

1. Abra o Terminal (Mac: Cmd+Espaço, digite "Terminal", Enter) ou o PowerShell (Windows: menu Iniciar, digite "PowerShell", Enter).
2. Digite `claude` (ou `codex`) e aperte Enter. Vai aparecer uma pergunta em inglês sobre confiar na pasta: aperte **Enter** na opção **1. Yes**.
3. Cole o texto abaixo e aperte Enter.

```
Quero instalar o Estúdio de Reels no meu computador.

0. Antes de rodar qualquer coisa, me diga em uma frase qual opção apertar nas caixinhas em inglês que vão aparecer (a opção 1, que começa com Yes).
1. Descubra se este computador é Mac ou Windows, e se você está rodando no PowerShell ou no Git Bash.
2. Se já existir a pasta "estudio-de-reels" na minha pasta pessoal, não apague nada e pule para o passo 4.
3. Baixe e descompacte o estúdio na minha pasta pessoal, com o nome "estudio-de-reels":
   - Mac (Terminal):
     cd ~ && curl -fL -o estudio.zip "https://github.com/autonom-ia/video-edit-autonomia/archive/refs/tags/v1.0.0.zip" && ditto -x -k estudio.zip .estudio-baixando && mv .estudio-baixando/video-edit-autonomia-1.0.0 estudio-de-reels && rm -rf .estudio-baixando estudio.zip
   - Windows (PowerShell):
     $ProgressPreference="SilentlyContinue"; cd $HOME; curl.exe -fL -o estudio.zip "https://github.com/autonom-ia/video-edit-autonomia/archive/refs/tags/v1.0.0.zip"; tar.exe -xf estudio.zip; Rename-Item video-edit-autonomia-1.0.0 estudio-de-reels; Remove-Item estudio.zip
   - Windows (Git Bash):
     cd ~ && curl -fL -o estudio.zip "https://github.com/autonom-ia/video-edit-autonomia/archive/refs/tags/v1.0.0.zip" && /c/Windows/System32/tar.exe -xf estudio.zip && mv video-edit-autonomia-1.0.0 estudio-de-reels && rm estudio.zip
4. Leia o arquivo estudio-de-reels/AGENTS.md inteiro e siga o que ele manda, começando pela instalação.

Fale comigo em português simples, um passo por vez. Antes de instalar qualquer coisa, me explique o que é e me peça licença.
```

O assistente explica cada programa e pede licença antes de instalar. A caixinha de aprovação do Claude Code ou do Codex sempre aparece: é a sua segurança. Leva uns 30 minutos.

**Se fechar sem querer**, clique em **Abrir o Estúdio** (na Área de Trabalho) ou cole o mesmo texto de novo: eu continuo de onde parou.

Outras formas de instalar (repositório fechado ou zip da plataforma do curso): [instalar/comandos-unicos.md](instalar/comandos-unicos.md).

## As caixinhas em inglês

O Claude Code e o Codex perguntam em inglês. Aperte sempre a opção de aprovar:

| Quando aparece | Claude Code | Codex |
|---|---|---|
| Primeira vez numa pasta (hoje na pasta pessoal; amanhã na pasta do estúdio) | "Do you trust the files in this folder?": Enter em **1. Yes, proceed** | a pergunta se pode trabalhar na pasta: a primeira opção, a que começa com **Yes** |
| O assistente vai mexer no computador | Enter em **1. Yes** | a primeira opção, a que começa com **Yes** |
| O assistente vai gravar um arquivo | uma vez, **Yes, allow all edits during this session** | a primeira opção, a que começa com **Yes** |

Se escolher "No" na primeira pergunta, o programa fecha. É só abrir de novo.

## Como usar amanhã

1. Clique duas vezes em **Abrir o Estúdio**, na Área de Trabalho.
2. Escreva **quero gravar um vídeo**.

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
