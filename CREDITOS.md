# Créditos

O Estúdio de Reels é MIT, © 2026 Autonom.ia (veja `LICENSE`).
Ele usa peças de outras pessoas. Cada uma segue a própria licença.

- **Versionado**: o arquivo está dentro deste repositório.
- **Baixado**: o arquivo não está aqui. Ele é baixado na máquina do aluno, na instalação ou no uso, e só com a licença do aluno.

Os textos integrais das licenças das peças versionadas, e das que exigem aviso, ficam em `licencas/`.

## Peças versionadas

| Peça | O que faz aqui | Licença | Origem | Texto da licença |
|---|---|---|---|---|
| SFX Kit (14 sons) | Sons dos movimentos do vídeo, em `kit/sfx/` (só renomeados; mapa em `kit/sfx/LEIA-ME.txt`) | CC0 1.0 | Wyzowl, https://huggingface.co/datasets/wyzowl/sfx-kit | `licencas/CC0-wyzowl-sfx-kit.txt` |
| Space Grotesk | Fonte de título (par de fontes) | SIL OFL 1.1 | Google Fonts, https://github.com/google/fonts/tree/main/ofl/spacegrotesk | `licencas/OFL-space-grotesk.txt` e `kit/fontes/space-grotesk/OFL.txt` |
| Inter | Fonte de leitura (par de fontes) | SIL OFL 1.1 | Google Fonts, https://github.com/google/fonts/tree/main/ofl/inter | `licencas/OFL-inter.txt` e `kit/fontes/inter/OFL.txt` |
| Fraunces | Fonte de título (par de fontes) | SIL OFL 1.1 | Google Fonts, https://github.com/google/fonts/tree/main/ofl/fraunces | `licencas/OFL-fraunces.txt` e `kit/fontes/fraunces/OFL.txt` |
| Nunito | Fonte de título e leitura (par de fontes) | SIL OFL 1.1 | Google Fonts, https://github.com/google/fonts/tree/main/ofl/nunito | `licencas/OFL-nunito.txt` e `kit/fontes/nunito/OFL.txt` |
| bolo-de-camadas | Método das 5 camadas de edição, adaptado no molde de composição (`kit/molde/reel/`) e nos guias `guias/camadas.md` e `guias/tela-livre.md` (repertório de movimento); estilos por nicho copiados em `guias/nichos/`, só com um cabeçalho a mais | MIT, © 2026 Cauhi (cauhi.com) | https://github.com/pcauhi/bolo-de-camadas | `licencas/MIT-bolo-de-camadas.txt` |
| instagram-agent-skill | Fórmulas de gancho e regras de naturalidade, traduzidas e adaptadas nos guias (`guias/ganchos.md`, `guias/naturalidade.md`) | MIT, © 2026 Jake Schincariol | https://github.com/Jakeschincariol/instagram-agent-skill | `licencas/MIT-instagram-agent-skill.txt` |

As fontes são variáveis (`*-Variable.ttf`). Foram copiadas sem modificação.

## Peças baixadas na máquina do aluno

| Peça | Versão | O que faz aqui | Licença | Quem baixa | Texto da licença |
|---|---|---|---|---|---|
| HyperFrames | 0.9.20 (npm `hyperframes`) | Motor de render do vídeo (HTML para MP4) | Apache 2.0 | npm, pelo `package.json` | `licencas/Apache-2.0-hyperframes.txt` (com aviso de dependência) |
| Skills do HyperFrames | as da versão acima | Instruções do motor para o assistente | as do HyperFrames | o próprio HyperFrames | no pacote |
| Modelo de recorte `u2net_human_seg` (~170 MB) e onnxruntime-node | os que o `hyperframes remove-background` pedir | Recorta a pessoa do fundo nos efeitos de cena (`./estudio recortar`) | Apache 2.0 (modelo U²-Net) e MIT (onnxruntime) | o próprio HyperFrames, no primeiro recorte | no pacote baixado |
| chrome-headless-shell | a que o HyperFrames pedir | Navegador escondido que fotografa cada quadro e as telas | licenças do Chromium (BSD-3 e outras) | o próprio HyperFrames | no pacote baixado |
| GSAP | 3.14.2 (npm `gsap`) | Animação da composição e das telas livres (com os plugins SplitText, MorphSVG, DrawSVG e outros, que fazem parte do mesmo pacote); copiado de `node_modules` para a pasta do vídeo na montagem, só o que o vídeo usa | GSAP Standard "no charge" License, https://gsap.com/standard-license | npm, pelo `package.json` | no pacote |
| faster-whisper | 1.2.1 (PyPI) | Transcrição palavra por palavra, no computador do aluno | MIT, © 2023 SYSTRAN | uv, pelo `pyproject.toml` | `licencas/MIT-faster-whisper.txt` |
| Modelo de fala (large-v3-turbo ou small) | conversão para faster-whisper | O "ouvido de texto" usado pelo faster-whisper | MIT (pesos Whisper da OpenAI) | `./estudio preparar-fala` | no repositório do modelo |
| earshot | commit `4ac3d2ac2b151e1c23376f9ce7f3047a17050013` | "Ouvido de som": critica a mixagem e escolhe trilha (opcional) | MIT, © 2026 Leon Lin | instalador, via `uv tool install` | `licencas/MIT-earshot.txt` |
| Modelos do earshot | os que `earshot doctor --fetch` pedir | Usados pelo earshot | conforme o projeto earshot | `earshot doctor --fetch` | no projeto earshot |
| Música da trilha | uma por vídeo | Trilha de fundo | só CC0 ou CC BY (sem NC e sem ND) | `./estudio musica`, pela API do Openverse (https://openverse.org) | o crédito vai no texto do post e nos metadados do MP4 (`./estudio creditar`) |
| Vídeos de referência | os da lista `1-referencias/links.json` | Estudo de ritmo e edição ("referência é régua, não molde") | dos criadores; não são redistribuídos | `./estudio referencias`, com o yt-dlp | não se aplica |
| Node.js | `NODE_VERSAO` em `instalar/versoes.env` | Roda os comandos do estúdio | MIT | instalador | no pacote |
| uv e Python 3.12 | `UV_VERSAO` em `instalar/versoes.env` | Ambiente da transcrição | uv: MIT ou Apache 2.0; Python: PSF | instalador | nos pacotes |
| FFmpeg e FFprobe | `FFMPEG_VERSAO` em `instalar/versoes.env` (no Windows ARM, ramo 8.1 da BtbN: `FFMPEG_WIN_URL_ARM64`) | Corte, mixagem, medição e conferência do vídeo | builds GPL (martin-riedl no Mac, Gyan e BtbN no Windows) | instalador | no pacote |
| yt-dlp | `YTDLP_VERSAO` em `instalar/versoes.env` | Baixa os vídeos de referência | Unlicense | instalador | no pacote |
| GitHub CLI (gh) | `GH_VERSAO` em `instalar/versoes.env` | Baixa o estúdio de um repositório privado (só quando preciso) | MIT | comando único de instalação | no pacote |

## O que nunca entra

- Vídeo, música ou imagem de terceiros dentro do repositório.
- Voz sintética, rosto simulado ou serviço pago ligado sem o aluno pedir.
