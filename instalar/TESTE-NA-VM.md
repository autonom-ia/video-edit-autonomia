# Teste do instalador em máquina limpa

Roteiro manual para rodar antes de cada aula ou versão nova. Obrigatório: **Mac Apple Silicon limpo** e **Windows 11 x64 limpo**. Desejável: Windows 10 22H2, Mac Intel e Windows 11 ARM.

"Limpo" quer dizer: conta de usuário nova, sem Homebrew, sem Node, sem Python, sem FFmpeg, sem Git (no Windows). Só o Claude Code ou o Codex instalado e com login.

Cada rodada testa as duas pontas: com o **Claude Code** e com o **Codex**. Use o comando V1 (ou o que for distribuído) de `instalar/comandos-unicos.md`.

## O que observar em toda máquina

Anote "passou" ou "falhou" e o motivo.

1. O assistente fala em português simples, um passo por vez, e nunca pede para o aluno digitar comando ou ler o terminal.
2. Antes de cada caixinha de aprovação, ele avisa o que é (I-04 ou I-05).
3. Nenhuma janela pede a senha do computador (exceção aceita: a janela do Windows para o Git opcional e a do Codex no Windows).
4. A última linha de toda chamada a `instalar.sh` / `instalar.ps1` é um JSON numa linha só.
5. Rodar o mesmo passo duas vezes devolve `JA_PRONTO` na segunda vez e não baixa nada de novo.
6. Os dois ouvidos baixam em segundo plano enquanto acontecem as perguntas do briefing.
7. No fim aparece o I-14 com "Tudo pronto: N de N" (ou o I-15 com a lista do que faltou, em palavras simples).
8. Existem: os atalhos "Abrir o Estúdio" e "Estúdio de Reels" na Área de Trabalho (criados logo depois do passo pasta), as 3 pastas abertas, `instalacao.json` em `estudio-de-reels/.ferramentas`.
9. Clicar duas vezes no atalho abre o assistente já dentro da pasta do estúdio.
10. Tempo total da instalação com internet boa: anotar (meta: até 30 minutos, contando o briefing).

## Máquina 1: Mac Apple Silicon (macOS 14 ou 15), limpo

| Passo | Como | Resultado esperado |
|---|---|---|
| 1 | Colar o comando V1 no Claude Code aberto na pasta pessoal | Pasta `~/estudio-de-reels` criada; assistente mostra o I-01 |
| 2 | Aprovar "Pode olhar" | `checar` com `ok:true`, `arquitetura:"arm64"`, `nome_sistema:"Mac com chip Apple"`, `problemas:[]` |
| 3 | Escolher "Pode instalar tudo" | I-04 antes de cada passo, nesta ordem: pasta, atalho, python, node, ffmpeg, baixador, montador. O Mac pergunta se o Terminal pode mexer na Mesa (atalho); negar dá `ATALHO_NEGADO_PELO_MAC` |
| 4 | `passo ffmpeg` | `ok:true`, versão 8.0.1; `ffmpeg -filters` tem zscale, loudnorm, ebur128, sidechaincompress, afftdn |
| 5 | `passo montador` | `npm ci` termina; `hyperframes browser ensure` baixa o Chrome em `~/estudio-de-reels/.ferramentas/cache/hyperframes/chrome`; doctor com Node.js, FFmpeg, FFprobe e Chrome ok |
| 6 | `segundo-plano fala` e `segundo-plano ouvido` | `iniciado:true` nos dois; `status` mostra `rodando` e depois `pronto` |
| 7 | Briefing inteiro, depois referências e pastas | Vídeos em `1-referencias/` (ou, se o site pedir login, o assistente avisa em uma frase e segue); `~/Desktop/Abrir o Estúdio.command` executável com o caminho absoluto do agente; `~/Desktop/Estúdio de Reels` abre a pasta; 3 janelas do Finder |
| 8 | `verificar` | `ok:true`, `instalacao_gravada:true` |
| 9 | Fechar o Terminal e clicar duas vezes no atalho | Abre o Terminal e o Claude dentro de `~/estudio-de-reels` |
| 10 | Repetir 1 a 8 com o Codex numa conta nova | Mesmo resultado; o Codex pede internet e "fora da área protegida" no montador e nas pastas, sempre com aviso antes |

Conferir também: nada foi criado fora de `~/estudio-de-reels` e dos dois atalhos (`ls -la ~` antes e depois). Nada em `~/.npm`, `~/.cache` ou `~/.local` novo. No Codex, `checar` sem internet liberada deve dar `INTERNET_BLOQUEADA_PELA_CAIXA` (não `SEM_INTERNET`). `desinstalar` sem `--confirmar` lista o que apagaria; com `--confirmar` apaga `.ferramentas`, `node_modules` e os atalhos, e deixa os vídeos.

## Máquina 2: Windows 11 x64, limpo

| Passo | Como | Resultado esperado |
|---|---|---|
| 1 | Colar o comando V1 no Claude Code aberto no PowerShell, na pasta pessoal | Pasta `%USERPROFILE%\estudio-de-reels`; I-01 |
| 2 | `checar` | `ok:true`, `nome_sistema:"Windows 11"`, `arquitetura:"x64"` |
| 3 | "Pode instalar tudo" | Cada passo com aviso antes. Nenhum UAC até o Git |
| 4 | `passo ffmpeg` | Gyan 8.0.1 essentials, `ok:true`. Se vier `FFMPEG_INCOMPLETO`, o instalador baixa sozinho o full_build: anotar qual filtro faltou no log |
| 5 | `passo montador` | `npm.cmd ci` termina; Chrome em `%USERPROFILE%\estudio-de-reels\.ferramentas\cache\hyperframes\chrome` |
| 6 | Segundo plano | Os dois ouvidos baixam numa janela escondida; `status` chega a `pronto` |
| 7 | Git (I-09) | `winget` instala com `--scope user`. Anotar se a janela de alteração aparece |
| 8 | Atalhos e pastas | `Abrir o Estúdio.cmd` (começa com `chcp 65001`, UTF-8 sem BOM, caminho absoluto do agente) e `Estúdio de Reels.lnk` na Área de Trabalho real (mesmo se ela estiver no OneDrive); 3 janelas do Explorer |
| 9 | `verificar` | `ok:true`, `git_disponivel:true` em `instalacao.json` |
| 10 | Duplo clique no atalho | Abre o Prompt de Comando com o Claude dentro do estúdio |
| 11 | Repetir com o Codex | Anotar se aparece a janela do Windows (CODEX_UAC) e se o segundo plano sobrevive dentro da caixa de proteção |

Conferir também: `.\estudio.cmd conferir-kit` e `bash ./estudio conferir-kit` (no Git Bash) devolvem o mesmo JSON. No Git Bash, `powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/instalar.ps1 plano` funciona (barra normal) e `bash instalar/instalar.sh checar` recusa com `USE_O_INSTALADOR_DO_WINDOWS`.

## Máquina 3: Windows 10 22H2 x64

Mesmo roteiro da máquina 2. Pontos extras:

- `curl.exe` e `tar.exe` existem em `C:\Windows\System32` (se faltarem, `checar` deve dar `SISTEMA_ANTIGO`).
- Usuário com acento no nome (crie um usuário "José"): `checar` deve trazer `NOME_COM_ACENTO`; depois de `mudar-pasta`, o estúdio vai para `C:\EstudioDeReels\estudio-de-reels` (com os programas dentro, em `.ferramentas`) e não sobra cópia na pasta pessoal (`copiado:false`).
- Estúdio descompactado dentro de `Documentos` com o OneDrive ligado: `checar` deve trazer `PASTA_NA_NUVEM`.
- Windows 10 21H2 ou mais antigo: `checar` deve dar `SISTEMA_ANTIGO`.
- Windows 10 ARM (qualquer versão): `checar` deve dar `SISTEMA_ANTIGO` com `minimo:"Windows 11"`.

## Máquina 4: Mac Intel (macOS 13.5 ou mais novo)

- `checar` traz o aviso `MAC_INTEL_PRAZO`.
- `passo ouvido` devolve `ok:true` com `OUVIDO_NAO_SUPORTADO`; `plano` mostra `ouvido` como `nao_suportado`.
- `passo fala` instala o faster-whisper e o onnxruntime sem erro (ponto não verificado).
- `verificar` conta o ouvido como ok, com o texto "não existe para Mac Intel".
- macOS 13.0 a 13.4: `checar` deve dar `SISTEMA_ANTIGO` (o Node 24 pede 13.5).

## Máquina 5: Windows 11 ARM

- `checar` traz o aviso `OUVIDO_NAO_SUPORTADO`.
- `passo python` instala `cpython-3.12-windows-x86_64` (roda emulado).
- `passo node` usa o zip `win-arm64`; `passo ffmpeg` usa o BtbN winarm64 (se a tag fixa sumiu, cai na reserva `latest` do ramo 8.1, conferida pelo `checksums.sha256` da mesma release; sem hash, `ARQUIVO_DIFERENTE` e nada instalado).
- `passo baixador` usa `yt-dlp_arm64.exe`.
- `passo fala`: anotar se o faster-whisper roda no Python x64 emulado.

## Erros provocados (pelo menos numa máquina de cada sistema)

| Como provocar | Resultado esperado |
|---|---|
| Desligar o Wi-Fi antes de `checar` | `SEM_INTERNET` |
| Desligar o Wi-Fi no meio do `passo node` | `DOWNLOAD_FALHOU`; ao religar, "Tentar de novo" termina |
| Encher o disco até sobrar menos de 12 GB | `POUCO_ESPACO` com `livre_gb` e `precisa_gb` |
| Trocar um SHA256 em `versoes.env` | `ARQUIVO_DIFERENTE`, nada instalado |
| Negar a caixinha de um passo | o assistente mostra `COMANDO_RECUSADO` com a consequência do item |
| Rodar `passo montador` antes do node | `FALTA_PASSO_ANTERIOR` com `dados.falta:"node"` |
| Matar o processo do `segundo-plano fala` | `status fala` vira `erro` com `FALA_FALHOU` |
| Windows: Defender bloqueando um .exe | `ANTIVIRUS_BLOQUEOU` com o nome do arquivo |
| Mac: binário com quarentena (`xattr -w com.apple.quarantine`) | o instalador tira a trava sozinho; se não der, `MAC_BLOQUEOU` |

## Pontos ainda não verificados (confirmar e anotar)

1. earshot no Windows x64 e no macOS 13 (pino `torch>=2.6,<2.10`).
2. faster-whisper e onnxruntime no Mac Intel; Python x64 emulado no Windows ARM64.
3. Filtros do build Gyan essentials 8.0.1 (zscale, sidechaincompress). O martin-riedl 8.0.1 de Mac já foi conferido (tem libzimg e libx264).
4. Processo em segundo plano dentro da caixa de proteção do Codex: sobrevive ao fim do comando?
5. `open` e `Invoke-Item` dentro da caixa de proteção do Codex.
6. Flags do `codex exec` para o avaliador isolado.
7. Sintaxe de permissão do Claude Code para a ferramenta PowerShell (`.\estudio.cmd`).
8. Destino do `hyperframes skills update` (o instalador não roda; `HYPERFRAMES_SKIP_SKILLS=1` fica ligado).
9. Se o `winget --scope user` do Git ainda mostra a janela de alteração.
10. Tamanhos reais de cada passo (os do I-03 são estimativa): medir a pasta de ferramentas depois de cada passo.
11. Se o PowerShell 5.1 entrega `--agente claude` ao script quando chamado com `-File` (o script aceita `--agente`, `-agente` e `-Agente`).
12. Calibração do limiar do teste de celular (kit).

## Depois da primeira rodada boa (decisão E9)

1. O `package-lock.json` e o `uv.lock` já vêm no estúdio (gerados com `npm install --package-lock-only --ignore-scripts` e `uv lock`). O instalador usa só `npm ci` e `uv sync --frozen`. Ao mudar `package.json` ou `pyproject.toml`, gere os dois de novo e rode `npm run conferir-distribuicao`.
2. Anote neste arquivo: data, máquinas, agente, tempo total e o que falhou.
