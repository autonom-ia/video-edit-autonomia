# Comandos únicos de instalação

O aluno cola **um** destes textos no Claude Code ou no Codex, aberto na pasta pessoal (é onde o Terminal e o PowerShell já abrem). O texto é o mesmo no Mac e no Windows: o assistente descobre o sistema sozinho (e, no Windows, se está no PowerShell ou no Git Bash), baixa o estúdio e segue o `AGENTS.md`, que manda começar pela instalação.

Endereço do estúdio no GitHub: conta **autonom-ia**, repositório **video-edit-autonomia**: <https://github.com/autonom-ia/video-edit-autonomia>.

A pasta na máquina do aluno continua se chamando `estudio-de-reels`, e o produto continua sendo o Estúdio de Reels. O zip de uma tag do GitHub descompacta numa pasta chamada `video-edit-autonomia-<versão sem o v>` (para a tag `v1.3.0`: `video-edit-autonomia-1.3.0`); os comandos abaixo trocam esse nome por `estudio-de-reels`. Se a tag mudar, troque `v1.3.0` e `1.3.0` em todos os textos (aqui; o `README.md` usa o link `latest` e não tem versão).

Use só uma das três versões, de acordo com a forma de acesso escolhida.

---

## V1: repositório público

O texto do aluno é só "instale:" e o link (testado no Codex em 12/11: ele baixou, conferiu o SHA256, leu o AGENTS.md e a skill e instalou). O link `releases/latest/download/estudio-de-reels.zip` sempre entrega a versão mais nova, e o zip já vem com uma única pasta chamada `estudio-de-reels`. Tudo o que o texto longo dizia (aprovar as caixinhas, descobrir o sistema, falar simples, pedir licença) está dentro do estúdio: no aviso do topo do `README.md`, no `AGENTS.md` e na skill `instalar-estudio`. Se o assistente descompactar em outro lugar (Downloads, por exemplo), a skill muda a pasta para o lugar certo antes de instalar.

```
instale: https://github.com/autonom-ia/video-edit-autonomia/releases/latest/download/estudio-de-reels.zip
```

### V1 longa (reserva)

Use se algum assistente baixar o arquivo e não seguir as instruções de dentro. Ela diz cada passo por extenso.

```
Quero instalar o Estúdio de Reels no meu computador.

0. Antes de rodar qualquer coisa, me diga em uma frase como aprovar as caixinhas de licença que vão aparecer: no app, o botão de aprovar; no Terminal, a opção 1, que começa com Yes.
1. Descubra se este computador é Mac ou Windows, e se você está rodando no PowerShell ou no Git Bash.
2. Se já existir a pasta "estudio-de-reels" na minha pasta pessoal, não apague nada e pule para o passo 4.
3. Baixe e descompacte o estúdio na minha pasta pessoal, com o nome "estudio-de-reels":
   - Mac (Terminal):
     cd ~ && curl -fL -o estudio.zip "https://github.com/autonom-ia/video-edit-autonomia/archive/refs/tags/v1.3.0.zip" && ditto -x -k estudio.zip .estudio-baixando && mv .estudio-baixando/video-edit-autonomia-1.3.0 estudio-de-reels && rm -rf .estudio-baixando estudio.zip
   - Windows (PowerShell):
     $ProgressPreference="SilentlyContinue"; cd $HOME; curl.exe -fL -o estudio.zip "https://github.com/autonom-ia/video-edit-autonomia/archive/refs/tags/v1.3.0.zip"; tar.exe -xf estudio.zip; Rename-Item video-edit-autonomia-1.3.0 estudio-de-reels; Remove-Item estudio.zip
   - Windows (Git Bash):
     cd ~ && curl -fL -o estudio.zip "https://github.com/autonom-ia/video-edit-autonomia/archive/refs/tags/v1.3.0.zip" && /c/Windows/System32/tar.exe -xf estudio.zip && mv video-edit-autonomia-1.3.0 estudio-de-reels && rm estudio.zip
4. Leia o arquivo estudio-de-reels/AGENTS.md inteiro e siga o que ele manda, começando pela instalação.

Fale comigo em português simples, um passo por vez. Antes de instalar qualquer coisa, me explique o que é e me peça licença.
```

---

## V2: repositório privado (o aluno tem conta no GitHub e foi convidado)

Igual à V1, trocando o passo 3 por este. O `gh` fica numa pasta temporária: ainda não existe a pasta do estúdio, e nada vai para outro lugar do computador.

```
3. O estúdio fica num lugar fechado do GitHub. Faça assim:
   a) Baixe o programa "gh" (versão 2.103.3) para uma pasta temporária:
      - Mac:
        mkdir -p "$TMPDIR/estudio-gh" && cd "$TMPDIR/estudio-gh" && A=arm64 && [ "$(uname -m)" = "x86_64" ] && A=amd64; curl -fL -o gh.zip "https://github.com/cli/cli/releases/download/v2.103.3/gh_2.103.3_macOS_$A.zip" && ditto -x -k gh.zip gh-tmp && cp gh-tmp/*/bin/gh ./gh && rm -rf gh-tmp gh.zip
      - Windows (PowerShell):
        $T="$env:TEMP\estudio-gh"; New-Item -ItemType Directory -Force $T | Out-Null; $A="amd64"; if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { $A="arm64" }; $ProgressPreference="SilentlyContinue"; curl.exe -fL -o "$T\gh.zip" "https://github.com/cli/cli/releases/download/v2.103.3/gh_2.103.3_windows_$A.zip"; tar.exe -xf "$T\gh.zip" -C $T; Copy-Item "$T\bin\gh.exe" "$T\gh.exe"
      - Windows (Git Bash): rode a linha do PowerShell assim: powershell.exe -NoProfile -Command '<a linha do PowerShell acima>'
   b) Me explique que vai abrir o navegador, que vai aparecer um código de 8 letras e que eu devo digitar esse código na página do GitHub e clicar em "Authorize". Depois rode:
      - Mac: "$TMPDIR/estudio-gh/gh" auth login --hostname github.com --web --git-protocol https
      - Windows (PowerShell): & "$env:TEMP\estudio-gh\gh.exe" auth login --hostname github.com --web --git-protocol https
      - Windows (Git Bash): "$TEMP/estudio-gh/gh.exe" auth login --hostname github.com --web --git-protocol https
   c) Na minha pasta pessoal, rode:
      - Mac: cd ~ && "$TMPDIR/estudio-gh/gh" release download v1.3.0 --repo autonom-ia/video-edit-autonomia --archive zip --output estudio.zip
      - Windows (PowerShell): cd $HOME; & "$env:TEMP\estudio-gh\gh.exe" release download v1.3.0 --repo autonom-ia/video-edit-autonomia --archive zip --output estudio.zip
      - Windows (Git Bash): cd ~ && "$TEMP/estudio-gh/gh.exe" release download v1.3.0 --repo autonom-ia/video-edit-autonomia --archive zip --output estudio.zip
   d) Descompacte como na versão pública (a pasta de dentro do zip se chama video-edit-autonomia-1.3.0) e apague o estudio.zip:
      - Mac: ditto -x -k estudio.zip .estudio-baixando && mv .estudio-baixando/video-edit-autonomia-1.3.0 estudio-de-reels && rm -rf .estudio-baixando estudio.zip
      - Windows (PowerShell): tar.exe -xf estudio.zip; Rename-Item video-edit-autonomia-1.3.0 estudio-de-reels; Remove-Item estudio.zip
      - Windows (Git Bash): /c/Windows/System32/tar.exe -xf estudio.zip && mv video-edit-autonomia-1.3.0 estudio-de-reels && rm estudio.zip
```

O `gh` fica na pasta temporária do sistema, sem mexer no resto do computador. Para atualizar depois, o aluno usa a mesma conta.

---

## V3: zip baixado pelo navegador (plataforma do curso)

Igual à V1, trocando o passo 3 por este:

```
3. Eu baixei o arquivo estudio-de-reels.zip, que está na minha pasta Downloads. Descompacte esse arquivo na minha pasta pessoal com o nome "estudio-de-reels" e tire a marca de "baixado da internet":
   - Mac: ditto -x -k ~/Downloads/estudio-de-reels.zip ~/.estudio-baixando && mv ~/.estudio-baixando/* ~/estudio-de-reels && rm -rf ~/.estudio-baixando && xattr -dr com.apple.quarantine ~/estudio-de-reels && chmod 755 ~/estudio-de-reels/estudio ~/estudio-de-reels/instalar/*.sh
   - Windows (PowerShell): cd $HOME; New-Item -ItemType Directory -Force .estudio-baixando | Out-Null; tar.exe -xf "$HOME\Downloads\estudio-de-reels.zip" -C .estudio-baixando; Move-Item (Get-ChildItem -Directory .estudio-baixando)[0].FullName estudio-de-reels; Remove-Item .estudio-baixando; Get-ChildItem -Recurse estudio-de-reels | Unblock-File
   - Windows (Git Bash): rode a linha do PowerShell assim: powershell.exe -NoProfile -Command '<a linha do PowerShell acima>'
```

Na V3, o zip da plataforma precisa ter uma única pasta dentro (qualquer nome: `video-edit-autonomia-1.3.0`, `estudio-de-reels`...). O anexo `estudio-de-reels.zip` do release já vem assim. O Mac pode perguntar se o Terminal pode mexer em Downloads: clique em Permitir.

---

## Publicar uma versão (para quem mantém o estúdio)

1. Rode `npm run conferir-distribuicao`. Ele falha se sobrar o marcador antigo da conta (a palavra em maiúsculas que ficava no lugar de `autonom-ia`) no `README.md`, neste arquivo ou em `instalar/versoes.env`, ou se faltar `package-lock.json` ou `uv.lock`.
2. Atualize `VERSAO`, crie a tag (`v1.0.1`, `v1.0.2`, `v1.0.3`...) e publique um release no GitHub `autonom-ia/video-edit-autonomia` com dois anexos:
   - `estudio-de-reels.zip`: o estúdio inteiro, com uma única pasta dentro, com os bits de execução de `estudio` e `instalar/*.sh`;
   - `estudio-de-reels.zip.sha256`: o SHA256 do zip (`shasum -a 256 estudio-de-reels.zip > estudio-de-reels.zip.sha256`).
3. O `atualizar` do aluno baixa `releases/latest/download/estudio-de-reels.zip` (ver `ESTUDIO_ATUALIZAR_URL` em `instalar/versoes.env`), confere pelo `.sha256` e só aceita endereço `https://github.com/autonom-ia/video-edit-autonomia/...`. O zip automático da tag não serve para o `atualizar`: precisa do anexo.

---

## O que acontece depois do comando

1. O assistente lê o `AGENTS.md` e mostra o I-01 (o que vai fazer e pede para olhar o computador).
2. Roda `checar`. Se o estúdio caiu dentro do OneDrive ou do iCloud, ou se o nome do usuário do Windows tem acento, o assistente pede licença e muda a pasta de lugar (`mudar-pasta`).
3. Cria a pasta de programas (`.ferramentas`, dentro do estúdio) e logo depois os atalhos "Abrir o Estúdio" e "Estúdio de Reels" na Área de Trabalho. Se a janela fechar no meio, a pessoa volta pelo atalho.
4. Mostra o plano (I-03) e instala um programa por vez, avisando antes de cada um.
5. Os dois ouvidos baixam em segundo plano enquanto ele faz as perguntas do briefing.
6. Baixa os vídeos de exemplo e abre as 3 pastas.
7. Roda `verificar` e diz "Tudo pronto" ou o que faltou.

Os textos de cada momento estão em `instalar/mensagens.json`.
