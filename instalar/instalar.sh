#!/bin/bash
# Estúdio de Reels: instalador para Mac (Apple Silicon e Intel). Compatível com bash 3.2.
#
# Uso:
#   bash instalar/instalar.sh <acao> [id] [--agente claude|codex] [--modo tudo|um_por_um]
#
# Ações:
#   checar               Só olha o computador (sistema, espaço, memória, internet, pasta). Não instala nada.
#   plano                Diz o estado de cada passo (falta, pronto, nao_suportado).
#   passo <id>           Instala ou executa um passo. Rodar de novo não baixa de novo.
#   segundo-plano <id>   Só "fala" e "ouvido": começa o passo escondido e volta na hora.
#   status <id>          Lê como está um passo em segundo plano.
#   verificar            Confere cada programa, grava instalacao.json e diz o que falta.
#   mudar-pasta          Muda o estúdio para ~/estudio-de-reels (quando ele caiu dentro do iCloud ou outra nuvem).
#   atualizar [endereço] Baixa a versão nova (só do GitHub da conta fixa, conferida por SHA256) e copia por cima,
#                        sem tocar em .ferramentas, projetos, minha-marca e nas pastas 1, 2 e 3.
#   desinstalar          Sem --confirmar: só diz o que seria apagado. Com --confirmar: apaga a pasta de
#                        ferramentas, as peças do montador e os atalhos da Mesa. Os vídeos e a marca ficam.
#
# Passos, na ordem: pasta atalho python node ffmpeg baixador montador fala ouvido referencias pastas
# (o atalho vem logo depois da pasta: se a janela fechar no meio, a pessoa volta por ele;
# o passo "git" só existe no Windows; aqui ele responde NAO_SE_APLICA).
#
# Regras: tudo fica em <estudio-de-reels>/.ferramentas; nada pede senha; versões fixas em versoes.env;
# antes de cada coisa o script diz em português o que vai fazer; a ÚLTIMA linha é sempre um JSON numa linha só.
# Sem expressão regular: só comparação de texto, case e split.
# Só para Mac. No Windows (PowerShell ou Git Bash) use instalar/instalar.ps1.

set -u
umask 022

# No Windows (Git Bash, MSYS, Cygwin) este instalador baixaria programas de Mac. Recusa logo.
case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*)
    printf '%s\n' '{"acao":"","ok":false,"codigo":"USE_O_INSTALADOR_DO_WINDOWS","dados":{"comando":"powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/instalar.ps1"}}'
    exit 1 ;;
  Linux*)
    # Linux (inclusive o Ubuntu dentro do Windows, WSL): não há programas deste estúdio para ele.
    printf '%s\n' '{"acao":"","ok":false,"codigo":"SISTEMA_NAO_SUPORTADO","dados":{"sistema":"Linux"}}'
    exit 1 ;;
esac

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -z "${ESTUDIO_REPO:-}" ]; then
  ESTUDIO_REPO="$(cd "$AQUI/.." && pwd)"
fi
export ESTUDIO_REPO
# shellcheck source=instalar/ambiente.sh
. "$ESTUDIO_REPO/instalar/ambiente.sh"

REPO="$ESTUDIO_REPO"
FERR="$ESTUDIO_FERRAMENTAS"
ESTADO="$FERR/estado"
LOGS="$FERR/logs"
LOG=/dev/null
TMPD=""
NODE_BIN="$FERR/node/bin/node"
PASSOS_MAC="pasta atalho python node ffmpeg baixador montador fala ouvido referencias pastas"
MESA="$HOME/Desktop"
ATALHO_ABRIR="$MESA/Abrir o Estúdio.command"
ATALHO_PASTA="$MESA/Estúdio de Reels"

# ---------------------------------------------------------------- versões

ler_versoes() {
  local linha chave valor
  [ -f "$REPO/instalar/versoes.env" ] || return 0
  while IFS= read -r linha || [ -n "$linha" ]; do
    linha="${linha%$'\r'}"
    case "$linha" in
      ''|'#'*) continue ;;
      *=*) ;;
      *) continue ;;
    esac
    chave="${linha%%=*}"
    valor="${linha#*=}"
    printf -v "V_$chave" '%s' "$valor"
  done < "$REPO/instalar/versoes.env"
}
ler_versoes

VERSAO_ESTUDIO="1.3.1"
if [ -f "$REPO/VERSAO" ]; then
  IFS= read -r VERSAO_ESTUDIO < "$REPO/VERSAO" || true
  VERSAO_ESTUDIO="${VERSAO_ESTUDIO%$'\r'}"
fi

# ---------------------------------------------------------------- argumentos

ACAO="${1:-}"
[ $# -gt 0 ] && shift
ID=""
AGENTE=""
MODO=""
CONFIRMAR=0
while [ $# -gt 0 ]; do
  case "$1" in
    --confirmar)
      CONFIRMAR=1; shift ;;
    --agente)
      if [ $# -ge 2 ]; then AGENTE="$2"; shift 2; else shift; fi ;;
    --modo)
      if [ $# -ge 2 ]; then MODO="$2"; shift 2; else shift; fi ;;
    *)
      [ -z "$ID" ] && ID="$1"
      shift ;;
  esac
done
case "$AGENTE" in claude|codex) ;; *) AGENTE="" ;; esac
case "$MODO" in tudo|um_por_um) ;; *) MODO="" ;; esac

# ---------------------------------------------------------------- computador

ARQ="x64"
case "$(uname -m 2>/dev/null)" in
  arm64|aarch64) ARQ="arm64" ;;
esac
if [ "$ARQ" = "x64" ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = "1" ]; then
  ARQ="arm64"
fi
VERSAO_SO="$(sw_vers -productVersion 2>/dev/null)"
MAC_MAIOR="${VERSAO_SO%%.*}"
MAC_RESTO="${VERSAO_SO#*.}"
MAC_MENOR="${MAC_RESTO%%.*}"
[ "$MAC_RESTO" = "$VERSAO_SO" ] && MAC_MENOR=0

# ---------------------------------------------------------------- utilidades

# Texto para JSON (aspas, barra, quebra de linha), caractere por caractere.
# shellcheck disable=SC1003 # a barra entre aspas simples é o caractere barra, de propósito
js() {
  local s="$1" out="" c i n
  n=${#s}
  for ((i = 0; i < n; i++)); do
    c="${s:i:1}"
    case "$c" in
      '"') out="$out\\\"" ;;
      '\') out="$out\\\\" ;;
      $'\n') out="$out\\n" ;;
      $'\r') ;;
      $'\t') out="$out " ;;
      *) out="$out$c" ;;
    esac
  done
  printf '"%s"' "$out"
}

jbool() { if [ "$1" = "1" ] || [ "$1" = "true" ]; then printf 'true'; else printf 'false'; fi; }

agora() { date -u +%Y-%m-%dT%H:%M:%SZ; }

diga() {
  printf '%s\n' "$*"
  if [ "$LOG" != "/dev/null" ]; then
    printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*" >>"$LOG" 2>/dev/null
  fi
}

preparar_log() {
  if mkdir -p "$LOGS" 2>/dev/null; then
    LOG="$LOGS/$1.log"
    printf '\n===== %s %s =====\n' "$1" "$(agora)" >>"$LOG" 2>/dev/null || LOG=/dev/null
  fi
}

preparar_tmp() {
  [ -n "$TMPD" ] && return 0
  if mkdir -p "$FERR/tmp/$$" 2>/dev/null; then
    TMPD="$FERR/tmp/$$"
  else
    TMPD="$(mktemp -d "${TMPDIR:-/tmp}/estudio.XXXXXX")"
  fi
}

# shellcheck disable=SC2329 # chamada pelo trap logo abaixo
limpar_tmp() {
  if [ -n "$TMPD" ] && [ -d "$TMPD" ]; then
    rm -rf "$TMPD"
  fi
}
trap limpar_tmp EXIT

ler_config() {
  CFG_AGENTE=""
  CFG_MODO=""
  [ -f "$FERR/config.txt" ] || return 0
  local l
  while IFS= read -r l || [ -n "$l" ]; do
    case "$l" in
      agente=*) CFG_AGENTE="${l#agente=}" ;;
      modo=*) CFG_MODO="${l#modo=}" ;;
    esac
  done < "$FERR/config.txt"
}

gravar_config() {
  [ -d "$FERR" ] || return 0
  ler_config
  [ -n "$AGENTE" ] && CFG_AGENTE="$AGENTE"
  [ -n "$MODO" ] && CFG_MODO="$MODO"
  printf 'agente=%s\nmodo=%s\n' "$CFG_AGENTE" "$CFG_MODO" > "$FERR/config.txt" 2>/dev/null || true
}

# estado/<id>.json (para o agente) e estado/<id>.txt (duas linhas: estado e versão, para este script).
gravar_estado() {
  local id="$1" est="$2" cod="${3:-}" prog="${4:-}" ver="${5:-}"
  [ -d "$ESTADO" ] || return 0
  local t="$ESTADO/.$id.$$"
  printf '{"passo":%s,"estado":%s,"codigo":%s,"progresso":%s,"versao":%s,"atualizado_em":%s}\n' \
    "$(js "$id")" "$(js "$est")" "$(js "$cod")" "$(js "$prog")" "$(js "$ver")" "$(js "$(agora)")" > "$t" 2>/dev/null \
    && mv -f "$t" "$ESTADO/$id.json"
  printf '%s\n%s\n' "$est" "$ver" > "$ESTADO/$id.txt" 2>/dev/null || true
}

progresso() {
  [ -d "$ESTADO" ] || return 0
  gravar_estado "$PASSO_ATUAL" rodando "" "$1" ""
}

ler_estado() {
  EST_ESTADO=""
  EST_VERSAO=""
  [ -f "$ESTADO/$1.txt" ] || return 0
  { IFS= read -r EST_ESTADO; IFS= read -r EST_VERSAO; } < "$ESTADO/$1.txt"
}

# Lê um campo de um JSON (texto) usando o próprio Node do estúdio. Sem Node, devolve vazio.
jcampo() {
  [ -x "$NODE_BIN" ] || { printf ''; return 0; }
  "$NODE_BIN" -e 'try{const j=JSON.parse(process.argv[1]);const v=j[process.argv[2]];if(v===undefined||v===null){console.log("")}else if(typeof v==="object"){console.log(JSON.stringify(v))}else{console.log(String(v))}}catch(e){console.log("")}' "$1" "$2" 2>/dev/null
}

json_valido() {
  [ -x "$NODE_BIN" ] || return 1
  "$NODE_BIN" -e 'try{JSON.parse(process.argv[1]);process.exit(0)}catch(e){process.exit(1)}' "$1" 2>/dev/null
}

ultima_linha() { printf '%s\n' "$1" | tail -n 1; }

primeira_palavra() {
  local p
  read -r p _ < "$1" || true
  printf '%s' "$p"
}

# Procura o hash de um arquivo numa lista "hash  nome" (SHASUMS256.txt, SHA2-256SUMS, checksums.txt).
hash_na_lista() {
  local h n
  while read -r h n || [ -n "$h" ]; do
    n="${n%$'\r'}"
    n="${n#\*}"
    if [ "$n" = "$2" ]; then
      printf '%s' "$h"
      return 0
    fi
  done < "$1"
  return 1
}

# Baixa com 2 tentativas. Retorno: 0 ok, 2 não baixou, 3 chegou diferente do esperado.
baixar() {
  local url="$1" dest="$2" sha="${3:-}" tent tem
  for tent in 1 2; do
    rm -f "$dest.part"
    if ! curl -fL --retry 3 --retry-delay 3 --connect-timeout 20 -sS -A "estudio-de-reels/1.0" -o "$dest.part" "$url" >>"$LOG" 2>&1; then
      echo "download falhou: $url" >>"$LOG"
      [ "$tent" = "2" ] && return 2
      sleep 3
      continue
    fi
    if [ -n "$sha" ]; then
      tem="$(shasum -a 256 "$dest.part" | cut -d' ' -f1)"
      if [ "$tem" != "$sha" ]; then
        echo "arquivo diferente: $url ($tem, esperado $sha)" >>"$LOG"
        rm -f "$dest.part"
        if [ "$tent" = "2" ]; then return 3; fi
        diga "O arquivo chegou diferente do esperado. Por segurança, vou baixar de novo."
        continue
      fi
    fi
    mv -f "$dest.part" "$dest"
    return 0
  done
  return 2
}

codigo_do_download() {
  case "$1" in
    3) printf 'ARQUIVO_DIFERENTE' ;;
    *) printf 'DOWNLOAD_FALHOU' ;;
  esac
}

# Roda um programa nosso. Se o Mac bloquear (126 ou morto), tira a trava e tenta de novo.
RB_SAIDA=""
RB_BLOQUEADO=0
rodar_bin() {
  local b="$1" st
  shift
  RB_BLOQUEADO=0
  RB_SAIDA="$("$b" "$@" 2>>"$LOG")"
  st=$?
  if [ "$st" -eq 126 ] || [ "$st" -ge 128 ]; then
    diga "O Mac não deixou abrir um programa. Vou tirar a trava de baixado da internet e tentar de novo."
    xattr -dr com.apple.quarantine "$b" >>"$LOG" 2>&1
    codesign --force -s - "$b" >>"$LOG" 2>&1
    RB_SAIDA="$("$b" "$@" 2>>"$LOG")"
    st=$?
    if [ "$st" -eq 126 ] || [ "$st" -ge 128 ]; then RB_BLOQUEADO=1; fi
  fi
  return "$st"
}

copiar_bin() {
  local origem f
  origem="$1"
  f="$(find "$origem" -type f -name "$2" 2>/dev/null | head -n 1)"
  [ -n "$f" ] || return 1
  cp -f "$f" "$FERR/bin/$2" || return 1
  chmod 755 "$FERR/bin/$2"
  xattr -d com.apple.quarantine "$FERR/bin/$2" >/dev/null 2>&1
  return 0
}

# Põe um texto entre aspas simples, pronto para um script de shell (trata a aspa simples de dentro).
aspas() {
  local s="$1"
  printf "'%s'" "${s//\'/\'\\\'\'}"
}

# Vídeos de exemplo: "<quantidade> <MB>". Único lugar do cálculo: duracao_s de 1-referencias/links.json
# vezes REFERENCIA_MB_POR_MINUTO de versoes.env. Sem Node (antes do passo node), estima 2 minutos por vídeo.
REF_QTD=""
REF_MB=""
calcular_referencias() {
  local por="${V_REFERENCIA_MB_POR_MINUTO:-15}" links="$REPO/1-referencias/links.json" r=""
  [ -n "$REF_QTD" ] && return 0
  REF_QTD=0
  REF_MB=0
  [ -f "$links" ] || return 0
  if [ -x "$NODE_BIN" ]; then
    r="$("$NODE_BIN" -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const l=Array.isArray(j.exemplos)?j.exemplos:[];let s=0;for(const e of l){s+=Number(e.duracao_s)||0}console.log(l.length+" "+Math.ceil(s/60*Number(process.argv[2])))}catch(e){console.log("")}' "$links" "$por" 2>/dev/null)"
  fi
  if [ -n "$r" ]; then
    REF_QTD="${r%% *}"
    REF_MB="${r#* }"
  else
    # Sem Node: soma duracao_s linha a linha (uma chave por linha no links.json formatado), sem regex.
    r="$(awk -v por="$por" 'index($0, "\"duracao_s\"") { split($0, a, ":"); s += a[2] + 0; n++ } END { m = s / 60 * por; c = int(m); if (c < m) c++; print n + 0, c }' "$links" 2>/dev/null)"
    [ -n "$r" ] || r="0 0"
    REF_QTD="${r%% *}"
    REF_MB="${r#* }"
  fi
}

tamanho_mb() {
  case "$1" in
    python) echo 160 ;;
    node) echo 190 ;;
    ffmpeg) echo 150 ;;
    baixador) echo 35 ;;
    montador) echo 500 ;;
    fala) echo 2000 ;;
    ouvido) echo 2400 ;;
    git) echo 350 ;;
    referencias) calcular_referencias; echo "$REF_MB" ;;
    *) echo 0 ;;
  esac
}

obrigatorio() {
  case "$1" in
    pasta|node|ffmpeg|montador) echo true ;;
    *) echo false ;;
  esac
}

segundo_plano_de() {
  case "$1" in
    fala|ouvido) echo true ;;
    *) echo false ;;
  esac
}

espaco_livre_gb() {
  df -Pk "$HOME" 2>/dev/null | awk 'NR==2 { printf "%.1f", $4 / 1048576 }'
}

memoria_gb() {
  local b
  b="$(sysctl -n hw.memsize 2>/dev/null)"
  [ -n "$b" ] || b=0
  awk -v b="$b" 'BEGIN { printf "%.0f", b / 1073741824 }'
}

menor_que() { awk -v a="$1" -v b="$2" 'BEGIN { exit !(a + 0 < b + 0) }'; }

nuvem_do_caminho() {
  local p="$1"
  case "$p" in
    *"/Library/Mobile Documents/"*) printf 'iCloud'; return ;;
    *"/Library/CloudStorage/OneDrive"*) printf 'OneDrive'; return ;;
    *"/Library/CloudStorage/Dropbox"*) printf 'Dropbox'; return ;;
    *"/Library/CloudStorage/GoogleDrive"*) printf 'Google Drive'; return ;;
    *"/Library/CloudStorage/"*) printf 'nuvem'; return ;;
  esac
  case "$p" in
    "$HOME/Desktop"|"$HOME/Desktop/"*|"$HOME/Documents"|"$HOME/Documents/"*)
      if [ -d "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Desktop" ] || [ -d "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Documents" ]; then
        printf 'iCloud'
      fi ;;
  esac
}

# ---------------------------------------------------------------- conferências

ffmpeg_completo() {
  local f e x
  [ -x "$FERR/bin/ffmpeg" ] || return 1
  rodar_bin "$FERR/bin/ffmpeg" -hide_banner -filters || return 1
  f="$RB_SAIDA"
  for x in zscale loudnorm ebur128 sidechaincompress afftdn; do
    case "$f" in
      *" $x "*) ;;
      *) echo "falta o filtro $x" >>"$LOG"; return 2 ;;
    esac
  done
  rodar_bin "$FERR/bin/ffmpeg" -hide_banner -encoders || return 1
  e="$RB_SAIDA"
  case "$e" in
    *" libx264 "*) ;;
    *) echo "falta o codificador libx264" >>"$LOG"; return 2 ;;
  esac
  [ -x "$FERR/bin/ffprobe" ] || return 1
  rodar_bin "$FERR/bin/ffprobe" -version || return 1
  return 0
}

versao_ffmpeg() {
  local l c
  l="$("$FERR/bin/ffmpeg" -version 2>/dev/null | head -n 1)"
  read -r _ _ c _ <<EOF
$l
EOF
  printf '%s' "${c%%-*}"
}

JS_DOCTOR='const fs=require("fs");let s=fs.readFileSync(process.argv[1],"utf8");const i=s.indexOf("{");if(i<0){console.log("sem-resposta");process.exit(0)}let j;try{j=JSON.parse(s.slice(i))}catch(e){console.log("sem-resposta");process.exit(0)}const precisa=["Node.js","FFmpeg","FFprobe","Chrome"];const ruins=precisa.filter(n=>{const c=(j.checks||[]).find(x=>x.name===n);return !c||!c.ok});console.log(ruins.length?ruins.join(","):"ok")'

JS_EARSHOT='const fs=require("fs");let s=fs.readFileSync(process.argv[1],"utf8");const i=s.indexOf("{");if(i<0){console.log("sem-resposta");process.exit(0)}try{const j=JSON.parse(s.slice(i));const p=j.problems||[];console.log(p.length?"problemas":"ok")}catch(e){console.log("sem-resposta")}'

JS_FALA='const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));console.log(j.pronto===true?("ok "+(j.modelo||"")):"falta")}catch(e){console.log("falta")}'

montador_ok() {
  local hf="$REPO/node_modules/hyperframes/bin/hyperframes.mjs" res
  if [ ! -x "$NODE_BIN" ] || [ ! -f "$hf" ]; then printf 'sem-montador'; return 1; fi
  preparar_tmp
  "$NODE_BIN" "$hf" doctor --json > "$TMPD/doctor.json" 2>>"$LOG"
  res="$("$NODE_BIN" -e "$JS_DOCTOR" "$TMPD/doctor.json" 2>>"$LOG")"
  printf '%s' "$res"
  [ "$res" = "ok" ]
}

earshot_ok() {
  local res
  if [ ! -x "$FERR/bin/earshot" ] || [ ! -x "$NODE_BIN" ]; then return 1; fi
  preparar_tmp
  "$FERR/bin/earshot" doctor --json > "$TMPD/earshot.json" 2>>"$LOG"
  res="$("$NODE_BIN" -e "$JS_EARSHOT" "$TMPD/earshot.json" 2>>"$LOG")"
  [ "$res" = "ok" ]
}

fala_ok() {
  local res
  if [ ! -f "$FERR/kit-fala.json" ] || [ ! -x "$NODE_BIN" ]; then return 1; fi
  res="$("$NODE_BIN" -e "$JS_FALA" "$FERR/kit-fala.json" 2>/dev/null)"
  case "$res" in
    "ok "*) FALA_MODELO="${res#ok }"; return 0 ;;
  esac
  return 1
}

# Conferência rápida (sem baixar nada), usada pelo plano e para pular passos prontos.
rapido_ok() {
  ler_estado "$1"
  case "$1" in
    pasta) [ -d "$FERR/bin" ] && [ -w "$FERR" ] ;;
    python) [ -x "$FERR/bin/uv" ] && [ -d "$FERR/python" ] && [ "$EST_ESTADO" = "pronto" ] ;;
    node) [ -x "$NODE_BIN" ] && [ "$("$NODE_BIN" -v 2>/dev/null)" = "v${V_NODE_VERSAO:-}" ] ;;
    ffmpeg) [ -x "$FERR/bin/ffmpeg" ] && [ -x "$FERR/bin/ffprobe" ] && [ "$EST_ESTADO" = "pronto" ] ;;
    baixador) [ -x "$FERR/bin/yt-dlp" ] && [ "$EST_ESTADO" = "pronto" ] ;;
    montador) [ -f "$REPO/node_modules/hyperframes/package.json" ] && [ "$EST_ESTADO" = "pronto" ] ;;
    fala) fala_ok ;;
    ouvido) [ -x "$FERR/bin/earshot" ] && [ "$EST_ESTADO" = "pronto" ] ;;
    referencias) [ "$EST_ESTADO" = "pronto" ] ;;
    atalho) [ -f "$ATALHO_ABRIR" ] ;;
    *) return 1 ;;
  esac
}

# ---------------------------------------------------------------- resultado dos passos

R_OK=0; R_COD=""; R_VER=""; R_DET=""; R_DADOS="{}"; R_EXTRA=""
falhou() { R_OK=0; R_COD="$1"; R_DET="${2:-}"; return 1; }
deu_certo() { R_OK=1; R_COD="${1:-INSTALADO}"; R_VER="${2:-}"; return 0; }
precisa() {
  # precisa <id> <condição já testada: 0/1>
  if [ "$2" != "0" ]; then
    R_OK=0; R_COD="FALTA_PASSO_ANTERIOR"; R_DADOS="{\"falta\":$(js "$1")}"
    diga "Antes deste passo falta instalar: $1."
    return 1
  fi
  return 0
}

# ---------------------------------------------------------------- passos

passo_pasta() {
  diga "Vou criar a pasta do estúdio. Os programas ficam todos nela. Nada fora dela é mexido."
  if ! mkdir -p "$FERR/bin" "$FERR/node" "$FERR/python" "$FERR/uv-tools" "$FERR/cache/uv" "$FERR/cache/hf" \
       "$FERR/cache/earshot" "$FERR/cache/hyperframes" "$FERR/cache/npm" "$LOGS" "$ESTADO" "$FERR/tmp" 2>/dev/null \
     || [ ! -w "$FERR" ]; then
    R_DADOS="{\"pasta\":$(js "$FERR")}"
    falhou PERMISSAO_NEGADA "$FERR"
    return 1
  fi
  preparar_log pasta
  # O zip da plataforma do curso pode perder o bit de execução: devolve aqui.
  chmod 755 "$REPO/estudio" "$REPO"/instalar/*.sh 2>/dev/null
  gravar_config
  diga "Pronto: pasta criada em $FERR."
  deu_certo INSTALADO ""
}

passo_python() {
  diga "Vou instalar o Python. Ele roda a parte que escuta a sua fala. Fica só na pasta do estúdio."
  local triple="x86_64-apple-darwin" uv="$FERR/bin/uv" base tem="" sha rc out
  [ "$ARQ" = "arm64" ] && triple="aarch64-apple-darwin"
  base="https://github.com/astral-sh/uv/releases/download/${V_UV_VERSAO:-}/uv-$triple.tar.gz"
  if [ -x "$uv" ] && rodar_bin "$uv" --version; then tem="$RB_SAIDA"; fi
  case "$tem" in
    "uv ${V_UV_VERSAO:-}"|"uv ${V_UV_VERSAO:-} "*) ;;
    *)
      diga "Baixando o instalador do Python (uns 15 MB)..."
      baixar "$base.sha256" "$TMPD/uv.sha256" || { R_DADOS='{"nome":"Python"}'; falhou DOWNLOAD_FALHOU; return 1; }
      sha="$(primeira_palavra "$TMPD/uv.sha256")"
      baixar "$base" "$TMPD/uv.tar.gz" "$sha"
      rc=$?
      if [ "$rc" != "0" ]; then R_DADOS='{"nome":"Python"}'; falhou "$(codigo_do_download "$rc")"; return 1; fi
      mkdir -p "$TMPD/uv"
      tar -xzf "$TMPD/uv.tar.gz" -C "$TMPD/uv" >>"$LOG" 2>&1 || { R_DADOS='{"nome":"Python"}'; falhou DOWNLOAD_FALHOU; return 1; }
      if ! copiar_bin "$TMPD/uv" uv || ! copiar_bin "$TMPD/uv" uvx; then
        R_DADOS='{"nome":"Python"}'; falhou DESCONHECIDO; return 1
      fi
      if ! rodar_bin "$uv" --version; then
        [ "$RB_BLOQUEADO" = "1" ] && { R_DADOS='{"nome":"Python"}'; falhou MAC_BLOQUEOU; return 1; }
        R_DADOS='{"nome":"Python"}'; falhou DESCONHECIDO; return 1
      fi ;;
  esac
  diga "Instalando o Python ${V_PYTHON_VERSAO:-3.12} (uns 30 MB)..."
  if ! (cd "$FERR" && "$uv" python install "${V_PYTHON_VERSAO:-3.12}" >>"$LOG" 2>&1); then
    diga "A internet oscilou. Vou tentar de novo."
    if ! (cd "$FERR" && "$uv" python install "${V_PYTHON_VERSAO:-3.12}" >>"$LOG" 2>&1); then
      R_DADOS='{"nome":"Python"}'; falhou DOWNLOAD_FALHOU; return 1
    fi
  fi
  diga "Conferindo o Python..."
  out="$(cd "$FERR" && "$uv" run --no-project --python "${V_PYTHON_VERSAO:-3.12}" python -c "import sys;print('ok', sys.version.split()[0])" 2>>"$LOG")"
  case "$out" in
    "ok "*) diga "Pronto: Python ${out#ok } instalado."; deu_certo INSTALADO "${out#ok }" ;;
    *) R_DADOS='{"nome":"Python"}'; falhou DESCONHECIDO ;;
  esac
}

passo_node() {
  diga "Vou instalar o Node. É o motor que monta os vídeos. Fica só na pasta do estúdio."
  local plat="darwin-x64" nome base sha rc v
  [ "$ARQ" = "arm64" ] && plat="darwin-arm64"
  nome="node-v${V_NODE_VERSAO:-}-$plat"
  base="https://nodejs.org/dist/v${V_NODE_VERSAO:-}"
  if [ -x "$NODE_BIN" ] && [ "$("$NODE_BIN" -v 2>/dev/null)" = "v${V_NODE_VERSAO:-}" ]; then
    :
  else
    diga "Baixando o Node (uns 50 MB)..."
    baixar "$base/SHASUMS256.txt" "$TMPD/node-sums.txt" || { R_DADOS='{"nome":"Node"}'; falhou DOWNLOAD_FALHOU; return 1; }
    sha="$(hash_na_lista "$TMPD/node-sums.txt" "$nome.tar.xz")" || { R_DADOS='{"nome":"Node"}'; falhou ARQUIVO_DIFERENTE; return 1; }
    baixar "$base/$nome.tar.xz" "$TMPD/node.tar.xz" "$sha"
    rc=$?
    if [ "$rc" != "0" ]; then R_DADOS='{"nome":"Node"}'; falhou "$(codigo_do_download "$rc")"; return 1; fi
    diga "Conferi: o arquivo chegou certinho. Abrindo..."
    mkdir -p "$TMPD/node"
    tar -xJf "$TMPD/node.tar.xz" -C "$TMPD/node" >>"$LOG" 2>&1 || { R_DADOS='{"nome":"Node"}'; falhou DOWNLOAD_FALHOU; return 1; }
    [ -d "$TMPD/node/$nome" ] || { R_DADOS='{"nome":"Node"}'; falhou DESCONHECIDO; return 1; }
    if [ -e "$FERR/node" ]; then mv "$FERR/node" "$TMPD/node-antigo" || { R_DADOS="{\"arquivo\":$(js "$FERR/node")}"; falhou ARQUIVO_EM_USO; return 1; }; fi
    mv "$TMPD/node/$nome" "$FERR/node" || { R_DADOS="{\"pasta\":$(js "$FERR")}"; falhou PERMISSAO_NEGADA; return 1; }
  fi
  if ! rodar_bin "$NODE_BIN" -v; then
    [ "$RB_BLOQUEADO" = "1" ] && { R_DADOS='{"nome":"Node"}'; falhou MAC_BLOQUEOU; return 1; }
    R_DADOS='{"nome":"Node"}'; falhou DESCONHECIDO; return 1
  fi
  v="$RB_SAIDA"
  case "$v" in
    v24.*) ;;
    *) R_DADOS='{"nome":"Node"}'; falhou DESCONHECIDO "versao $v"; return 1 ;;
  esac
  [ -f "$FERR/node/bin/npm" ] || { R_DADOS='{"nome":"Node"}'; falhou DESCONHECIDO "sem npm"; return 1; }
  diga "Pronto: Node $v instalado."
  deu_certo INSTALADO "$v"
}

instalar_ffmpeg_mac() {
  # instalar_ffmpeg_mac <url do ffmpeg.zip> <sha do ffmpeg> <sha do ffprobe>
  local url="$1" urlp rc
  urlp="${url%ffmpeg.zip}ffprobe.zip"
  # Programa executável nunca entra sem conferência de SHA256.
  if [ -z "$2" ] || [ -z "$3" ]; then IF_COD=ARQUIVO_DIFERENTE; return 1; fi
  diga "Baixando a tesoura de vídeo (uns 40 MB)..."
  baixar "$url" "$TMPD/ffmpeg.zip" "$2"
  rc=$?
  [ "$rc" = "0" ] || { IF_COD="$(codigo_do_download "$rc")"; return 1; }
  baixar "$urlp" "$TMPD/ffprobe.zip" "$3"
  rc=$?
  [ "$rc" = "0" ] || { IF_COD="$(codigo_do_download "$rc")"; return 1; }
  rm -rf "$TMPD/ff"
  mkdir -p "$TMPD/ff"
  unzip -q -o "$TMPD/ffmpeg.zip" -d "$TMPD/ff" >>"$LOG" 2>&1 || { IF_COD=DOWNLOAD_FALHOU; return 1; }
  unzip -q -o "$TMPD/ffprobe.zip" -d "$TMPD/ff" >>"$LOG" 2>&1 || { IF_COD=DOWNLOAD_FALHOU; return 1; }
  if ! copiar_bin "$TMPD/ff" ffmpeg || ! copiar_bin "$TMPD/ff" ffprobe; then IF_COD=DESCONHECIDO; return 1; fi
  return 0
}

passo_ffmpeg() {
  diga "Vou instalar o FFmpeg, a tesoura que corta o vídeo e acerta o som."
  local rc url s1 s2 ultimo="DOWNLOAD_FALHOU" tentativa
  ffmpeg_completo
  rc=$?
  if [ "$rc" = "0" ]; then
    diga "A tesoura já estava instalada e completa."
    deu_certo INSTALADO "$(versao_ffmpeg)"
    return 0
  fi
  for tentativa in principal reserva; do
    if [ "$ARQ" = "arm64" ]; then
      if [ "$tentativa" = "principal" ]; then url="${V_FFMPEG_MAC_URL_ARM64:-}"; s1="${V_FFMPEG_MAC_SHA256_ARM64:-}"; s2="${V_FFPROBE_MAC_SHA256_ARM64:-}"
      else url="${V_FFMPEG_MAC_RESERVA_ARM64:-}"; s1="${V_FFMPEG_MAC_RESERVA_SHA256_ARM64:-}"; s2="${V_FFPROBE_MAC_RESERVA_SHA256_ARM64:-}"; fi
    else
      if [ "$tentativa" = "principal" ]; then url="${V_FFMPEG_MAC_URL_X64:-}"; s1="${V_FFMPEG_MAC_SHA256_X64:-}"; s2="${V_FFPROBE_MAC_SHA256_X64:-}"
      else url="${V_FFMPEG_MAC_RESERVA_X64:-}"; s1="${V_FFMPEG_MAC_RESERVA_SHA256_X64:-}"; s2="${V_FFPROBE_MAC_RESERVA_SHA256_X64:-}"; fi
    fi
    [ -n "$url" ] || continue
    [ "$tentativa" = "reserva" ] && diga "Vou baixar outra versão da tesoura."
    IF_COD=""
    if ! instalar_ffmpeg_mac "$url" "$s1" "$s2"; then
      ultimo="${IF_COD:-DOWNLOAD_FALHOU}"
      continue
    fi
    diga "Conferindo se a tesoura veio com todas as peças..."
    ffmpeg_completo
    rc=$?
    if [ "$rc" = "0" ]; then
      diga "Pronto: FFmpeg $(versao_ffmpeg) instalado."
      deu_certo INSTALADO "$(versao_ffmpeg)"
      return 0
    fi
    if [ "$RB_BLOQUEADO" = "1" ]; then ultimo="MAC_BLOQUEOU"
    elif [ "$rc" = "2" ]; then ultimo="FFMPEG_INCOMPLETO"; diga "A tesoura de vídeo veio sem uma peça que eu preciso."
    else ultimo="DESCONHECIDO"; fi
  done
  R_DADOS='{"nome":"FFmpeg"}'
  falhou "$ultimo"
}

passo_baixador() {
  diga "Vou instalar o baixador de vídeos. Ele traz os vídeos de exemplo para você estudar."
  local base sha rc v
  base="https://github.com/yt-dlp/yt-dlp/releases/download/${V_YTDLP_VERSAO:-}"
  v=""
  if [ -x "$FERR/bin/yt-dlp" ] && rodar_bin "$FERR/bin/yt-dlp" --version; then v="$RB_SAIDA"; fi
  if [ "$v" != "${V_YTDLP_VERSAO:-}" ]; then
    diga "Baixando o baixador de vídeos (uns 35 MB)..."
    baixar "$base/SHA2-256SUMS" "$TMPD/ytdlp-sums.txt" || { R_DADOS='{"nome":"baixador de vídeos"}'; falhou DOWNLOAD_FALHOU; return 1; }
    sha="$(hash_na_lista "$TMPD/ytdlp-sums.txt" "yt-dlp_macos")" || { R_DADOS='{"nome":"baixador de vídeos"}'; falhou ARQUIVO_DIFERENTE; return 1; }
    baixar "$base/yt-dlp_macos" "$TMPD/yt-dlp" "$sha"
    rc=$?
    if [ "$rc" != "0" ]; then R_DADOS='{"nome":"baixador de vídeos"}'; falhou "$(codigo_do_download "$rc")"; return 1; fi
    cp -f "$TMPD/yt-dlp" "$FERR/bin/yt-dlp" && chmod 755 "$FERR/bin/yt-dlp"
    xattr -d com.apple.quarantine "$FERR/bin/yt-dlp" >/dev/null 2>&1
    if ! rodar_bin "$FERR/bin/yt-dlp" --version; then
      [ "$RB_BLOQUEADO" = "1" ] && { R_DADOS='{"nome":"baixador de vídeos"}'; falhou MAC_BLOQUEOU; return 1; }
      # Na área protegida do Codex o baixador não consegue criar o semáforo de que precisa.
      if [ -n "${CODEX_SANDBOX:-}" ] || grep -qF 'semctl: Operation not permitted' "$LOG" 2>/dev/null; then
        R_DADOS='{"nome":"baixador de vídeos"}'; falhou AREA_PROTEGIDA; return 1
      fi
      R_DADOS='{"nome":"baixador de vídeos"}'; falhou DESCONHECIDO; return 1
    fi
    v="$RB_SAIDA"
  fi
  # O yt-dlp lê este arquivo como o shell (shlex): aspas simples protegem espaço no caminho.
  printf -- '--js-runtimes %s\n' "$(aspas "node:$NODE_BIN")" > "$FERR/yt-dlp.conf"
  diga "Pronto: baixador de vídeos $v instalado."
  deu_certo INSTALADO "$v"
}

passo_montador() {
  diga "Vou instalar o montador de vídeo. Ele desenha as telas e monta o Reel."
  diga "Ele vem com um navegador escondido, que não mexe no seu Chrome."
  local npm="$FERR/node/bin/npm" hf="$REPO/node_modules/hyperframes/bin/hyperframes.mjs" tent ok=0 res v
  [ -x "$NODE_BIN" ] && [ -f "$npm" ]
  precisa node $? || return 1
  [ -x "$FERR/bin/ffmpeg" ]
  precisa ffmpeg $? || return 1
  # Versões fixas de toda a árvore: só "npm ci" com o package-lock.json que vem no estúdio.
  if [ ! -f "$REPO/package-lock.json" ]; then falhou MONTADOR_FALHOU "sem package-lock.json"; return 1; fi
  for tent in 1 2; do
    diga "Baixando as peças do montador (uns 150 MB). Pode levar alguns minutos..."
    if (cd "$REPO" && "$npm" ci --no-audit --no-fund >>"$LOG" 2>&1); then ok=1; break; fi
    [ "$tent" = "1" ] && diga "O montador de vídeo não ficou pronto. Vou instalar de novo."
  done
  if [ "$ok" != "1" ] || [ ! -f "$hf" ]; then falhou MONTADOR_FALHOU; return 1; fi
  diga "Baixando o navegador escondido (uns 150 MB)..."
  if ! "$NODE_BIN" "$hf" browser ensure >>"$LOG" 2>&1; then
    diga "O navegador escondido não baixou. Vou tentar de novo."
    "$NODE_BIN" "$hf" browser ensure --force >>"$LOG" 2>&1 || { falhou NAVEGADOR_FALHOU; return 1; }
  fi
  diga "Conferindo o montador..."
  res="$(montador_ok)"
  if [ "$res" != "ok" ]; then
    case "$res" in
      *Chrome*) falhou NAVEGADOR_FALHOU "$res" ;;
      *) falhou MONTADOR_FALHOU "$res" ;;
    esac
    return 1
  fi
  v="$("$NODE_BIN" -e 'console.log(require(process.argv[1]).version)' "$REPO/node_modules/hyperframes/package.json" 2>/dev/null)"
  diga "Pronto: montador de vídeo $v instalado."
  deu_certo INSTALADO "$v"
}

passo_fala() {
  diga "Vou instalar o ouvido de texto. Ele escuta a sua fala e escreve a legenda, palavra por palavra."
  diga "É grande (uns 2 GB). Pode levar uns minutos."
  local uv="$FERR/bin/uv" saida ult ok
  [ -x "$uv" ]
  precisa python $? || return 1
  [ -x "$NODE_BIN" ]
  precisa node $? || return 1
  progresso "instalando o programa"
  local args=(sync --project "$REPO" --no-dev)
  [ -f "$REPO/uv.lock" ] && args+=(--frozen)
  if ! (cd "$REPO" && "$uv" "${args[@]}" >>"$LOG" 2>&1); then
    diga "O ouvido de texto não terminou de instalar. Vou tentar de novo."
    (cd "$REPO" && "$uv" "${args[@]}" >>"$LOG" 2>&1) || { falhou FALA_FALHOU; return 1; }
  fi
  progresso "baixando o modelo de fala"
  diga "Baixando o modelo que entende português..."
  saida="$("$REPO/estudio" preparar-fala --modelo auto 2>>"$LOG")"
  printf '%s\n' "$saida" >>"$LOG"
  ult="$(ultima_linha "$saida")"
  ok="$(jcampo "$ult" ok)"
  if [ "$ok" != "true" ]; then
    diga "O modelo não terminou de baixar. Vou tentar de novo."
    saida="$("$REPO/estudio" preparar-fala --modelo auto 2>>"$LOG")"
    printf '%s\n' "$saida" >>"$LOG"
  fi
  FALA_MODELO=""
  if fala_ok; then
    diga "Pronto: ouvido de texto instalado (modelo $FALA_MODELO)."
    deu_certo INSTALADO "$FALA_MODELO"
  else
    falhou FALA_FALHOU
  fi
}

passo_ouvido() {
  if [ "$ARQ" = "x64" ]; then
    diga "O ouvido de som não existe para Mac Intel. O vídeo sai igual."
    R_DADOS='{"tipo":"Mac Intel"}'
    R_OK=1; R_COD="OUVIDO_NAO_SUPORTADO"
    return 0
  fi
  diga "Vou instalar o ouvido de som. Ele escuta o vídeo pronto e avisa se a música está alta ou se o som sumiu."
  diga "É grande (uns 2,4 GB). Pode levar uns minutos."
  local uv="$FERR/bin/uv" spec extra=()
  [ -x "$uv" ]
  precisa python $? || return 1
  spec="earshot @ https://github.com/Leonxlnx/earshot/archive/${V_EARSHOT_COMMIT:-}.zip"
  [ "$MAC_MAIOR" = "13" ] && extra=(--with "torch>=2.6,<2.10")
  progresso "instalando o programa"
  if ! (cd "$FERR" && "$uv" tool install --python "${V_PYTHON_VERSAO:-3.12}" ${extra[@]+"${extra[@]}"} "$spec" >>"$LOG" 2>&1); then
    diga "O ouvido de som não instalou de primeira. Vou tentar de novo."
    (cd "$FERR" && "$uv" tool install --force --python "${V_PYTHON_VERSAO:-3.12}" ${extra[@]+"${extra[@]}"} "$spec" >>"$LOG" 2>&1) || { falhou OUVIDO_FALHOU; return 1; }
  fi
  progresso "baixando os modelos de som"
  diga "Baixando os modelos do ouvido de som (uns 1,1 GB)..."
  if ! "$FERR/bin/earshot" doctor --fetch >>"$LOG" 2>&1; then
    "$FERR/bin/earshot" doctor --fetch >>"$LOG" 2>&1
  fi
  diga "Conferindo o ouvido de som..."
  if earshot_ok; then
    diga "Pronto: ouvido de som instalado."
    deu_certo INSTALADO "${V_EARSHOT_COMMIT:0:7}"
  else
    "$FERR/bin/earshot" doctor --fetch >>"$LOG" 2>&1
    if earshot_ok; then deu_certo INSTALADO "${V_EARSHOT_COMMIT:0:7}"; else falhou OUVIDO_FALHOU; fi
  fi
}

passo_git() {
  diga "O Git só é oferecido no Windows. No Mac não precisa."
  R_OK=1; R_COD="NAO_SE_APLICA"
}

passo_referencias() {
  diga "Vou baixar os vídeos de exemplo para a pasta 1-referencias. Eles ficam só no seu computador."
  local saida ult ok cod
  [ -x "$NODE_BIN" ]
  precisa node $? || return 1
  [ -x "$FERR/bin/yt-dlp" ]
  precisa baixador $? || return 1
  saida="$("$REPO/estudio" referencias --baixar-exemplos 2>>"$LOG")"
  printf '%s\n' "$saida" >>"$LOG"
  ult="$(ultima_linha "$saida")"
  json_valido "$ult" && R_EXTRA=",\"origem\":\"kit\",\"kit\":$ult"
  ok="$(jcampo "$ult" ok)"
  if [ "$ok" = "true" ]; then
    diga "Pronto: vídeos de exemplo baixados."
    deu_certo INSTALADO ""
  else
    cod="$(jcampo "$ult" codigo)"
    falhou "${cod:-DESCONHECIDO}"
  fi
}

# Caminho absoluto do agente, achado aqui dentro da sessão (onde ele já funciona). Vazio se não achar.
caminho_do_agente() {
  local c
  c="$(command -v "$1" 2>/dev/null)"
  case "$c" in
    /*) [ -x "$c" ] && printf '%s' "$c" ;;
  esac
}

# Falha ao gravar na Mesa: no Mac quase sempre é a janela de privacidade que a pessoa negou.
falha_na_mesa() {
  R_DADOS="{\"pasta\":$(js "$MESA")}"
  if [ -d "$MESA" ]; then falhou ATALHO_NEGADO_PELO_MAC; else falhou PERMISSAO_NEGADA; fi
  return 1
}

passo_atalho() {
  ler_config
  local agente="${CFG_AGENTE:-claude}" nome abs t
  [ -n "$AGENTE" ] && agente="$AGENTE"
  nome="Claude"
  [ "$agente" = "codex" ] && nome="Codex"
  abs="$(caminho_do_agente "$agente")"
  diga "Vou pôr dois atalhos na sua Área de Trabalho: \"Abrir o Estúdio\", que abre o $nome já na pasta certa, e \"Estúdio de Reels\", que abre a pasta dos seus vídeos."
  diga "O Mac pode perguntar se o Terminal pode mexer na sua Mesa. Clique em Permitir."
  t="$ATALHO_ABRIR.$$"
  # O caminho absoluto vem primeiro; a busca no PATH fica só como reserva.
  # shellcheck disable=SC2016 # as linhas entre aspas simples são o texto do atalho, de propósito
  if ! {
    printf '%s\n' '#!/bin/zsh -l' \
      '# Abre o Estúdio de Reels. Criado pelo instalador do estúdio.' \
      "cd $(aspas "$REPO") || { echo 'Não achei a pasta do estúdio.'; read -r _; exit 1; }" \
      "AGENTE=$(aspas "$abs")" \
      "NODE_DIR=$(aspas "$(dirname "$(command -v node 2>/dev/null || echo /usr/bin/node)")")" \
      'if [ -n "$AGENTE" ] && [ -x "$AGENTE" ]; then export PATH="$(dirname "$AGENTE"):$NODE_DIR:$PATH"; exec "$AGENTE"; fi' \
      'export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"' \
      "if command -v $agente >/dev/null 2>&1; then exec $agente; fi" \
      "echo 'Não achei o $nome neste computador. Abra o $nome do jeito que abriu no primeiro dia.'" \
      'read -r _'
  } > "$t" 2>>"$LOG"; then
    rm -f "$t" 2>/dev/null
    falha_na_mesa
    return 1
  fi
  if ! mv -f "$t" "$ATALHO_ABRIR" 2>>"$LOG"; then rm -f "$t" 2>/dev/null; falha_na_mesa; return 1; fi
  chmod 755 "$ATALHO_ABRIR"
  # Atalho para a pasta do estúdio: um link na Mesa. Nunca troca uma pasta de verdade com o mesmo nome.
  if [ -L "$ATALHO_PASTA" ] || [ ! -e "$ATALHO_PASTA" ]; then
    ln -sfn "$REPO" "$ATALHO_PASTA" 2>>"$LOG" || R_DET="sem atalho da pasta"
  else
    R_DET="já existe algo chamado Estúdio de Reels na Mesa"
  fi
  R_DADOS="{\"atalho\":$(js "$ATALHO_ABRIR"),\"atalho_pasta\":$(js "$ATALHO_PASTA"),\"agente_caminho\":$(js "$abs")}"
  diga "Pronto: atalhos criados."
  deu_certo INSTALADO ""
}

passo_pastas() {
  local p
  diga "Vou abrir as suas 3 pastas."
  for p in 1-referencias 2-videos-brutos 3-videos-prontos; do
    mkdir -p "$REPO/$p" || { R_DADOS="{\"pasta\":$(js "$REPO/$p")}"; falhou PERMISSAO_NEGADA; return 1; }
  done
  for p in 3-videos-prontos 2-videos-brutos 1-referencias; do
    open "$REPO/$p" >>"$LOG" 2>&1 || R_DET="nao abriu $p"
  done
  deu_certo INSTALADO ""
}

# ---------------------------------------------------------------- ações

saida_passo() {
  local saida_codigo=1
  [ "$R_OK" = "1" ] && saida_codigo=0
  printf '{"passo":%s,"ok":%s,"codigo":%s,"versao":%s,"detalhe":%s,"dados":%s%s}\n' \
    "$(js "$1")" "$(jbool "$R_OK")" "$(js "$R_COD")" "$(js "$R_VER")" "$(js "$R_DET")" "$R_DADOS" "$R_EXTRA"
  exit "$saida_codigo"
}

acao_passo() {
  local id="$1" anterior
  PASSO_ATUAL="$id"
  R_OK=0; R_COD="DESCONHECIDO"; R_VER=""; R_DET=""; R_DADOS="{}"; R_EXTRA=""
  case " $PASSOS_MAC git " in
    *" $id "*) ;;
    *) R_COD="PASSO_DESCONHECIDO"; R_DET="$id"; saida_passo "$id" ;;
  esac
  if [ "$id" != "pasta" ] && [ ! -d "$ESTADO" ]; then
    R_COD="FALTA_PASSO_ANTERIOR"; R_DADOS='{"falta":"pasta"}'
    saida_passo "$id"
  fi
  [ "$id" != "pasta" ] && { preparar_log "$id"; gravar_config; }
  ler_estado "$id"
  anterior="$EST_ESTADO"
  case "$id" in
    pastas|atalho|git) ;;
    *)
      if [ "$anterior" = "pronto" ] && rapido_ok "$id"; then
        diga "Já estava pronto. Não precisa baixar de novo."
        R_OK=1; R_COD="JA_PRONTO"; R_VER="$EST_VERSAO"
        saida_passo "$id"
      fi ;;
  esac
  if [ -d "$ESTADO" ]; then
    printf '%s' "$$" > "$ESTADO/$id.pid" 2>/dev/null
    gravar_estado "$id" rodando "" "começando" ""
  fi
  preparar_tmp
  case "$id" in
    pasta) passo_pasta ;;
    python) passo_python ;;
    node) passo_node ;;
    ffmpeg) passo_ffmpeg ;;
    baixador) passo_baixador ;;
    montador) passo_montador ;;
    fala) passo_fala ;;
    ouvido) passo_ouvido ;;
    git) passo_git ;;
    referencias) passo_referencias ;;
    atalho) passo_atalho ;;
    pastas) passo_pastas ;;
  esac
  if [ "$R_OK" = "1" ]; then
    if [ "$R_COD" = "OUVIDO_NAO_SUPORTADO" ]; then
      gravar_estado "$id" nao_suportado "$R_COD" "não existe para este computador" ""
    else
      gravar_estado "$id" pronto "$R_COD" "pronto" "$R_VER"
    fi
  else
    gravar_estado "$id" erro "$R_COD" "parou" "$R_VER"
    [ "$LOG" != "/dev/null" ] && diga "Não deu certo ($R_COD). Detalhes guardados em $LOG."
  fi
  rm -f "$ESTADO/$id.pid" 2>/dev/null
  saida_passo "$id"
}

acao_checar() {
  local probs="" ok=1 livre mem net=1 nuvem prontos_mb=0 id necessario
  add_prob() { [ -n "$probs" ] && probs="$probs,"; probs="$probs{\"codigo\":\"$1\",\"tipo\":\"$2\",\"dados\":$3}"; }
  diga "Olhando o computador, sem instalar nada..."
  # Se o zip foi descompactado por um programa que perde a marca de executável, devolve aqui.
  chmod 755 "$REPO/estudio" "$REPO"/instalar/*.sh 2>/dev/null

  if [ -z "$MAC_MAIOR" ] || menor_que "$MAC_MAIOR.$(printf '%02d' "${MAC_MENOR:-0}" 2>/dev/null)" "$(minimo_mac_decimal)"; then
    add_prob SISTEMA_ANTIGO bloqueia "{\"versao\":$(js "macOS ${VERSAO_SO:-desconhecido}"),\"minimo\":$(js "macOS ${V_MAC_MINIMO:-13.5}")}"
    ok=0
  fi

  for id in $PASSOS_MAC; do
    if rapido_ok "$id"; then prontos_mb=$((prontos_mb + $(tamanho_mb "$id"))); fi
  done
  necessario="$(awk -v m="${V_ESPACO_MINIMO_GB:-12}" -v p="$prontos_mb" -v v="${V_ESPACO_MINIMO_VERIFICAR_GB:-2}" 'BEGIN { n = m - p / 1024; if (n < v) n = v; printf "%.1f", n }')"
  livre="$(espaco_livre_gb)"
  [ -n "$livre" ] || livre=0
  if menor_que "$livre" "$necessario"; then
    add_prob POUCO_ESPACO bloqueia "{\"livre_gb\":$livre,\"precisa_gb\":$necessario}"
    ok=0
  fi

  mem="$(memoria_gb)"
  if menor_que "$mem" "${V_MEMORIA_MINIMA_GB:-8}"; then
    add_prob POUCA_MEMORIA aviso "{\"memoria_gb\":$mem}"
  fi

  testar_internet
  if [ "$NET_COD" != "" ]; then
    net=0
    add_prob "$NET_COD" bloqueia "{}"
    ok=0
  fi

  nuvem="$(nuvem_do_caminho "$REPO")"
  if [ -n "$nuvem" ]; then
    add_prob PASTA_NA_NUVEM acao "{\"nuvem\":$(js "$nuvem"),\"caminho\":$(js "$HOME/estudio-de-reels"),\"acao\":\"mudar-pasta\"}"
    ok=0
  fi

  if [ "$ARQ" = "x64" ]; then
    add_prob MAC_INTEL_PRAZO aviso "{}"
  fi

  printf '{"acao":"checar","ok":%s,"sistema":"mac","arquitetura":%s,"versao_sistema":%s,"nome_sistema":%s,"espaco_gb":%s,"memoria_gb":%s,"internet":%s,"repo_dir":%s,"ferramentas_dir":%s,"problemas":[%s]}\n' \
    "$(jbool "$ok")" "$(js "$ARQ")" "$(js "$VERSAO_SO")" "$(js "$(nome_sistema)")" "$livre" "$mem" "$(jbool "$net")" "$(js "$REPO")" "$(js "$FERR")" "$probs"
  [ "$ok" = "1" ] && exit 0
  exit 1
}

# Internet: NET_COD vazio (ok), SEM_INTERNET ou INTERNET_BLOQUEADA_PELA_CAIXA.
# Caixa = o endereço foi achado (o curl chegou a tentar conectar, código 7) mas o sistema negou a conexão.
# É o que a área protegida do Codex faz; aí o certo é pedir internet ao Codex, não culpar o Wi-Fi.
NET_COD=""
testar_internet() {
  local erro rc
  NET_COD=""
  erro="$(curl -fsSI --max-time 10 https://nodejs.org/dist/ 2>&1 >/dev/null)"
  rc=$?
  [ "$rc" = "0" ] && return 0
  printf 'internet: curl %s %s\n' "$rc" "$erro" >>"$LOG" 2>/dev/null
  if [ "${CODEX_SANDBOX_NETWORK_DISABLED:-}" = "1" ]; then NET_COD="INTERNET_BLOQUEADA_PELA_CAIXA"; return 1; fi
  if [ "$rc" = "7" ]; then
    case "$erro" in
      *"not permitted"*|*"Permission denied"*) NET_COD="INTERNET_BLOQUEADA_PELA_CAIXA"; return 1 ;;
    esac
  fi
  NET_COD="SEM_INTERNET"
  return 1
}

minimo_mac_decimal() {
  local m="${V_MAC_MINIMO:-13.5}" maior menor
  maior="${m%%.*}"
  menor="${m#*.}"
  [ "$menor" = "$m" ] && menor=0
  printf '%s.%02d' "$maior" "$menor"
}

nome_sistema() {
  if [ "$ARQ" = "arm64" ]; then printf 'Mac com chip Apple'; else printf 'Mac Intel'; fi
}

# Número de cada programa na lista do I-03 ("{{i}} de {{n}}"). Pasta, atalho, vídeos de exemplo e pastas não têm número.
numero_do_programa() {
  case "$1" in
    python) echo 1 ;; node) echo 2 ;; ffmpeg) echo 3 ;; baixador) echo 4 ;;
    montador) echo 5 ;; fala) echo 6 ;; ouvido) echo 7 ;;
    *) echo 0 ;;
  esac
}

acao_plano() {
  local id est itens=""
  for id in $PASSOS_MAC; do
    est="falta"
    if [ "$id" = "ouvido" ] && [ "$ARQ" = "x64" ]; then
      est="nao_suportado"
    else
      ler_estado "$id"
      case "$id" in
        pasta|node|fala|atalho) rapido_ok "$id" && est="pronto" ;;
        pastas) [ "$EST_ESTADO" = "pronto" ] && est="pronto" ;;
        *) [ "$EST_ESTADO" = "pronto" ] && rapido_ok "$id" && est="pronto" ;;
      esac
      [ "$EST_ESTADO" = "rodando" ] && [ "$est" != "pronto" ] && est="rodando"
    fi
    [ -n "$itens" ] && itens="$itens,"
    itens="$itens{\"id\":$(js "$id"),\"estado\":$(js "$est"),\"obrigatorio\":$(obrigatorio "$id"),\"tamanho_mb\":$(tamanho_mb "$id"),\"segundo_plano\":$(segundo_plano_de "$id"),\"numero\":$(numero_do_programa "$id")}"
  done
  printf '{"acao":"plano","sistema":"mac","arquitetura":%s,"total_programas":7,"passos":[%s]}\n' "$(js "$ARQ")" "$itens"
  exit 0
}

pid_vivo() { [ -n "$1" ] && kill -0 "$1" 2>/dev/null; }

acao_segundo_plano() {
  local id="$1" pid="" logf
  case "$id" in
    fala|ouvido) ;;
    *) printf '{"passo":%s,"iniciado":false,"log":"","codigo":"PASSO_DESCONHECIDO"}\n' "$(js "$id")"; exit 1 ;;
  esac
  if [ ! -d "$ESTADO" ]; then
    printf '{"passo":%s,"iniciado":false,"log":"","codigo":"FALTA_PASSO_ANTERIOR","dados":{"falta":"pasta"}}\n' "$(js "$id")"
    exit 1
  fi
  mkdir -p "$LOGS"
  logf="$LOGS/$id-segundo-plano.log"
  ler_estado "$id"
  [ -f "$ESTADO/$id.pid" ] && pid="$(cat "$ESTADO/$id.pid" 2>/dev/null)"
  if [ "$EST_ESTADO" = "rodando" ] && pid_vivo "$pid"; then
    printf '{"passo":%s,"iniciado":true,"ja_rodando":true,"log":%s}\n' "$(js "$id")" "$(js "$logf")"
    exit 0
  fi
  if [ "$EST_ESTADO" = "pronto" ] && rapido_ok "$id"; then
    printf '{"passo":%s,"iniciado":true,"ja_pronto":true,"log":%s}\n' "$(js "$id")" "$(js "$logf")"
    exit 0
  fi
  if [ "$id" = "ouvido" ] && [ "$ARQ" = "x64" ]; then
    gravar_estado "$id" nao_suportado "OUVIDO_NAO_SUPORTADO" "não existe para este computador" ""
    printf '{"passo":%s,"iniciado":true,"ja_pronto":true,"codigo":"OUVIDO_NAO_SUPORTADO","log":%s}\n' "$(js "$id")" "$(js "$logf")"
    exit 0
  fi
  gravar_config
  gravar_estado "$id" rodando "" "começando" ""
  if [ -n "$AGENTE" ]; then
    nohup bash "$REPO/instalar/instalar.sh" passo "$id" --agente "$AGENTE" >"$logf" 2>&1 </dev/null &
  else
    nohup bash "$REPO/instalar/instalar.sh" passo "$id" >"$logf" 2>&1 </dev/null &
  fi
  pid=$!
  disown "$pid" 2>/dev/null
  printf '%s' "$pid" > "$ESTADO/$id.pid"
  sleep 2
  ler_estado "$id"
  if pid_vivo "$pid" || [ "$EST_ESTADO" = "pronto" ] || [ "$EST_ESTADO" = "nao_suportado" ]; then
    printf '{"passo":%s,"iniciado":true,"log":%s}\n' "$(js "$id")" "$(js "$logf")"
    exit 0
  fi
  printf '{"passo":%s,"iniciado":false,"log":%s}\n' "$(js "$id")" "$(js "$logf")"
  exit 1
}

acao_status() {
  local id="$1" pid="" cod
  if [ ! -f "$ESTADO/$id.json" ]; then
    printf '{"passo":%s,"estado":"falta","codigo":"","progresso":""}\n' "$(js "$id")"
    exit 0
  fi
  ler_estado "$id"
  [ -f "$ESTADO/$id.pid" ] && pid="$(cat "$ESTADO/$id.pid" 2>/dev/null)"
  if [ "$EST_ESTADO" = "rodando" ] && ! pid_vivo "$pid"; then
    cod="DESCONHECIDO"
    [ "$id" = "fala" ] && cod="FALA_FALHOU"
    [ "$id" = "ouvido" ] && cod="OUVIDO_FALHOU"
    gravar_estado "$id" erro "$cod" "parou no meio" ""
    rm -f "$ESTADO/$id.pid"
  fi
  tail -n 1 "$ESTADO/$id.json"
  exit 0
}

acao_verificar() {
  local itens="" total=0 prontos=0 v t res livre obrig=1 ouvido_disp=0 kit_saida kit_ult kit_ok
  add_item() {
    # add_item <id> <ok 1/0> <texto> [codigo] [extra json]
    total=$((total + 1))
    [ "$2" = "1" ] && prontos=$((prontos + 1))
    [ -n "$itens" ] && itens="$itens,"
    itens="$itens{\"id\":$(js "$1"),\"ok\":$(jbool "$2"),\"texto\":$(js "$3")"
    case "$1" in
      node|npm) itens="$itens,\"passo\":\"node\"" ;;
      uv|python) itens="$itens,\"passo\":\"python\"" ;;
      ffmpeg|ffprobe) itens="$itens,\"passo\":\"ffmpeg\"" ;;
      baixador|montador|fala|ouvido) itens="$itens,\"passo\":\"$1\"" ;;
    esac
    [ -n "${4:-}" ] && itens="$itens,\"codigo\":$(js "$4")"
    [ -n "${5:-}" ] && itens="$itens,$5"
    itens="$itens}"
  }
  preparar_log verificar
  preparar_tmp
  diga "Conferindo cada programa do estúdio..."

  v="$("$NODE_BIN" -v 2>/dev/null)"
  case "$v" in v24.*) add_item node 1 "Motor de vídeo (Node $v)" ;; *) add_item node 0 "Motor de vídeo (Node)" FALTA_INSTALAR; obrig=0 ;; esac

  v="$("$FERR/node/bin/npm" -v 2>/dev/null)"
  if [ -n "$v" ]; then add_item npm 1 "Ajudante do motor (npm $v)"; else add_item npm 0 "Ajudante do motor (npm)" FALTA_INSTALAR; obrig=0; fi

  v="$("$FERR/bin/uv" --version 2>/dev/null)"
  if [ -n "$v" ]; then add_item uv 1 "Instalador do Python ($v)"; else add_item uv 0 "Instalador do Python (uv)" FALTA_INSTALAR; fi

  v="$(cd "$FERR" 2>/dev/null && "$FERR/bin/uv" run --no-project --python "${V_PYTHON_VERSAO:-3.12}" python -c "import sys;print('ok', sys.version.split()[0])" 2>/dev/null)"
  case "$v" in "ok "*) add_item python 1 "Python ${v#ok }" ;; *) add_item python 0 "Python" FALTA_INSTALAR ;; esac

  ffmpeg_completo
  res=$?
  if [ "$res" = "0" ]; then add_item ffmpeg 1 "Tesoura de vídeo (FFmpeg $(versao_ffmpeg))"
  elif [ "$res" = "2" ]; then add_item ffmpeg 0 "Tesoura de vídeo (FFmpeg) sem uma peça" FFMPEG_INCOMPLETO; obrig=0
  else add_item ffmpeg 0 "Tesoura de vídeo (FFmpeg)" FALTA_INSTALAR; obrig=0; fi

  if "$FERR/bin/ffprobe" -version >/dev/null 2>&1; then add_item ffprobe 1 "Medidor de vídeo (FFprobe)"; else add_item ffprobe 0 "Medidor de vídeo (FFprobe)" FALTA_INSTALAR; obrig=0; fi

  v="$("$FERR/bin/yt-dlp" --version 2>/dev/null)"
  if [ -n "$v" ]; then add_item baixador 1 "Baixador de vídeos ($v)"; else add_item baixador 0 "Baixador de vídeos" FALTA_INSTALAR; fi

  res="$(montador_ok)"
  if [ "$res" = "ok" ]; then
    v="$("$NODE_BIN" -e 'console.log(require(process.argv[1]).version)' "$REPO/node_modules/hyperframes/package.json" 2>/dev/null)"
    add_item montador 1 "Montador de vídeo (HyperFrames $v)"
  else
    case "$res" in *Chrome*) t=NAVEGADOR_FALHOU ;; sem-montador) t=FALTA_INSTALAR ;; *) t=MONTADOR_FALHOU ;; esac
    add_item montador 0 "Montador de vídeo" "$t"
    obrig=0
  fi

  FALA_MODELO=""
  if fala_ok; then add_item fala 1 "Ouvido de texto (modelo $FALA_MODELO)"; elif [ -f "$FERR/kit-fala.json" ]; then add_item fala 0 "Ouvido de texto" FALA_FALHOU; else add_item fala 0 "Ouvido de texto" FALTA_INSTALAR; fi

  if [ "$ARQ" = "x64" ]; then
    add_item ouvido 1 "Ouvido de som: não existe para Mac Intel (o vídeo sai igual)" OUVIDO_NAO_SUPORTADO
  elif earshot_ok; then
    add_item ouvido 1 "Ouvido de som"
    ouvido_disp=1
  elif [ -x "$FERR/bin/earshot" ]; then
    add_item ouvido 0 "Ouvido de som" OUVIDO_FALHOU
  else
    add_item ouvido 0 "Ouvido de som" FALTA_INSTALAR
  fi

  livre="$(espaco_livre_gb)"
  [ -n "$livre" ] || livre=0
  if menor_que "$livre" "${V_ESPACO_MINIMO_VERIFICAR_GB:-2}"; then
    add_item espaco 0 "Espaço livre: $livre GB" POUCO_ESPACO "\"dados\":{\"livre_gb\":$livre,\"precisa_gb\":${V_ESPACO_MINIMO_VERIFICAR_GB:-2}}"
  else
    add_item espaco 1 "Espaço livre: $livre GB"
  fi

  if [ -x "$NODE_BIN" ] && [ -f "$REPO/kit/scripts/estudio.mjs" ]; then
    kit_saida="$("$REPO/estudio" conferir-kit 2>>"$LOG")"
    printf '%s\n' "$kit_saida" >>"$LOG"
    kit_ult="$(ultima_linha "$kit_saida")"
    kit_ok="$(jcampo "$kit_ult" ok)"
    if [ "$kit_ok" = "true" ]; then
      add_item kit 1 "Peças do estúdio conferidas" "" "\"origem\":\"kit\""
    else
      t="$(jcampo "$kit_ult" codigo)"
      add_item kit 0 "Peças do estúdio" "${t:-DESCONHECIDO}" "\"origem\":\"kit\""
    fi
  else
    add_item kit 0 "Peças do estúdio" ESTUDIO_NAO_INSTALADO
  fi

  local gravou=0 ok=0
  [ "$prontos" = "$total" ] && ok=1
  if [ "$obrig" = "1" ] && [ -x "$NODE_BIN" ]; then
    gravar_instalacao "$ouvido_disp" && gravou=1
  fi
  if [ "$ok" = "1" ]; then diga "Tudo pronto: $prontos de $total."; else diga "Ficou quase tudo pronto: $prontos de $total."; fi
  printf '{"ok":%s,"total":%s,"prontos":%s,"instalacao_gravada":%s,"itens":[%s]}\n' "$(jbool "$ok")" "$total" "$prontos" "$(jbool "$gravou")" "$itens"
  [ "$ok" = "1" ] && exit 0
  exit 1
}

gravar_instalacao() {
  ler_config
  "$NODE_BIN" -e '
const fs = require("fs"), path = require("path");
const a = process.argv.slice(1);
const [estadoDir, destino, versao, arq, versaoSo, agente, ferr, repo, ouvido, modo] = a;
const passos = {};
for (const f of fs.readdirSync(estadoDir)) {
  if (!f.endsWith(".json")) continue;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(estadoDir, f), "utf8"));
    if (!j.passo) continue;
    passos[j.passo] = { ok: j.estado === "pronto" || j.estado === "nao_suportado", versao: j.versao || "", quando: j.atualizado_em || "" };
  } catch (e) {}
}
const o = {
  versao_estudio: versao, sistema: "mac", arquitetura: arq, versao_sistema: versaoSo,
  agente: agente || "claude", ferramentas_dir: ferr, repo_dir: repo, passos,
  ouvido_disponivel: ouvido === "1", git_disponivel: false, modo_permissao: modo || "tudo"
};
fs.writeFileSync(destino + ".tmp", JSON.stringify(o, null, 2) + "\n");
fs.renameSync(destino + ".tmp", destino);
' "$ESTADO" "$FERR/instalacao.json" "$VERSAO_ESTUDIO" "$ARQ" "$VERSAO_SO" "$CFG_AGENTE" "$FERR" "$REPO" "$1" "$CFG_MODO" >>"$LOG" 2>&1
}

acao_mudar_pasta() {
  local destino="$HOME/estudio-de-reels"
  if [ "$REPO" = "$destino" ]; then
    printf '{"acao":"mudar-pasta","ok":true,"codigo":"JA_PRONTO","de":%s,"para":%s}\n' "$(js "$REPO")" "$(js "$destino")"
    exit 0
  fi
  if [ -e "$destino" ]; then
    printf '{"acao":"mudar-pasta","ok":false,"codigo":"PASTA_DESTINO_EXISTE","de":%s,"para":%s,"dados":{"pasta":%s}}\n' "$(js "$REPO")" "$(js "$destino")" "$(js "$destino")"
    exit 1
  fi
  diga "Vou mudar o estúdio para $destino, o lugar de sempre. Nada é apagado."
  if mv "$REPO" "$destino" 2>/dev/null; then
    chmod 755 "$destino/estudio" "$destino"/instalar/*.sh 2>/dev/null
    printf '{"acao":"mudar-pasta","ok":true,"codigo":"INSTALADO","de":%s,"para":%s}\n' "$(js "$REPO")" "$(js "$destino")"
    exit 0
  fi
  printf '{"acao":"mudar-pasta","ok":false,"codigo":"ARQUIVO_EM_USO","de":%s,"para":%s,"dados":{}}\n' "$(js "$REPO")" "$(js "$destino")"
  exit 1
}

# Único lugar de onde o estúdio aceita uma versão nova (conta e repositório fixos no GitHub).
ENDERECO_OFICIAL="https://github.com/autonom-ia/video-edit-autonomia/"

saida_atualizar() {
  # saida_atualizar <codigo> [dados json]
  local dados="${2:-}"
  [ -n "$dados" ] || dados="{}"
  printf '{"acao":"atualizar","ok":false,"codigo":%s,"de":%s,"para":"","dados":%s}\n' "$(js "$1")" "$(js "$VERSAO_ESTUDIO")" "$dados"
  exit 1
}

# Guarda só as 2 cópias mais novas de versao-anterior-* (o nome tem data e hora, então a ordem do nome é a do tempo).
limpar_versoes_antigas() {
  local lista=("$FERR"/versao-anterior-*) n i
  [ -e "${lista[0]}" ] || return 0
  n=${#lista[@]}
  for ((i = 0; i < n - 2; i++)); do
    rm -rf "${lista[i]}"
  done
}

acao_atualizar() {
  local origem="${1:-${V_ESTUDIO_ATUALIZAR_URL:-}}" novo de para antigo item nome pkg_mudou=0 fala_mudou=0 sha tem rc
  # O bash lê o script aos poucos: antes de copiar por cima, roda a partir de uma cópia.
  if [ -z "${ESTUDIO_ATUALIZANDO:-}" ]; then
    preparar_tmp
    cp "$REPO/instalar/instalar.sh" "$TMPD/instalar.sh"
    ESTUDIO_ATUALIZANDO=1 ESTUDIO_REPO="$REPO" bash "$TMPD/instalar.sh" atualizar ${1:+"$1"}
    exit $?
  fi
  preparar_log atualizar
  preparar_tmp
  case "$origem" in
    *"/CONTA/"*|"") saida_atualizar ATUALIZACAO_SEM_ENDERECO ;;
  esac
  diga "Vou baixar a versão nova do estúdio. O seu trabalho, a sua marca e os seus vídeos ficam como estão."
  if [ -f "$origem" ]; then
    # Zip no computador: só com o arquivo .sha256 do mesmo release ao lado.
    [ -f "$origem.sha256" ] || saida_atualizar ARQUIVO_DIFERENTE '{"nome":"estúdio"}'
    sha="$(primeira_palavra "$origem.sha256")"
    cp "$origem" "$TMPD/novo.zip" || saida_atualizar DOWNLOAD_FALHOU '{"nome":"estúdio"}'
    tem="$(shasum -a 256 "$TMPD/novo.zip" | cut -d' ' -f1)"
    if [ "${#sha}" != "64" ] || [ "$tem" != "$sha" ]; then saida_atualizar ARQUIVO_DIFERENTE '{"nome":"estúdio"}'; fi
  else
    case "$origem" in
      *".."*|*"@"*|*"\\"*) saida_atualizar ATUALIZACAO_ENDERECO_ESTRANHO ;;
      "$ENDERECO_OFICIAL"*) ;;
      *) saida_atualizar ATUALIZACAO_ENDERECO_ESTRANHO ;;
    esac
    baixar "$origem.sha256" "$TMPD/novo.zip.sha256" "" || saida_atualizar DOWNLOAD_FALHOU '{"nome":"estúdio"}'
    sha="$(primeira_palavra "$TMPD/novo.zip.sha256")"
    [ "${#sha}" = "64" ] || saida_atualizar ARQUIVO_DIFERENTE '{"nome":"estúdio"}'
    baixar "$origem" "$TMPD/novo.zip" "$sha"
    rc=$?
    [ "$rc" = "0" ] || saida_atualizar "$(codigo_do_download "$rc")" '{"nome":"estúdio"}'
  fi
  mkdir -p "$TMPD/novo"
  ditto -x -k "$TMPD/novo.zip" "$TMPD/novo" >>"$LOG" 2>&1 || saida_atualizar DOWNLOAD_FALHOU '{"nome":"estúdio"}'
  novo="$(find "$TMPD/novo" -maxdepth 2 -type f -name VERSAO | head -n 1)"
  [ -n "$novo" ] || saida_atualizar ARQUIVO_DIFERENTE '{"nome":"estúdio"}'
  novo="$(dirname "$novo")"
  de="$VERSAO_ESTUDIO"
  IFS= read -r para < "$novo/VERSAO" || true
  para="${para%$'\r'}"
  if [ "$para" = "$de" ]; then
    diga "O estúdio já está na versão mais nova ($de)."
    printf '{"acao":"atualizar","ok":true,"codigo":"JA_ATUALIZADO","de":%s,"para":%s}\n' "$(js "$de")" "$(js "$para")"
    exit 0
  fi
  # Só refaz o montador ou o ouvido de texto se as dependências deles mudaram
  # (o número da versão do estúdio, que muda sempre, é ignorado).
  local deps=""
  if [ -x "$NODE_BIN" ] && [ -f "$novo/instalar/dependencias-mudaram.mjs" ]; then
    deps="$("$NODE_BIN" "$novo/instalar/dependencias-mudaram.mjs" "$REPO" "$novo" 2>>"$LOG")"
  fi
  if [ -n "$deps" ]; then
    [ "$(jcampo "$deps" montador)" = "false" ] || pkg_mudou=1
    [ "$(jcampo "$deps" fala)" = "false" ] || fala_mudou=1
  else
    cmp -s "$REPO/package.json" "$novo/package.json" || pkg_mudou=1
    cmp -s "$REPO/package-lock.json" "$novo/package-lock.json" || pkg_mudou=1
    cmp -s "$REPO/pyproject.toml" "$novo/pyproject.toml" || fala_mudou=1
    cmp -s "$REPO/uv.lock" "$novo/uv.lock" || fala_mudou=1
  fi
  antigo="$FERR/versao-anterior-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$antigo"
  # Troca item por item. VERSAO vai por último: se algo falhar no meio, a versão
  # instalada continua a antiga e tudo o que já tinha sido trocado volta do backup.
  local trocados=() falhou_troca="" lista=()
  for item in "$novo"/* "$novo"/.[!.]*; do
    [ -e "$item" ] || continue
    [ "$(basename "$item")" = "VERSAO" ] && continue
    lista+=("$item")
  done
  lista+=("$novo/VERSAO")
  for item in "${lista[@]}"; do
    nome="$(basename "$item")"
    # O trabalho do aluno e os programas instalados nunca são tocados.
    case "$nome" in
      .ferramentas|minha-marca|projetos|1-referencias|2-videos-brutos|3-videos-prontos|node_modules|.git) continue ;;
    esac
    if [ -e "$REPO/$nome" ]; then
      mv "$REPO/$nome" "$antigo/$nome" 2>>"$LOG" || { falhou_troca="$nome"; break; }
    fi
    trocados+=("$nome")
    cp -R "$item" "$REPO/$nome" 2>>"$LOG" || { falhou_troca="$nome"; break; }
  done
  if [ -n "$falhou_troca" ]; then
    local voltou=1
    for nome in "${trocados[@]}"; do
      # Só devolve se o novo saiu: mover uma pasta para cima de outra que ficou
      # a colocaria dentro dela, e o estúdio pareceria restaurado sem estar.
      if ! rm -rf "${REPO:?}/$nome" 2>>"$LOG"; then voltou=0; continue; fi
      if [ -e "$antigo/$nome" ]; then mv "$antigo/$nome" "$REPO/$nome" 2>>"$LOG" || voltou=0; fi
    done
    # Com tudo de volta, a pasta da cópia fica vazia e sai. Se ficasse, contaria
    # como cópia anterior e empurraria uma cópia de verdade para fora da fila.
    if [ "$voltou" = "1" ] && rmdir "$antigo" 2>>"$LOG"; then
      diga "Não consegui trocar os arquivos do estúdio. Voltei tudo como estava."
      printf '{"acao":"atualizar","ok":false,"codigo":"ATUALIZACAO_FALHOU","de":%s,"para":%s,"dados":{"arquivo":%s}}\n' "$(js "$de")" "$(js "$para")" "$(js "$falhou_troca")"
    else
      diga "Não consegui trocar os arquivos do estúdio, e alguns não voltaram sozinhos. Eles estão guardados em $antigo."
      printf '{"acao":"atualizar","ok":false,"codigo":"ATUALIZACAO_INCOMPLETA","de":%s,"para":%s,"dados":{"arquivo":%s,"copia_anterior":%s}}\n' "$(js "$de")" "$(js "$para")" "$(js "$falhou_troca")" "$(js "$antigo")"
    fi
    exit 1
  fi
  if [ -f "$antigo/.claude/settings.local.json" ]; then
    mkdir -p "$REPO/.claude"
    cp -f "$antigo/.claude/settings.local.json" "$REPO/.claude/settings.local.json"
  fi
  chmod 755 "$REPO/estudio" "$REPO"/instalar/*.sh 2>/dev/null
  limpar_versoes_antigas
  if [ "$pkg_mudou" = "1" ]; then
    diga "O montador mudou na versão nova. Vou atualizar."
    rm -f "$ESTADO/montador.txt" "$ESTADO/montador.json"
    bash "$REPO/instalar/instalar.sh" passo montador >>"$LOG" 2>&1
  fi
  if [ "$fala_mudou" = "1" ] && [ -f "$ESTADO/fala.txt" ]; then
    diga "O ouvido de texto mudou na versão nova. Vou atualizar."
    # Sem apagar o estado, o passo vê "pronto" com o modelo no lugar e não refaz nada.
    rm -f "$ESTADO/fala.txt" "$ESTADO/fala.json"
    bash "$REPO/instalar/instalar.sh" passo fala >>"$LOG" 2>&1
  fi
  diga "Pronto: estúdio atualizado de $de para $para. A versão anterior ficou guardada em $antigo."
  printf '{"acao":"atualizar","ok":true,"de":%s,"para":%s,"copia_anterior":%s}\n' "$(js "$de")" "$(js "$para")" "$(js "$antigo")"
  exit 0
}

# Desinstalar: apaga só o que o instalador pôs (a pasta .ferramentas, as peças do montador e os atalhos).
# Sem --confirmar só diz o que seria apagado. Os vídeos, a marca e os projetos ficam.
acao_desinstalar() {
  local alvo="$REPO/.ferramentas" apagar="" kb=0 k id pid
  add() { [ -n "$apagar" ] && apagar="$apagar,"; apagar="$apagar$(js "$1")"; }
  if [ -d "$alvo" ]; then add "$alvo"; k="$(du -sk "$alvo" 2>/dev/null | cut -f1)"; kb=$((kb + ${k:-0})); fi
  if [ -d "$REPO/node_modules" ]; then add "$REPO/node_modules"; k="$(du -sk "$REPO/node_modules" 2>/dev/null | cut -f1)"; kb=$((kb + ${k:-0})); fi
  [ -f "$ATALHO_ABRIR" ] && add "$ATALHO_ABRIR"
  [ -L "$ATALHO_PASTA" ] && add "$ATALHO_PASTA"
  if [ "$CONFIRMAR" != "1" ]; then
    printf '{"acao":"desinstalar","ok":true,"confirmado":false,"apagaria":[%s],"tamanho_mb":%s,"fica":["minha-marca","projetos","1-referencias","2-videos-brutos","3-videos-prontos"]}\n' "$apagar" "$((kb / 1024))"
    exit 0
  fi
  for id in fala ouvido; do
    pid=""
    [ -f "$alvo/estado/$id.pid" ] && pid="$(cat "$alvo/estado/$id.pid" 2>/dev/null)"
    if pid_vivo "$pid"; then
      printf '{"acao":"desinstalar","ok":false,"codigo":"ARQUIVO_EM_USO","dados":{}}\n'
      exit 1
    fi
  done
  diga "Vou apagar os programas do estúdio e os atalhos. Os seus vídeos, a sua marca e os projetos ficam."
  cd "$HOME" || cd /
  rm -rf "$alvo" "$REPO/node_modules"
  rm -f "$ATALHO_ABRIR"
  [ -L "$ATALHO_PASTA" ] && rm -f "$ATALHO_PASTA"
  if [ -e "$alvo" ] || [ -e "$REPO/node_modules" ]; then
    printf '{"acao":"desinstalar","ok":false,"codigo":"ARQUIVO_EM_USO","dados":{}}\n'
    exit 1
  fi
  diga "Pronto: programas do estúdio apagados."
  printf '{"acao":"desinstalar","ok":true,"confirmado":true,"apagou":[%s],"pasta_do_estudio":%s}\n' "$apagar" "$(js "$REPO")"
  exit 0
}

# ---------------------------------------------------------------- despacho

case "$ACAO" in
  checar) acao_checar ;;
  plano) acao_plano ;;
  passo) acao_passo "$ID" ;;
  segundo-plano) acao_segundo_plano "$ID" ;;
  status) acao_status "$ID" ;;
  verificar) acao_verificar ;;
  mudar-pasta) acao_mudar_pasta ;;
  atualizar) acao_atualizar "$ID" ;;
  desinstalar) acao_desinstalar ;;
  *)
    printf '{"acao":%s,"ok":false,"codigo":"ACAO_DESCONHECIDA","dados":{"acoes":["checar","plano","passo","segundo-plano","status","verificar","mudar-pasta","atualizar","desinstalar"]}}\n' "$(js "$ACAO")"
    exit 1 ;;
esac
