# Estudio de Reels: doutor do Windows.
# Confere cada programa (Node, npm, uv, Python, FFmpeg com os filtros, FFprobe, baixador, montador,
# ouvido de texto, ouvido de som, espaco livre) e depois chama ".\estudio.cmd conferir-kit".
# Grava instalacao.json quando os obrigatorios estao bons. A ultima linha e um JSON:
# {"ok":bool,"total":n,"prontos":n,"itens":[{"id","ok","texto","codigo"?,"passo"?}]}
# Uso: powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/verificar.ps1 (barra normal: vale no PowerShell e no Git Bash)
$instalador = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'instalar.ps1'
& $instalador verificar @args
exit $LASTEXITCODE
