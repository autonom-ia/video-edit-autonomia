# Estudio de Reels: prepara o ambiente nesta sessao do PowerShell (Windows).
# Use com: . ./instalar/ambiente.ps1
# Pode rodar varias vezes. Nao imprime nada. Compativel com PowerShell 5.1 e 7.
# Arquivo so com caracteres ASCII de proposito: o PowerShell 5.1 le arquivo sem BOM como ANSI.
# A pasta de ferramentas fica DENTRO do estudio: <estudio-de-reels>\.ferramentas (igual no Mac).
# Uma regra so, igual no estudio.cmd, no ambiente.sh e no kit.

function Test-EstudioNomeSeguro {
    param([string]$Texto)
    $permitidos = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-'
    if ([string]::IsNullOrEmpty($Texto)) { return $false }
    foreach ($ch in $Texto.ToCharArray()) {
        if ($permitidos.IndexOf($ch) -lt 0) { return $false }
    }
    return $true
}

function Get-EstudioNomeDoUsuario {
    $perfil = [string]$env:USERPROFILE
    if ([string]::IsNullOrEmpty($perfil)) { return [string]$env:USERNAME }
    $partes = $perfil.TrimEnd('\').Split('\')
    return $partes[$partes.Length - 1]
}

function Get-EstudioFerramentas {
    if ($env:ESTUDIO_FERRAMENTAS) { return $env:ESTUDIO_FERRAMENTAS }
    return (Join-Path $env:ESTUDIO_REPO '.ferramentas')
}

function Get-EstudioArquitetura {
    if ($env:PROCESSOR_ARCHITEW6432 -eq 'ARM64' -or $env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { return 'arm64' }
    return 'x64'
}

function Set-EstudioAmbiente {
    if (-not $env:ESTUDIO_REPO) {
        $env:ESTUDIO_REPO = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
    }
    $f = Get-EstudioFerramentas
    $env:ESTUDIO_FERRAMENTAS = $f
    $bin = Join-Path $f 'bin'
    $nodeDir = Join-Path $f 'node'
    $env:ESTUDIO_NODE = Join-Path $nodeDir 'node.exe'

    $atual = ';' + [string]$env:Path + ';'
    if ($atual.IndexOf(';' + $nodeDir + ';', [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { $env:Path = $nodeDir + ';' + $env:Path }
    $atual = ';' + [string]$env:Path + ';'
    if ($atual.IndexOf(';' + $bin + ';', [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { $env:Path = $bin + ';' + $env:Path }

    $env:UV_PYTHON_INSTALL_DIR = Join-Path $f 'python'
    $env:UV_TOOL_DIR = Join-Path $f 'uv-tools'
    $env:UV_TOOL_BIN_DIR = $bin
    $env:UV_CACHE_DIR = Join-Path $f 'cache\uv'
    $env:UV_PROJECT_ENVIRONMENT = Join-Path $f 'venv'
    $env:UV_NO_MODIFY_PATH = '1'
    $env:UV_PYTHON_PREFERENCE = 'only-managed'
    if ((Get-EstudioArquitetura) -eq 'arm64') { $env:UV_PYTHON = 'cpython-3.12-windows-x86_64' } else { $env:UV_PYTHON = '3.12' }

    $env:HF_HOME = Join-Path $f 'cache\hf'
    $env:EARSHOT_HOME = Join-Path $f 'cache\earshot'
    $env:EARSHOT_THREADS = '3'

    $env:HYPERFRAMES_CACHE_DIR = Join-Path $f 'cache\hyperframes'
    $env:HYPERFRAMES_NO_TELEMETRY = '1'
    $env:HYPERFRAMES_NO_UPDATE_CHECK = '1'
    $env:HYPERFRAMES_SKIP_SKILLS = '1'
    $env:HYPERFRAMES_FFMPEG_PATH = Join-Path $bin 'ffmpeg.exe'
    $env:HYPERFRAMES_FFPROBE_PATH = Join-Path $bin 'ffprobe.exe'

    $env:npm_config_cache = Join-Path $f 'cache\npm'
    $env:npm_config_update_notifier = 'false'
    $env:npm_config_fund = 'false'
    $env:npm_config_audit = 'false'
}

Set-EstudioAmbiente
