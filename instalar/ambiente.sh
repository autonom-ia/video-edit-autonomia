# shellcheck shell=bash
# Estúdio de Reels: prepara o ambiente (Mac e Git Bash no Windows).
# Use com ". instalar/ambiente.sh". Pode rodar várias vezes. Não imprime nada.
# Tudo aponta para a pasta de ferramentas do estúdio, sem mexer no resto do computador.
# A pasta de ferramentas fica DENTRO do estúdio: <estudio-de-reels>/.ferramentas (Mac e Windows).
# Assim tudo fica na pasta que o assistente abriu (no Codex, é a área onde ele pode gravar).

_estudio_win=0
case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*) _estudio_win=1 ;;
esac

# Converte caminho do Git Bash (/c/...) para o formato que os programas do Windows entendem (C:/...).
_estudio_caminho() {
  if [ "$_estudio_win" = "1" ] && command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$1"
  else
    printf '%s' "$1"
  fi
}

_estudio_posix() {
  if [ "$_estudio_win" = "1" ] && command -v cygpath >/dev/null 2>&1; then
    cygpath -u "$1"
  else
    printf '%s' "$1"
  fi
}

if [ -z "${ESTUDIO_REPO:-}" ]; then
  ESTUDIO_REPO="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
fi
_estudio_r="$(_estudio_posix "$ESTUDIO_REPO")"

if [ -n "${ESTUDIO_FERRAMENTAS:-}" ]; then
  _estudio_f="$(_estudio_posix "$ESTUDIO_FERRAMENTAS")"
else
  _estudio_f="$_estudio_r/.ferramentas"
fi

if [ "$_estudio_win" = "1" ]; then
  _estudio_node_dir="$_estudio_f/node"
  _estudio_ext=".exe"
else
  _estudio_node_dir="$_estudio_f/node/bin"
  _estudio_ext=""
fi

case ":$PATH:" in
  *":$_estudio_node_dir:"*) ;;
  *) PATH="$_estudio_node_dir:$PATH" ;;
esac
case ":$PATH:" in
  *":$_estudio_f/bin:"*) ;;
  *) PATH="$_estudio_f/bin:$PATH" ;;
esac
export PATH

ESTUDIO_FERRAMENTAS="$(_estudio_caminho "$_estudio_f")"
ESTUDIO_REPO="$(_estudio_caminho "$_estudio_r")"
ESTUDIO_NODE="$(_estudio_caminho "$_estudio_node_dir/node$_estudio_ext")"
export ESTUDIO_FERRAMENTAS ESTUDIO_REPO ESTUDIO_NODE

UV_PYTHON_INSTALL_DIR="$(_estudio_caminho "$_estudio_f/python")"
UV_TOOL_DIR="$(_estudio_caminho "$_estudio_f/uv-tools")"
UV_TOOL_BIN_DIR="$(_estudio_caminho "$_estudio_f/bin")"
UV_CACHE_DIR="$(_estudio_caminho "$_estudio_f/cache/uv")"
UV_PROJECT_ENVIRONMENT="$(_estudio_caminho "$_estudio_f/venv")"
UV_NO_MODIFY_PATH=1
UV_PYTHON_PREFERENCE=only-managed
UV_PYTHON=3.12
if [ "$_estudio_win" = "1" ]; then
  if [ "${PROCESSOR_ARCHITECTURE:-}" = "ARM64" ] || [ "${PROCESSOR_ARCHITEW6432:-}" = "ARM64" ]; then
    UV_PYTHON=cpython-3.12-windows-x86_64
  fi
fi
export UV_PYTHON_INSTALL_DIR UV_TOOL_DIR UV_TOOL_BIN_DIR UV_CACHE_DIR UV_PROJECT_ENVIRONMENT
export UV_NO_MODIFY_PATH UV_PYTHON_PREFERENCE UV_PYTHON

HF_HOME="$(_estudio_caminho "$_estudio_f/cache/hf")"
EARSHOT_HOME="$(_estudio_caminho "$_estudio_f/cache/earshot")"
EARSHOT_THREADS=3
export HF_HOME EARSHOT_HOME EARSHOT_THREADS

HYPERFRAMES_CACHE_DIR="$(_estudio_caminho "$_estudio_f/cache/hyperframes")"
HYPERFRAMES_NO_TELEMETRY=1
HYPERFRAMES_NO_UPDATE_CHECK=1
HYPERFRAMES_SKIP_SKILLS=1
HYPERFRAMES_FFMPEG_PATH="$(_estudio_caminho "$_estudio_f/bin/ffmpeg$_estudio_ext")"
HYPERFRAMES_FFPROBE_PATH="$(_estudio_caminho "$_estudio_f/bin/ffprobe$_estudio_ext")"
export HYPERFRAMES_CACHE_DIR HYPERFRAMES_NO_TELEMETRY HYPERFRAMES_NO_UPDATE_CHECK HYPERFRAMES_SKIP_SKILLS
export HYPERFRAMES_FFMPEG_PATH HYPERFRAMES_FFPROBE_PATH

npm_config_cache="$(_estudio_caminho "$_estudio_f/cache/npm")"
npm_config_update_notifier=false
npm_config_fund=false
npm_config_audit=false
export npm_config_cache npm_config_update_notifier npm_config_fund npm_config_audit

unset _estudio_r _estudio_node_dir _estudio_ext
