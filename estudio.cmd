@echo off
rem Estudio de Reels: ponto de entrada do kit no Windows (PowerShell ou Prompt de Comando).
rem Uso: .\estudio.cmd <comando> [argumentos]
rem Acha o Node da pasta de ferramentas, prepara o ambiente e roda kit\scripts\estudio.mjs.
rem A ultima linha da saida e sempre um JSON numa linha so.
setlocal EnableExtensions DisableDelayedExpansion

set "ESTUDIO_REPO=%~dp0"
if "%ESTUDIO_REPO:~-1%"=="\" set "ESTUDIO_REPO=%ESTUDIO_REPO:~0,-1%"

rem A pasta de ferramentas fica dentro do estudio (igual no Mac e no ambiente.ps1).
if not defined ESTUDIO_FERRAMENTAS set "ESTUDIO_FERRAMENTAS=%ESTUDIO_REPO%\.ferramentas"

set "PATH=%ESTUDIO_FERRAMENTAS%\bin;%ESTUDIO_FERRAMENTAS%\node;%PATH%"
set "ESTUDIO_NODE=%ESTUDIO_FERRAMENTAS%\node\node.exe"
set "UV_PYTHON_INSTALL_DIR=%ESTUDIO_FERRAMENTAS%\python"
set "UV_TOOL_DIR=%ESTUDIO_FERRAMENTAS%\uv-tools"
set "UV_TOOL_BIN_DIR=%ESTUDIO_FERRAMENTAS%\bin"
set "UV_CACHE_DIR=%ESTUDIO_FERRAMENTAS%\cache\uv"
set "UV_PROJECT_ENVIRONMENT=%ESTUDIO_FERRAMENTAS%\venv"
set "UV_NO_MODIFY_PATH=1"
set "UV_PYTHON_PREFERENCE=only-managed"
set "UV_PYTHON=3.12"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "UV_PYTHON=cpython-3.12-windows-x86_64"
if /i "%PROCESSOR_ARCHITEW6432%"=="ARM64" set "UV_PYTHON=cpython-3.12-windows-x86_64"
set "HF_HOME=%ESTUDIO_FERRAMENTAS%\cache\hf"
set "EARSHOT_HOME=%ESTUDIO_FERRAMENTAS%\cache\earshot"
set "EARSHOT_THREADS=3"
set "HYPERFRAMES_CACHE_DIR=%ESTUDIO_FERRAMENTAS%\cache\hyperframes"
set "HYPERFRAMES_NO_TELEMETRY=1"
set "HYPERFRAMES_NO_UPDATE_CHECK=1"
set "HYPERFRAMES_SKIP_SKILLS=1"
set "HYPERFRAMES_FFMPEG_PATH=%ESTUDIO_FERRAMENTAS%\bin\ffmpeg.exe"
set "HYPERFRAMES_FFPROBE_PATH=%ESTUDIO_FERRAMENTAS%\bin\ffprobe.exe"
set "npm_config_cache=%ESTUDIO_FERRAMENTAS%\cache\npm"
set "npm_config_update_notifier=false"
set "npm_config_fund=false"
set "npm_config_audit=false"

if exist "%ESTUDIO_NODE%" goto rodar
echo {"ok":false,"comando":"%~1","arquivos":{},"resumo":"O estudio ainda nao terminou de instalar: falta o Node.","avisos":[],"codigo":"ESTUDIO_NAO_INSTALADO","dados":{}}
exit /b 1

:rodar
"%ESTUDIO_NODE%" "%ESTUDIO_REPO%\kit\scripts\estudio.mjs" %*
exit /b %ERRORLEVEL%
