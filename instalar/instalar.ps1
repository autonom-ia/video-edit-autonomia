# Estudio de Reels: instalador para Windows (x64 e ARM64). Compativel com PowerShell 5.1 e 7.
#
# Uso (PowerShell ou Git Bash; use barra normal no caminho, o PowerShell aceita):
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/instalar.ps1 <acao> [id] [--agente claude|codex] [--modo tudo|um_por_um]
#
# Acoes:
#   checar               So olha o computador (sistema, espaco, memoria, internet, pasta, nome do usuario). Nao instala nada.
#   plano                Diz o estado de cada passo (falta, pronto, nao_suportado).
#   passo <id>           Instala ou executa um passo. Rodar de novo nao baixa de novo.
#   segundo-plano <id>   So "fala" e "ouvido": comeca o passo escondido e volta na hora.
#   status <id>          Le como esta um passo em segundo plano.
#   verificar            Confere cada programa, grava instalacao.json e diz o que falta.
#   mudar-pasta          Muda o estudio para fora do OneDrive, ou para C:\EstudioDeReels quando o nome do usuario tem acento.
#   atualizar [endereco] Baixa a versao nova (so do GitHub da conta fixa, conferida por SHA256) e copia por cima,
#                        sem tocar em .ferramentas, projetos, minha-marca e nas pastas 1, 2 e 3.
#   desinstalar          Sem --confirmar: so diz o que seria apagado. Com --confirmar: apaga a pasta de
#                        ferramentas, as pecas do montador e os atalhos da Area de Trabalho. Os videos e a marca ficam.
#
# Passos, na ordem: pasta atalho python node ffmpeg baixador montador fala ouvido git referencias pastas
# (o atalho vem logo depois da pasta: se a janela fechar no meio, a pessoa volta por ele).
#
# Regras: tudo fica em <estudio-de-reels>\.ferramentas (igual no Mac);
# nada pede senha (o Git opcional pode mostrar a janela do Windows); versoes fixas em versoes.env;
# sempre curl.exe; nunca setx; antes de cada coisa o script diz o que vai fazer;
# a ULTIMA linha e sempre um JSON numa linha so. Sem expressao regular.
# Arquivo so com caracteres ASCII de proposito: o PowerShell 5.1 le arquivo sem BOM como ANSI.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false } catch { }

$script:Aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $env:ESTUDIO_REPO) {
    $env:ESTUDIO_REPO = (Resolve-Path -LiteralPath (Join-Path $script:Aqui '..')).Path
}
. (Join-Path $env:ESTUDIO_REPO 'instalar\ambiente.ps1')

$script:Repo = $env:ESTUDIO_REPO
$script:Arq = Get-EstudioArquitetura
$script:Log = $null
$script:Tmp = $null
$script:PassoAtual = ''
$script:Passos = @('pasta', 'atalho', 'python', 'node', 'ffmpeg', 'baixador', 'montador', 'fala', 'ouvido', 'git', 'referencias', 'pastas')
# Numero de cada programa na lista do I-03 ("{{i}} de {{n}}"). Pasta, atalho, videos de exemplo e pastas nao tem numero.
$script:Numeros = @{ python = 1; node = 2; ffmpeg = 3; baixador = 4; montador = 5; fala = 6; ouvido = 7; git = 8 }
# Unico lugar de onde o estudio aceita uma versao nova (conta e repositorio fixos no GitHub).
$script:EnderecoOficial = 'https://github.com/autonom-ia/video-edit-autonomia/'
$script:Utf8 = New-Object System.Text.UTF8Encoding $false
$script:Curl = Join-Path $env:SystemRoot 'System32\curl.exe'
$script:Tar = Join-Path $env:SystemRoot 'System32\tar.exe'
$script:Cmd = $env:ComSpec
if (-not $script:Cmd) { $script:Cmd = Join-Path $env:SystemRoot 'System32\cmd.exe' }
$script:NomeAtalho = 'Abrir o Est' + [char]0x00FA + 'dio.cmd'
$script:NomeAtalhoPasta = 'Est' + [char]0x00FA + 'dio de Reels.lnk'

function Set-Caminhos {
    $script:Ferr = $env:ESTUDIO_FERRAMENTAS
    $script:Estado = Join-Path $script:Ferr 'estado'
    $script:Logs = Join-Path $script:Ferr 'logs'
    $script:Bin = Join-Path $script:Ferr 'bin'
    $script:NodeExe = Join-Path $script:Ferr 'node\node.exe'
    $script:NpmCmd = Join-Path $script:Ferr 'node\npm.cmd'
    $script:UvExe = Join-Path $script:Bin 'uv.exe'
}
Set-Caminhos

# ---------------------------------------------------------------- versoes

$script:V = @{}
$arquivoVersoes = Join-Path $script:Repo 'instalar\versoes.env'
if (Test-Path -LiteralPath $arquivoVersoes) {
    foreach ($linha in [System.IO.File]::ReadAllLines($arquivoVersoes)) {
        $l = $linha.Trim()
        if ($l.Length -eq 0 -or $l.StartsWith('#')) { continue }
        $p = $l.Split([char[]]@('='), 2)
        if ($p.Length -eq 2) { $script:V[$p[0]] = $p[1] }
    }
}
function Vv([string]$Chave) {
    if ($script:V.ContainsKey($Chave)) { return [string]$script:V[$Chave] }
    return ''
}

$script:VersaoEstudio = '1.0.0'
$arquivoVersao = Join-Path $script:Repo 'VERSAO'
if (Test-Path -LiteralPath $arquivoVersao) { $script:VersaoEstudio = ([System.IO.File]::ReadAllText($arquivoVersao)).Trim() }

$script:PythonPedido = Vv 'PYTHON_VERSAO'
if (-not $script:PythonPedido) { $script:PythonPedido = '3.12' }
if ($script:Arq -eq 'arm64') { $script:PythonPedido = 'cpython-3.12-windows-x86_64' }

# ---------------------------------------------------------------- argumentos

$script:Acao = ''
$script:Id = ''
$script:Agente = ''
$script:Modo = ''
$script:Confirmar = $false
$i = 0
while ($i -lt $args.Count) {
    $a = [string]$args[$i]
    # Aceita --agente, -agente ou -Agente: o PowerShell pode entregar o nome com um traco so.
    $nomeOpcao = ''
    if ($a.StartsWith('-')) { $nomeOpcao = $a.TrimStart('-').TrimEnd(':').ToLowerInvariant() }
    if ($nomeOpcao -eq 'confirmar') { $script:Confirmar = $true; $i++; continue }
    if ($nomeOpcao -eq 'agente' -and ($i + 1) -lt $args.Count) { $script:Agente = [string]$args[$i + 1]; $i += 2; continue }
    if ($nomeOpcao -eq 'modo' -and ($i + 1) -lt $args.Count) { $script:Modo = [string]$args[$i + 1]; $i += 2; continue }
    if (-not $script:Acao) { $script:Acao = $a } elseif (-not $script:Id) { $script:Id = $a }
    $i++
}
if ($script:Agente -ne 'claude' -and $script:Agente -ne 'codex') { $script:Agente = '' }
if ($script:Modo -ne 'tudo' -and $script:Modo -ne 'um_por_um') { $script:Modo = '' }

# ---------------------------------------------------------------- utilidades

function ConvertTo-JsonLinha($Objeto) {
    $j = ConvertTo-Json -InputObject $Objeto -Compress -Depth 10
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $j.ToCharArray()) {
        $n = [int]$ch
        if ($n -gt 126) { [void]$sb.Append('\u'); [void]$sb.Append($n.ToString('x4')) } else { [void]$sb.Append($ch) }
    }
    return $sb.ToString()
}

function Sair($Objeto, [int]$Codigo) {
    [Console]::Out.WriteLine((ConvertTo-JsonLinha $Objeto))
    exit $Codigo
}

function Get-Agora { return (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }

function Write-Log([string]$Texto) {
    if (-not $script:Log -or [string]::IsNullOrEmpty($Texto)) { return }
    try { [System.IO.File]::AppendAllText($script:Log, $Texto + "`r`n", $script:Utf8) } catch { }
}

function Diga([string]$Texto) {
    Write-Host $Texto
    Write-Log ('[' + (Get-Date -Format 'HH:mm:ss') + '] ' + $Texto)
}

function Initialize-Log([string]$Nome) {
    try {
        if (-not (Test-Path -LiteralPath $script:Logs)) { New-Item -ItemType Directory -Force -Path $script:Logs | Out-Null }
        $script:Log = Join-Path $script:Logs ($Nome + '.log')
        Write-Log ("`r`n===== " + $Nome + ' ' + (Get-Agora) + ' =====')
    } catch { $script:Log = $null }
}

function Initialize-Tmp {
    if ($script:Tmp) { return }
    $alvo = Join-Path $script:Ferr ('tmp\' + $PID)
    try { New-Item -ItemType Directory -Force -Path $alvo | Out-Null; $script:Tmp = $alvo }
    catch {
        $alvo = Join-Path $env:TEMP ('estudio-' + $PID)
        New-Item -ItemType Directory -Force -Path $alvo | Out-Null
        $script:Tmp = $alvo
    }
}

function Remove-Tmp {
    if ($script:Tmp -and (Test-Path -LiteralPath $script:Tmp)) {
        try { Remove-Item -LiteralPath $script:Tmp -Recurse -Force } catch { }
    }
}

function Get-PastaDeTrabalho {
    if ($script:Ferr -and (Test-Path -LiteralPath $script:Ferr)) { return $script:Ferr }
    return $env:TEMP
}

function Join-Argumentos([string[]]$Lista) {
    $partes = New-Object System.Collections.ArrayList
    foreach ($a in $Lista) {
        if ($null -eq $a) { continue }
        $s = [string]$a
        if ($s.Length -eq 0) { [void]$partes.Add('""'); continue }
        $precisa = $false
        foreach ($c in @(' ', '"', "`t", '&', '<', '>', '|', '^')) { if ($s.IndexOf($c) -ge 0) { $precisa = $true } }
        if ($precisa) {
            $t = $s.Replace('"', '\"')
            if ($t.EndsWith('\')) { $t = $t + '\' }
            [void]$partes.Add('"' + $t + '"')
        } else {
            [void]$partes.Add($s)
        }
    }
    return ($partes.ToArray() -join ' ')
}

function Get-CodigoNativo([int]$Nativo) {
    if ($Nativo -eq 225) { return 'ANTIVIRUS_BLOQUEOU' }
    if ($Nativo -eq 32) { return 'ARQUIVO_EM_USO' }
    if ($Nativo -eq 5) { return 'PERMISSAO_NEGADA' }
    return 'DESCONHECIDO'
}

function Get-CodigoExcecao($Registro) {
    $e = $Registro.Exception
    if ($e -is [System.UnauthorizedAccessException]) { return 'PERMISSAO_NEGADA' }
    $h = 0
    try { $h = $e.HResult } catch { }
    if ($h -eq -2147024864) { return 'ARQUIVO_EM_USO' }
    if ($h -eq -2147024891) { return 'PERMISSAO_NEGADA' }
    if ($h -eq -2147024671) { return 'ANTIVIRUS_BLOQUEOU' }
    return 'DESCONHECIDO'
}

# Roda um programa, guarda toda a saida no log e devolve @{codigo; so; saida; erro}.
function Invoke-Nativo {
    param([string]$Exe, [string[]]$Argumentos = @(), [string]$Pasta = '', [string]$Bruto = '', [int]$TimeoutSeg = 5400)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Exe
    if ($Bruto) { $psi.Arguments = $Bruto } else { $psi.Arguments = Join-Argumentos $Argumentos }
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $psi.StandardOutputEncoding = $script:Utf8
    $psi.StandardErrorEncoding = $script:Utf8
    if (-not $Pasta) { $Pasta = Get-PastaDeTrabalho }
    $psi.WorkingDirectory = $Pasta
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    Write-Log ('> ' + $Exe + ' ' + $psi.Arguments)
    try {
        [void]$p.Start()
    } catch {
        $nativo = 0
        $ex = $_.Exception
        while ($ex -and -not ($ex -is [System.ComponentModel.Win32Exception])) { $ex = $ex.InnerException }
        if ($ex) { $nativo = $ex.NativeErrorCode }
        Write-Log ('nao abriu: ' + $_.Exception.Message)
        return @{ codigo = -1; so = ''; saida = $_.Exception.Message; erro = (Get-CodigoNativo $nativo) }
    }
    $o = $p.StandardOutput.ReadToEndAsync()
    $e = $p.StandardError.ReadToEndAsync()
    if (-not $p.WaitForExit($TimeoutSeg * 1000)) {
        try { $p.Kill() } catch { }
        Write-Log 'tempo esgotado'
        return @{ codigo = -2; so = ''; saida = 'tempo esgotado'; erro = 'DESCONHECIDO' }
    }
    $p.WaitForExit()
    $so = [string]$o.Result
    $se = [string]$e.Result
    Write-Log $so
    Write-Log $se
    return @{ codigo = $p.ExitCode; so = $so; saida = ($so + $se); erro = '' }
}

# Arquivos .cmd (npm.cmd, estudio.cmd) rodam pelo cmd.exe.
function Invoke-Bat {
    param([string]$Bat, [string[]]$Argumentos = @(), [string]$Pasta = '', [int]$TimeoutSeg = 5400)
    $linha = '"' + $Bat + '" ' + (Join-Argumentos $Argumentos)
    return (Invoke-Nativo -Exe $script:Cmd -Bruto ('/d /s /c "' + $linha + '"') -Pasta $Pasta -TimeoutSeg $TimeoutSeg)
}

function Get-UltimaLinha([string]$Texto) {
    if (-not $Texto) { return '' }
    $linhas = $Texto.Replace("`r", '').Split([char[]]@("`n"), [System.StringSplitOptions]::RemoveEmptyEntries)
    if ($linhas.Length -eq 0) { return '' }
    return $linhas[$linhas.Length - 1].Trim()
}

function ConvertFrom-JsonSeguro([string]$Texto) {
    if (-not $Texto) { return $null }
    $ini = $Texto.IndexOf('{')
    if ($ini -lt 0) { return $null }
    try { return ($Texto.Substring($ini) | ConvertFrom-Json) } catch { return $null }
}

function Get-Sha256([string]$Arquivo) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Arquivo).Hash.ToLowerInvariant()
}

# Baixa com 2 tentativas. Devolve '' (ok) ou o codigo do problema.
function Get-Arquivo([string]$Url, [string]$Destino, [string]$Sha = '') {
    $parte = $Destino + '.part'
    for ($t = 1; $t -le 2; $t++) {
        if (Test-Path -LiteralPath $parte) { Remove-Item -LiteralPath $parte -Force }
        $r = Invoke-Nativo -Exe $script:Curl -Argumentos @('-fL', '--retry', '3', '--retry-delay', '3', '--connect-timeout', '20', '-sS', '-A', 'estudio-de-reels/1.0', '-o', $parte, $Url)
        if ($r.codigo -ne 0) {
            if ($r.erro -and $r.erro -ne 'DESCONHECIDO') { return $r.erro }
            if ($t -eq 2) { return 'DOWNLOAD_FALHOU' }
            Start-Sleep -Seconds 3
            continue
        }
        if (-not (Test-Path -LiteralPath $parte)) { return 'ANTIVIRUS_BLOQUEOU' }
        if ($Sha) {
            $tem = Get-Sha256 $parte
            if ($tem -ne $Sha.ToLowerInvariant()) {
                Write-Log ('arquivo diferente: ' + $Url + ' ' + $tem + ' esperado ' + $Sha)
                Remove-Item -LiteralPath $parte -Force
                if ($t -eq 2) { return 'ARQUIVO_DIFERENTE' }
                Diga 'O arquivo chegou diferente do esperado. Por seguranca, vou baixar de novo.'
                continue
            }
        }
        if (Test-Path -LiteralPath $Destino) { Remove-Item -LiteralPath $Destino -Force }
        Move-Item -LiteralPath $parte -Destination $Destino
        return ''
    }
    return 'DOWNLOAD_FALHOU'
}

function Find-HashNaLista([string]$Arquivo, [string]$Nome) {
    foreach ($linha in [System.IO.File]::ReadAllLines($Arquivo)) {
        $t = $linha.Trim()
        if (-not $t) { continue }
        $partes = $t.Split([char[]]@(' ', "`t"), [System.StringSplitOptions]::RemoveEmptyEntries)
        if ($partes.Length -ge 2) {
            $n = $partes[1]
            if ($n.StartsWith('*')) { $n = $n.Substring(1) }
            if ($n -eq $Nome) { return $partes[0].ToLowerInvariant() }
        }
    }
    return ''
}

function Expand-Zip([string]$Zip, [string]$Destino) {
    if (Test-Path -LiteralPath $Destino) { Remove-Item -LiteralPath $Destino -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $Destino | Out-Null
    if (Test-Path -LiteralPath $script:Tar) {
        $r = Invoke-Nativo -Exe $script:Tar -Argumentos @('-xf', $Zip, '-C', $Destino)
        if ($r.codigo -eq 0) { return $true }
    }
    try { Expand-Archive -LiteralPath $Zip -DestinationPath $Destino -Force; return $true } catch { Write-Log $_.Exception.Message; return $false }
}

# Copia um programa achado dentro de uma pasta para FERR\bin. Devolve '' ou o codigo do problema.
function Copy-Programa([string]$Origem, [string]$Nome, [string]$NomeFinal = '') {
    if (-not $NomeFinal) { $NomeFinal = $Nome }
    $achado = Get-ChildItem -LiteralPath $Origem -Recurse -File -Filter $Nome -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $achado) { return 'ANTIVIRUS_BLOQUEOU' }
    $destino = Join-Path $script:Bin $NomeFinal
    try {
        Copy-Item -LiteralPath $achado.FullName -Destination $destino -Force
        Unblock-File -LiteralPath $destino -ErrorAction SilentlyContinue
    } catch {
        return (Get-CodigoExcecao $_)
    }
    if (-not (Test-Path -LiteralPath $destino)) { return 'ANTIVIRUS_BLOQUEOU' }
    return ''
}

function Read-Config {
    $script:CfgAgente = ''
    $script:CfgModo = ''
    $f = Join-Path $script:Ferr 'config.txt'
    if (-not (Test-Path -LiteralPath $f)) { return }
    foreach ($l in [System.IO.File]::ReadAllLines($f)) {
        if ($l.StartsWith('agente=')) { $script:CfgAgente = $l.Substring(7) }
        if ($l.StartsWith('modo=')) { $script:CfgModo = $l.Substring(5) }
    }
}

function Save-Config {
    if (-not (Test-Path -LiteralPath $script:Ferr)) { return }
    Read-Config
    if ($script:Agente) { $script:CfgAgente = $script:Agente }
    if ($script:Modo) { $script:CfgModo = $script:Modo }
    try { [System.IO.File]::WriteAllText((Join-Path $script:Ferr 'config.txt'), ('agente=' + $script:CfgAgente + "`r`nmodo=" + $script:CfgModo + "`r`n"), $script:Utf8) } catch { }
}

function Save-Estado([string]$Id, [string]$Est, [string]$Cod = '', [string]$Prog = '', [string]$Ver = '') {
    if (-not (Test-Path -LiteralPath $script:Estado)) { return }
    $o = [ordered]@{ passo = $Id; estado = $Est; codigo = $Cod; progresso = $Prog; versao = $Ver; atualizado_em = (Get-Agora) }
    $f = Join-Path $script:Estado ($Id + '.json')
    try {
        [System.IO.File]::WriteAllText($f + '.tmp', (ConvertTo-JsonLinha $o) + "`n", $script:Utf8)
        if (Test-Path -LiteralPath $f) { Remove-Item -LiteralPath $f -Force }
        Move-Item -LiteralPath ($f + '.tmp') -Destination $f
    } catch { }
}

function Read-Estado([string]$Id) {
    $f = Join-Path $script:Estado ($Id + '.json')
    if (-not (Test-Path -LiteralPath $f)) { return $null }
    try { return ([System.IO.File]::ReadAllText($f) | ConvertFrom-Json) } catch { return $null }
}

function Set-Progresso([string]$Texto) { Save-Estado $script:PassoAtual 'rodando' '' $Texto '' }

# Videos de exemplo: unico lugar do calculo (igual ao Mac). duracao_s de 1-referencias/links.json
# vezes REFERENCIA_MB_POR_MINUTO de versoes.env.
function Get-ReferenciasMb {
    $porMinuto = 15.0
    if (Vv 'REFERENCIA_MB_POR_MINUTO') { $porMinuto = [double](Vv 'REFERENCIA_MB_POR_MINUTO') }
    $links = Join-Path $script:Repo '1-referencias\links.json'
    if (-not (Test-Path -LiteralPath $links)) { return 0 }
    try {
        $j = [System.IO.File]::ReadAllText($links, $script:Utf8) | ConvertFrom-Json
        $soma = 0.0
        foreach ($e in @($j.exemplos)) { if ($null -ne $e -and $e.duracao_s) { $soma += [double]$e.duracao_s } }
        return [int][math]::Ceiling($soma / 60.0 * $porMinuto)
    } catch { return 0 }
}

function Get-TamanhoMb([string]$Id) {
    if ($Id -eq 'referencias') { return (Get-ReferenciasMb) }
    $tamanhos = @{ python = 160; node = 190; ffmpeg = 150; baixador = 35; montador = 500; fala = 2000; ouvido = 2400; git = 350 }
    if ($tamanhos.ContainsKey($Id)) { return $tamanhos[$Id] }
    return 0
}

function Test-Obrigatorio([string]$Id) { return (@('pasta', 'node', 'ffmpeg', 'montador') -contains $Id) }
function Test-SegundoPlano([string]$Id) { return (@('fala', 'ouvido') -contains $Id) }

function Get-EspacoLivreGb {
    try {
        $raiz = [System.IO.Path]::GetPathRoot($script:Ferr)
        $d = New-Object System.IO.DriveInfo($raiz)
        return [math]::Round($d.AvailableFreeSpace / 1GB, 1)
    } catch { return 0 }
}

function Get-MemoriaGb {
    try { return [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 0) }
    catch {
        try { return [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 0) } catch { return 0 }
    }
}

function Get-Build { return [System.Environment]::OSVersion.Version.Build }

function Get-NomeSistema {
    $n = 'Windows 10'
    if ((Get-Build) -ge 22000) { $n = 'Windows 11' }
    if ($script:Arq -eq 'arm64') { $n = $n + ' ARM' }
    return $n
}

function Get-NuvemDoCaminho([string]$Caminho) {
    foreach ($nomeVar in @('OneDrive', 'OneDriveConsumer', 'OneDriveCommercial')) {
        $valor = [Environment]::GetEnvironmentVariable($nomeVar)
        if ($valor -and $Caminho.StartsWith($valor.TrimEnd('\'), [System.StringComparison]::OrdinalIgnoreCase)) { return 'OneDrive' }
    }
    if ($Caminho.IndexOf('\OneDrive', [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return 'OneDrive' }
    if ($Caminho.IndexOf('\Dropbox', [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return 'Dropbox' }
    if ($Caminho.IndexOf('\iCloudDrive', [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return 'iCloud' }
    return ''
}

function Get-DestinoDoRepo {
    if (-not (Test-EstudioNomeSeguro (Get-EstudioNomeDoUsuario))) { return 'C:\EstudioDeReels\estudio-de-reels' }
    return (Join-Path $env:USERPROFILE 'estudio-de-reels')
}

# ---------------------------------------------------------------- conferencias

function Test-FfmpegCompleto {
    $ff = Join-Path $script:Bin 'ffmpeg.exe'
    $fp = Join-Path $script:Bin 'ffprobe.exe'
    if (-not (Test-Path -LiteralPath $ff) -or -not (Test-Path -LiteralPath $fp)) { return 1 }
    $r = Invoke-Nativo -Exe $ff -Argumentos @('-hide_banner', '-filters')
    if ($r.codigo -ne 0) { if ($r.erro -eq 'ANTIVIRUS_BLOQUEOU') { return 3 }; return 1 }
    foreach ($x in @('zscale', 'loudnorm', 'ebur128', 'sidechaincompress', 'afftdn')) {
        if (-not $r.so.Contains(' ' + $x + ' ')) { Write-Log ('falta o filtro ' + $x); return 2 }
    }
    $r = Invoke-Nativo -Exe $ff -Argumentos @('-hide_banner', '-encoders')
    if (-not $r.so.Contains(' libx264 ')) { Write-Log 'falta o codificador libx264'; return 2 }
    $r = Invoke-Nativo -Exe $fp -Argumentos @('-version')
    if ($r.codigo -ne 0) { return 1 }
    return 0
}

function Get-VersaoFfmpeg {
    $r = Invoke-Nativo -Exe (Join-Path $script:Bin 'ffmpeg.exe') -Argumentos @('-version')
    $primeira = (Get-UltimaLinha ($r.so.Split([char[]]@("`n"))[0]))
    $partes = $primeira.Split([char[]]@(' '), [System.StringSplitOptions]::RemoveEmptyEntries)
    if ($partes.Length -ge 3) { return $partes[2].Split([char[]]@('-'))[0] }
    return ''
}

function Test-Montador {
    $hf = Join-Path $script:Repo 'node_modules\hyperframes\bin\hyperframes.mjs'
    if (-not (Test-Path -LiteralPath $script:NodeExe) -or -not (Test-Path -LiteralPath $hf)) { return 'sem-montador' }
    $r = Invoke-Nativo -Exe $script:NodeExe -Argumentos @($hf, 'doctor', '--json') -Pasta $script:Repo
    $j = ConvertFrom-JsonSeguro $r.so
    if ($null -eq $j) { return 'sem-resposta' }
    $ruins = New-Object System.Collections.ArrayList
    foreach ($nome in @('Node.js', 'FFmpeg', 'FFprobe', 'Chrome')) {
        $achou = $null
        foreach ($c in @($j.checks)) { if ($c.name -eq $nome) { $achou = $c } }
        if ($null -eq $achou -or -not $achou.ok) { [void]$ruins.Add($nome) }
    }
    if ($ruins.Count -eq 0) { return 'ok' }
    return ($ruins.ToArray() -join ',')
}

function Test-Earshot {
    $e = Join-Path $script:Bin 'earshot.exe'
    if (-not (Test-Path -LiteralPath $e)) { return $false }
    $r = Invoke-Nativo -Exe $e -Argumentos @('doctor', '--json')
    $j = ConvertFrom-JsonSeguro $r.so
    if ($null -eq $j) { return $false }
    return (@($j.problems).Count -eq 0 -or $null -eq $j.problems)
}

function Get-FalaModelo {
    $f = Join-Path $script:Ferr 'kit-fala.json'
    if (-not (Test-Path -LiteralPath $f)) { return $null }
    try {
        $j = [System.IO.File]::ReadAllText($f) | ConvertFrom-Json
        if ($j.pronto -eq $true) { return [string]$j.modelo }
    } catch { }
    return $null
}

function Get-VersaoNode {
    if (-not (Test-Path -LiteralPath $script:NodeExe)) { return '' }
    $r = Invoke-Nativo -Exe $script:NodeExe -Argumentos @('-v')
    if ($r.codigo -ne 0) { return '' }
    return $r.so.Trim()
}

function Get-CaminhoGit {
    foreach ($c in @((Join-Path $env:LOCALAPPDATA 'Programs\Git\cmd\git.exe'), (Join-Path $env:ProgramFiles 'Git\cmd\git.exe'))) {
        if ($c -and (Test-Path -LiteralPath $c)) { return $c }
    }
    $g = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($g) { return $g.Source }
    return ''
}

function Get-PastaMesa {
    $desk = [Environment]::GetFolderPath('Desktop')
    if (-not $desk) { $desk = Join-Path $env:USERPROFILE 'Desktop' }
    return $desk
}

function Get-CaminhoAtalho { return (Join-Path (Get-PastaMesa) $script:NomeAtalho) }
function Get-CaminhoAtalhoPasta { return (Join-Path (Get-PastaMesa) $script:NomeAtalhoPasta) }

function Test-Rapido([string]$Id) {
    $e = Read-Estado $Id
    $pronto = ($null -ne $e -and $e.estado -eq 'pronto')
    switch ($Id) {
        'pasta' { return (Test-Path -LiteralPath $script:Bin) }
        'python' { return ((Test-Path -LiteralPath $script:UvExe) -and $pronto) }
        'node' { return ((Get-VersaoNode) -eq ('v' + (Vv 'NODE_VERSAO'))) }
        'ffmpeg' { return ((Test-Path -LiteralPath (Join-Path $script:Bin 'ffmpeg.exe')) -and $pronto) }
        'baixador' { return ((Test-Path -LiteralPath (Join-Path $script:Bin 'yt-dlp.exe')) -and $pronto) }
        'montador' { return ((Test-Path -LiteralPath (Join-Path $script:Repo 'node_modules\hyperframes\package.json')) -and $pronto) }
        'fala' { return ($null -ne (Get-FalaModelo)) }
        'ouvido' { return ((Test-Path -LiteralPath (Join-Path $script:Bin 'earshot.exe')) -and $pronto) }
        'git' { return ((Get-CaminhoGit) -ne '') }
        'referencias' { return $pronto }
        'atalho' { return (Test-Path -LiteralPath (Get-CaminhoAtalho)) }
    }
    return $false
}

# ---------------------------------------------------------------- resultado

function Reset-Resultado { $script:R = @{ ok = $false; codigo = 'DESCONHECIDO'; versao = ''; detalhe = ''; dados = @{}; origem = ''; kit = $null } }
function Set-Falha([string]$Codigo, $Dados = $null, [string]$Detalhe = '') {
    $script:R.ok = $false
    $script:R.codigo = $Codigo
    if ($null -ne $Dados) { $script:R.dados = $Dados }
    if ($Detalhe) { $script:R.detalhe = $Detalhe }
}
function Set-Sucesso([string]$Codigo = 'INSTALADO', [string]$Versao = '') {
    $script:R.ok = $true
    $script:R.codigo = $Codigo
    $script:R.versao = $Versao
}
function Test-Precisa([string]$Id, [bool]$Tem) {
    if ($Tem) { return $true }
    Diga ('Antes deste passo falta instalar: ' + $Id + '.')
    Set-Falha 'FALTA_PASSO_ANTERIOR' @{ falta = $Id }
    return $false
}

# ---------------------------------------------------------------- passos

function New-PastasFerramentas {
    try {
        foreach ($sub in @('bin', 'node', 'python', 'uv-tools', 'cache\uv', 'cache\hf', 'cache\earshot', 'cache\hyperframes', 'cache\npm', 'logs', 'estado', 'tmp')) {
            New-Item -ItemType Directory -Force -Path (Join-Path $script:Ferr $sub) | Out-Null
        }
        $teste = Join-Path $script:Ferr 'tmp\teste-escrita.txt'
        [System.IO.File]::WriteAllText($teste, 'ok')
        Remove-Item -LiteralPath $teste -Force
        return $true
    } catch {
        return $false
    }
}

function Invoke-PassoPasta {
    Diga 'Vou criar a pasta do estudio. Os programas ficam todos nela. Nada fora dela e mexido.'
    # Uma regra so: a pasta de ferramentas e <estudio-de-reels>\.ferramentas. Sem pasta reserva.
    $ok = New-PastasFerramentas
    if (-not $ok) { Set-Falha 'PERMISSAO_NEGADA' @{ pasta = $script:Ferr }; return }
    # No Windows, pasta com ponto na frente nao fica escondida sozinha: esconde para nao confundir o aluno.
    try {
        $item = Get-Item -LiteralPath $script:Ferr -Force
        $item.Attributes = $item.Attributes -bor [System.IO.FileAttributes]::Hidden
    } catch { }
    Initialize-Log 'pasta'
    Save-Config
    Diga ('Pronto: pasta criada em ' + $script:Ferr + '.')
    Set-Sucesso 'INSTALADO' ''
    $script:R.dados = @{ pasta = $script:Ferr }
}

function Invoke-PassoPython {
    Diga 'Vou instalar o Python. Ele roda a parte que escuta a sua fala. Fica so na pasta do estudio.'
    $triple = 'x86_64-pc-windows-msvc'
    if ($script:Arq -eq 'arm64') { $triple = 'aarch64-pc-windows-msvc' }
    $ver = Vv 'UV_VERSAO'
    $base = 'https://github.com/astral-sh/uv/releases/download/' + $ver + '/uv-' + $triple + '.zip'
    $tem = ''
    if (Test-Path -LiteralPath $script:UvExe) {
        $r = Invoke-Nativo -Exe $script:UvExe -Argumentos @('--version')
        if ($r.codigo -eq 0) { $tem = $r.so.Trim() }
    }
    if (-not ($tem -eq ('uv ' + $ver) -or $tem.StartsWith('uv ' + $ver + ' '))) {
        Diga 'Baixando o instalador do Python (uns 15 MB)...'
        $c = Get-Arquivo ($base + '.sha256') (Join-Path $script:Tmp 'uv.sha256')
        if ($c) { Set-Falha $c @{ nome = 'Python' }; return }
        $sha = ([System.IO.File]::ReadAllText((Join-Path $script:Tmp 'uv.sha256')).Trim().Split([char[]]@(' ', "`t"))[0])
        if ($sha.Length -ne 64) { Set-Falha 'ARQUIVO_DIFERENTE' @{ nome = 'Python' }; return }
        $c = Get-Arquivo $base (Join-Path $script:Tmp 'uv.zip') $sha
        if ($c) { Set-Falha $c @{ nome = 'Python'; arquivo = 'uv.zip' }; return }
        if (-not (Expand-Zip (Join-Path $script:Tmp 'uv.zip') (Join-Path $script:Tmp 'uv'))) { Set-Falha 'DOWNLOAD_FALHOU' @{ nome = 'Python' }; return }
        foreach ($n in @('uv.exe', 'uvx.exe')) {
            $c = Copy-Programa (Join-Path $script:Tmp 'uv') $n
            if ($c) { Set-Falha $c @{ nome = 'Python'; arquivo = $n }; return }
        }
        $null = Copy-Programa (Join-Path $script:Tmp 'uv') 'uvw.exe'
    }
    Diga 'Instalando o Python 3.12 (uns 30 MB)...'
    $r = Invoke-Nativo -Exe $script:UvExe -Argumentos @('python', 'install', $script:PythonPedido) -Pasta $script:Ferr
    if ($r.codigo -ne 0) {
        if ($r.erro -eq 'ANTIVIRUS_BLOQUEOU') { Set-Falha 'ANTIVIRUS_BLOQUEOU' @{ nome = 'Python'; arquivo = 'uv.exe' }; return }
        Diga 'A internet oscilou. Vou tentar de novo.'
        $r = Invoke-Nativo -Exe $script:UvExe -Argumentos @('python', 'install', $script:PythonPedido) -Pasta $script:Ferr
        if ($r.codigo -ne 0) { Set-Falha 'DOWNLOAD_FALHOU' @{ nome = 'Python' }; return }
    }
    Diga 'Conferindo o Python...'
    $r = Invoke-Nativo -Exe $script:UvExe -Argumentos @('run', '--no-project', '--python', $script:PythonPedido, 'python', '-c', "import sys;print('ok', sys.version.split()[0])") -Pasta $script:Ferr
    $saida = $r.so.Trim()
    if ($saida.StartsWith('ok ')) {
        Diga ('Pronto: Python ' + $saida.Substring(3) + ' instalado.')
        Set-Sucesso 'INSTALADO' $saida.Substring(3)
    } else {
        Set-Falha 'DESCONHECIDO' @{ nome = 'Python' }
    }
}

function Invoke-PassoNode {
    Diga 'Vou instalar o Node. E o motor que monta os videos. Fica so na pasta do estudio.'
    $ver = Vv 'NODE_VERSAO'
    $plat = 'win-x64'
    if ($script:Arq -eq 'arm64') { $plat = 'win-arm64' }
    $nome = 'node-v' + $ver + '-' + $plat
    $base = 'https://nodejs.org/dist/v' + $ver
    if ((Get-VersaoNode) -ne ('v' + $ver)) {
        Diga 'Baixando o Node (uns 30 MB)...'
        $somas = Join-Path $script:Tmp 'node-sums.txt'
        $c = Get-Arquivo ($base + '/SHASUMS256.txt') $somas
        if ($c) { Set-Falha $c @{ nome = 'Node' }; return }
        $sha = Find-HashNaLista $somas ($nome + '.zip')
        if (-not $sha) { Set-Falha 'ARQUIVO_DIFERENTE' @{ nome = 'Node' }; return }
        $zip = Join-Path $script:Tmp 'node.zip'
        $c = Get-Arquivo ($base + '/' + $nome + '.zip') $zip $sha
        if ($c) { Set-Falha $c @{ nome = 'Node'; arquivo = ($nome + '.zip') }; return }
        Diga 'Conferi: o arquivo chegou certinho. Abrindo...'
        $pasta = Join-Path $script:Tmp 'node'
        if (-not (Expand-Zip $zip $pasta)) { Set-Falha 'DOWNLOAD_FALHOU' @{ nome = 'Node' }; return }
        $dentro = Join-Path $pasta $nome
        if (-not (Test-Path -LiteralPath (Join-Path $dentro 'node.exe'))) { Set-Falha 'ANTIVIRUS_BLOQUEOU' @{ nome = 'Node'; arquivo = 'node.exe' }; return }
        $destino = Join-Path $script:Ferr 'node'
        try {
            if (Test-Path -LiteralPath $destino) { Move-Item -LiteralPath $destino -Destination (Join-Path $script:Tmp 'node-antigo') }
            Move-Item -LiteralPath $dentro -Destination $destino
        } catch {
            Set-Falha (Get-CodigoExcecao $_) @{ nome = 'Node'; arquivo = $destino; pasta = $script:Ferr }
            return
        }
    }
    $v = Get-VersaoNode
    if (-not $v.StartsWith('v24.')) { Set-Falha 'DESCONHECIDO' @{ nome = 'Node' } ('versao ' + $v); return }
    if (-not (Test-Path -LiteralPath $script:NpmCmd)) { Set-Falha 'DESCONHECIDO' @{ nome = 'Node' } 'sem npm'; return }
    Diga ('Pronto: Node ' + $v + ' instalado.')
    Set-Sucesso 'INSTALADO' $v
}

# SHA256 de um zip pelo checksums.sha256 que o BtbN publica na mesma release. Devolve '' se nao achar.
function Get-ShaDaRelease([string]$Url) {
    $corte = $Url.LastIndexOf('/')
    if ($corte -lt 0) { return '' }
    $somas = Join-Path $script:Tmp 'ffmpeg-checksums.sha256'
    $c = Get-Arquivo ($Url.Substring(0, $corte + 1) + 'checksums.sha256') $somas
    if ($c) { return '' }
    return (Find-HashNaLista $somas $Url.Substring($corte + 1))
}

function Install-FfmpegWindows([string]$Url, [string]$Sha) {
    # Programa executavel nunca entra sem conferencia de SHA256.
    if (-not $Sha) { $Sha = Get-ShaDaRelease $Url }
    if (-not $Sha -or $Sha.Length -ne 64) { return 'ARQUIVO_DIFERENTE' }
    Diga 'Baixando a tesoura de video (uns 110 MB)...'
    $zip = Join-Path $script:Tmp 'ffmpeg.zip'
    $c = Get-Arquivo $Url $zip $Sha
    if ($c) { return $c }
    $pasta = Join-Path $script:Tmp 'ff'
    if (-not (Expand-Zip $zip $pasta)) { return 'DOWNLOAD_FALHOU' }
    foreach ($n in @('ffmpeg.exe', 'ffprobe.exe')) {
        $c = Copy-Programa $pasta $n
        if ($c) { return $c }
    }
    return ''
}

function Invoke-PassoFfmpeg {
    Diga 'Vou instalar o FFmpeg, a tesoura que corta o video e acerta o som.'
    if ((Test-FfmpegCompleto) -eq 0) {
        Diga 'A tesoura ja estava instalada e completa.'
        Set-Sucesso 'INSTALADO' (Get-VersaoFfmpeg)
        return
    }
    $sufixo = 'X64'
    if ($script:Arq -eq 'arm64') { $sufixo = 'ARM64' }
    $tentativas = @(
        @{ url = (Vv ('FFMPEG_WIN_URL_' + $sufixo)); sha = (Vv ('FFMPEG_WIN_SHA256_' + $sufixo)) },
        @{ url = (Vv ('FFMPEG_WIN_RESERVA_' + $sufixo)); sha = (Vv ('FFMPEG_WIN_RESERVA_SHA256_' + $sufixo)) }
    )
    $ultimo = 'DOWNLOAD_FALHOU'
    $primeira = $true
    foreach ($t in $tentativas) {
        if (-not $t.url) { continue }
        if (-not $primeira) { Diga 'Vou baixar outra versao da tesoura.' }
        $primeira = $false
        $c = Install-FfmpegWindows $t.url $t.sha
        if ($c) { $ultimo = $c; continue }
        Diga 'Conferindo se a tesoura veio com todas as pecas...'
        $rc = Test-FfmpegCompleto
        if ($rc -eq 0) {
            $v = Get-VersaoFfmpeg
            Diga ('Pronto: FFmpeg ' + $v + ' instalado.')
            Set-Sucesso 'INSTALADO' $v
            return
        }
        if ($rc -eq 2) { $ultimo = 'FFMPEG_INCOMPLETO'; Diga 'A tesoura de video veio sem uma peca que eu preciso.' }
        elseif ($rc -eq 3) { $ultimo = 'ANTIVIRUS_BLOQUEOU' }
        else { $ultimo = 'DESCONHECIDO' }
    }
    Set-Falha $ultimo @{ nome = 'FFmpeg'; arquivo = 'ffmpeg.exe' }
}

function Invoke-PassoBaixador {
    Diga 'Vou instalar o baixador de videos. Ele traz os videos de exemplo para voce estudar.'
    $ver = Vv 'YTDLP_VERSAO'
    $base = 'https://github.com/yt-dlp/yt-dlp/releases/download/' + $ver
    $original = 'yt-dlp.exe'
    if ($script:Arq -eq 'arm64') { $original = 'yt-dlp_arm64.exe' }
    $exe = Join-Path $script:Bin 'yt-dlp.exe'
    $v = ''
    if (Test-Path -LiteralPath $exe) {
        $r = Invoke-Nativo -Exe $exe -Argumentos @('--version')
        if ($r.codigo -eq 0) { $v = $r.so.Trim() }
    }
    if ($v -ne $ver) {
        Diga 'Baixando o baixador de videos (uns 25 MB)...'
        $somas = Join-Path $script:Tmp 'ytdlp-sums.txt'
        $c = Get-Arquivo ($base + '/SHA2-256SUMS') $somas
        if ($c) { Set-Falha $c @{ nome = 'baixador de videos' }; return }
        $sha = Find-HashNaLista $somas $original
        if (-not $sha) { Set-Falha 'ARQUIVO_DIFERENTE' @{ nome = 'baixador de videos' }; return }
        $baixado = Join-Path $script:Tmp $original
        $c = Get-Arquivo ($base + '/' + $original) $baixado $sha
        if ($c) { Set-Falha $c @{ nome = 'baixador de videos'; arquivo = $original }; return }
        $c = Copy-Programa $script:Tmp $original 'yt-dlp.exe'
        if ($c) { Set-Falha $c @{ nome = 'baixador de videos'; arquivo = 'yt-dlp.exe' }; return }
        $r = Invoke-Nativo -Exe $exe -Argumentos @('--version')
        if ($r.codigo -ne 0) {
            $cod = 'DESCONHECIDO'
            if ($r.erro) { $cod = $r.erro }
            Set-Falha $cod @{ nome = 'baixador de videos'; arquivo = 'yt-dlp.exe' }
            return
        }
        $v = $r.so.Trim()
    }
    # O yt-dlp le este arquivo como o shell (shlex): sem aspas ele come a barra invertida e corta no espaco.
    # Por isso: barra normal e aspas simples (a aspa simples de dentro vira '\'').
    $caminhoNode = 'node:' + $script:NodeExe.Replace('\', '/')
    $linhaConf = "--js-runtimes '" + $caminhoNode.Replace("'", "'\''") + "'"
    try { [System.IO.File]::WriteAllText((Join-Path $script:Ferr 'yt-dlp.conf'), ($linhaConf + "`r`n"), $script:Utf8) } catch { }
    Diga ('Pronto: baixador de videos ' + $v + ' instalado.')
    Set-Sucesso 'INSTALADO' $v
}

function Invoke-PassoMontador {
    Diga 'Vou instalar o montador de video. Ele desenha as telas e monta o Reel.'
    Diga 'Ele vem com um navegador escondido, que nao mexe no seu Chrome.'
    if (-not (Test-Precisa 'node' ((Test-Path -LiteralPath $script:NodeExe) -and (Test-Path -LiteralPath $script:NpmCmd)))) { return }
    if (-not (Test-Precisa 'ffmpeg' (Test-Path -LiteralPath (Join-Path $script:Bin 'ffmpeg.exe')))) { return }
    $hf = Join-Path $script:Repo 'node_modules\hyperframes\bin\hyperframes.mjs'
    # Versoes fixas de toda a arvore: so "npm ci" com o package-lock.json que vem no estudio.
    if (-not (Test-Path -LiteralPath (Join-Path $script:Repo 'package-lock.json'))) { Set-Falha 'MONTADOR_FALHOU' $null 'sem package-lock.json'; return }
    $ok = $false
    for ($t = 1; $t -le 2; $t++) {
        Diga 'Baixando as pecas do montador (uns 150 MB). Pode levar alguns minutos...'
        $r = Invoke-Bat -Bat $script:NpmCmd -Argumentos @('ci', '--no-audit', '--no-fund') -Pasta $script:Repo
        if ($r.codigo -eq 0) { $ok = $true; break }
        Diga 'O montador de video nao ficou pronto. Vou instalar de novo.'
    }
    if (-not $ok -or -not (Test-Path -LiteralPath $hf)) { Set-Falha 'MONTADOR_FALHOU'; return }
    Diga 'Baixando o navegador escondido (uns 150 MB)...'
    $r = Invoke-Nativo -Exe $script:NodeExe -Argumentos @($hf, 'browser', 'ensure') -Pasta $script:Repo
    if ($r.codigo -ne 0) {
        Diga 'O navegador escondido nao baixou. Vou tentar de novo.'
        $r = Invoke-Nativo -Exe $script:NodeExe -Argumentos @($hf, 'browser', 'ensure', '--force') -Pasta $script:Repo
        if ($r.codigo -ne 0) { Set-Falha 'NAVEGADOR_FALHOU'; return }
    }
    Diga 'Conferindo o montador...'
    $res = Test-Montador
    if ($res -ne 'ok') {
        if ($res.Contains('Chrome')) { Set-Falha 'NAVEGADOR_FALHOU' $null $res } else { Set-Falha 'MONTADOR_FALHOU' $null $res }
        return
    }
    $v = ''
    try { $v = [string](([System.IO.File]::ReadAllText((Join-Path $script:Repo 'node_modules\hyperframes\package.json'))) | ConvertFrom-Json).version } catch { }
    Diga ('Pronto: montador de video ' + $v + ' instalado.')
    Set-Sucesso 'INSTALADO' $v
}

function Invoke-PassoFala {
    Diga 'Vou instalar o ouvido de texto. Ele escuta a sua fala e escreve a legenda, palavra por palavra.'
    Diga 'E grande (uns 2 GB). Pode levar uns minutos.'
    if (-not (Test-Precisa 'python' (Test-Path -LiteralPath $script:UvExe))) { return }
    if (-not (Test-Precisa 'node' (Test-Path -LiteralPath $script:NodeExe))) { return }
    Set-Progresso 'instalando o programa'
    $argsSync = @('sync', '--project', $script:Repo, '--no-dev', '--python', $script:PythonPedido)
    if (Test-Path -LiteralPath (Join-Path $script:Repo 'uv.lock')) { $argsSync += '--frozen' }
    $r = Invoke-Nativo -Exe $script:UvExe -Argumentos $argsSync -Pasta $script:Repo
    if ($r.codigo -ne 0) {
        Diga 'O ouvido de texto nao terminou de instalar. Vou tentar de novo.'
        $r = Invoke-Nativo -Exe $script:UvExe -Argumentos $argsSync -Pasta $script:Repo
        if ($r.codigo -ne 0) { Set-Falha 'FALA_FALHOU'; return }
    }
    Set-Progresso 'baixando o modelo de fala'
    Diga 'Baixando o modelo que entende portugues...'
    $wrapper = Join-Path $script:Repo 'estudio.cmd'
    $r = Invoke-Bat -Bat $wrapper -Argumentos @('preparar-fala', '--modelo', 'auto') -Pasta $script:Repo
    $j = ConvertFrom-JsonSeguro (Get-UltimaLinha $r.so)
    if ($null -eq $j -or $j.ok -ne $true) {
        Diga 'O modelo nao terminou de baixar. Vou tentar de novo.'
        $r = Invoke-Bat -Bat $wrapper -Argumentos @('preparar-fala', '--modelo', 'auto') -Pasta $script:Repo
    }
    $modelo = Get-FalaModelo
    if ($null -ne $modelo) {
        Diga ('Pronto: ouvido de texto instalado (modelo ' + $modelo + ').')
        Set-Sucesso 'INSTALADO' $modelo
    } else {
        Set-Falha 'FALA_FALHOU'
    }
}

function Invoke-PassoOuvido {
    if ($script:Arq -eq 'arm64') {
        Diga 'O ouvido de som nao existe para Windows ARM. O video sai igual.'
        $script:R.ok = $true
        $script:R.codigo = 'OUVIDO_NAO_SUPORTADO'
        $script:R.dados = @{ tipo = 'Windows ARM' }
        return
    }
    Diga 'Vou instalar o ouvido de som. Ele escuta o video pronto e avisa se a musica esta alta ou se o som sumiu.'
    Diga 'E grande (uns 2,4 GB). Pode levar uns minutos.'
    if (-not (Test-Precisa 'python' (Test-Path -LiteralPath $script:UvExe))) { return }
    $spec = 'earshot @ https://github.com/Leonxlnx/earshot/archive/' + (Vv 'EARSHOT_COMMIT') + '.zip'
    Set-Progresso 'instalando o programa'
    $r = Invoke-Nativo -Exe $script:UvExe -Argumentos @('tool', 'install', '--python', (Vv 'PYTHON_VERSAO'), $spec) -Pasta $script:Ferr
    if ($r.codigo -ne 0) {
        Diga 'O ouvido de som nao instalou de primeira. Vou tentar de novo.'
        $r = Invoke-Nativo -Exe $script:UvExe -Argumentos @('tool', 'install', '--force', '--python', (Vv 'PYTHON_VERSAO'), $spec) -Pasta $script:Ferr
        if ($r.codigo -ne 0) { Set-Falha 'OUVIDO_FALHOU'; return }
    }
    $earshot = Join-Path $script:Bin 'earshot.exe'
    if (-not (Test-Path -LiteralPath $earshot)) { Set-Falha 'ANTIVIRUS_BLOQUEOU' @{ nome = 'ouvido de som'; arquivo = 'earshot.exe' }; return }
    Set-Progresso 'baixando os modelos de som'
    Diga 'Baixando os modelos do ouvido de som (uns 1,1 GB)...'
    $r = Invoke-Nativo -Exe $earshot -Argumentos @('doctor', '--fetch')
    if ($r.codigo -ne 0) { $r = Invoke-Nativo -Exe $earshot -Argumentos @('doctor', '--fetch') }
    Diga 'Conferindo o ouvido de som...'
    if (-not (Test-Earshot)) {
        $r = Invoke-Nativo -Exe $earshot -Argumentos @('doctor', '--fetch')
        if (-not (Test-Earshot)) { Set-Falha 'OUVIDO_FALHOU'; return }
    }
    Diga 'Pronto: ouvido de som instalado.'
    Set-Sucesso 'INSTALADO' ((Vv 'EARSHOT_COMMIT').Substring(0, 7))
}

function Invoke-PassoGit {
    Diga 'Vou instalar o Git, que e opcional. Ele deixa o Claude mais rapido no Windows.'
    Diga 'O Windows pode abrir uma janela perguntando se permite alteracoes. Sim ou Nao: as duas funcionam.'
    $g = Get-CaminhoGit
    if ($g) {
        $r = Invoke-Nativo -Exe $g -Argumentos @('--version')
        Diga 'O Git ja estava instalado.'
        Set-Sucesso 'INSTALADO' $r.so.Trim()
        return
    }
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (-not $winget) { Set-Falha 'GIT_INDISPONIVEL'; return }
    $id = Vv 'GIT_WINGET_ID'
    if (-not $id) { $id = 'Git.Git' }
    $r = Invoke-Nativo -Exe $winget.Source -Argumentos @('install', '--id', $id, '-e', '--scope', 'user', '--silent', '--disable-interactivity', '--accept-package-agreements', '--accept-source-agreements')
    $g = Get-CaminhoGit
    if (-not $g) { Set-Falha 'GIT_INDISPONIVEL' $null ('winget saiu com ' + $r.codigo); return }
    $r = Invoke-Nativo -Exe $g -Argumentos @('--version')
    Diga 'Pronto: Git instalado.'
    Set-Sucesso 'INSTALADO' $r.so.Trim()
}

function Invoke-PassoReferencias {
    Diga 'Vou baixar os videos de exemplo para a pasta 1-referencias. Eles ficam so no seu computador.'
    if (-not (Test-Precisa 'node' (Test-Path -LiteralPath $script:NodeExe))) { return }
    if (-not (Test-Precisa 'baixador' (Test-Path -LiteralPath (Join-Path $script:Bin 'yt-dlp.exe')))) { return }
    $r = Invoke-Bat -Bat (Join-Path $script:Repo 'estudio.cmd') -Argumentos @('referencias', '--baixar-exemplos') -Pasta $script:Repo
    $ult = Get-UltimaLinha $r.so
    $j = ConvertFrom-JsonSeguro $ult
    if ($null -ne $j) { $script:R.origem = 'kit'; $script:R.kit = $j }
    if ($null -ne $j -and $j.ok -eq $true) {
        Diga 'Pronto: videos de exemplo baixados.'
        Set-Sucesso 'INSTALADO' ''
    } else {
        $cod = 'DESCONHECIDO'
        if ($null -ne $j -and $j.codigo) { $cod = [string]$j.codigo }
        Set-Falha $cod
    }
}

function Invoke-PassoAtalho {
    Read-Config
    $agente = $script:CfgAgente
    if ($script:Agente) { $agente = $script:Agente }
    if (-not $agente) { $agente = 'claude' }
    $nome = 'Claude'
    if ($agente -eq 'codex') { $nome = 'Codex' }
    Diga ('Vou por dois atalhos na sua Area de Trabalho: "Abrir o Estudio", que abre o ' + $nome + ' ja na pasta certa, e "Estudio de Reels", que abre a pasta dos seus videos.')
    # Caminho absoluto do agente, achado aqui dentro da sessao (onde ele ja funciona). So programa (.exe/.cmd), nunca .ps1.
    $abs = ''
    $achado = Get-Command $agente -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($achado -and $achado.Source) { $abs = [string]$achado.Source }
    $arq = Get-CaminhoAtalho
    # chcp 65001 + arquivo em UTF-8 sem BOM: o caminho da pasta funciona mesmo com acento.
    # O caminho absoluto vem primeiro; a busca no PATH fica so como reserva.
    $linhas = @(
        '@echo off',
        'chcp 65001 >nul',
        'rem Abre o Estudio de Reels. Criado pelo instalador do estudio.',
        ('cd /d "' + $script:Repo + '" || goto sempasta'),
        ('set "AGENTE=' + $abs + '"'),
        'if not defined AGENTE goto procurar',
        'if not exist "%AGENTE%" goto procurar',
        'call "%AGENTE%"',
        'exit /b 0',
        ':procurar',
        ('where ' + $agente + ' >nul 2>nul'),
        'if errorlevel 1 goto falta',
        ('call ' + $agente),
        'exit /b 0',
        ':falta',
        ('echo Nao achei o ' + $nome + ' neste computador. Abra o ' + $nome + ' do jeito que abriu no primeiro dia.'),
        'pause',
        'exit /b 1',
        ':sempasta',
        'echo Nao achei a pasta do estudio.',
        'pause',
        'exit /b 1'
    )
    try {
        [System.IO.File]::WriteAllText($arq, (($linhas -join "`r`n") + "`r`n"), $script:Utf8)
    } catch {
        Set-Falha (Get-CodigoExcecao $_) @{ pasta = (Split-Path -Parent $arq) }
        return
    }
    # Atalho para a pasta do estudio (um .lnk comum do Windows).
    $lnk = Get-CaminhoAtalhoPasta
    try {
        $ws = New-Object -ComObject WScript.Shell
        $s = $ws.CreateShortcut($lnk)
        $s.TargetPath = $script:Repo
        $s.Save()
    } catch {
        $script:R.detalhe = 'sem atalho da pasta'
    }
    Diga 'Pronto: atalhos criados.'
    Set-Sucesso 'INSTALADO' ''
    $script:R.dados = @{ atalho = $arq; atalho_pasta = $lnk; agente_caminho = $abs }
}

function Invoke-PassoPastas {
    Diga 'Vou abrir as suas 3 pastas.'
    foreach ($p in @('1-referencias', '2-videos-brutos', '3-videos-prontos')) {
        $c = Join-Path $script:Repo $p
        try { New-Item -ItemType Directory -Force -Path $c | Out-Null } catch { Set-Falha 'PERMISSAO_NEGADA' @{ pasta = $c }; return }
    }
    foreach ($p in @('3-videos-prontos', '2-videos-brutos', '1-referencias')) {
        try { Invoke-Item -LiteralPath (Join-Path $script:Repo $p) } catch { $script:R.detalhe = ('nao abriu ' + $p) }
    }
    Set-Sucesso 'INSTALADO' ''
}

# ---------------------------------------------------------------- acoes

function Exit-Passo([string]$Id) {
    $o = [ordered]@{ passo = $Id; ok = [bool]$script:R.ok; codigo = $script:R.codigo; versao = $script:R.versao; detalhe = $script:R.detalhe; dados = $script:R.dados }
    if ($script:R.origem) { $o.origem = $script:R.origem; $o.kit = $script:R.kit }
    Remove-Tmp
    if ($script:R.ok) { Sair $o 0 } else { Sair $o 1 }
}

function Invoke-AcaoPasso([string]$Id) {
    $script:PassoAtual = $Id
    Reset-Resultado
    if ($script:Passos -notcontains $Id) { $script:R.codigo = 'PASSO_DESCONHECIDO'; $script:R.detalhe = $Id; Exit-Passo $Id }
    if ($Id -ne 'pasta' -and -not (Test-Path -LiteralPath $script:Estado)) {
        $script:R.codigo = 'FALTA_PASSO_ANTERIOR'; $script:R.dados = @{ falta = 'pasta' }
        Exit-Passo $Id
    }
    if ($Id -ne 'pasta') { Initialize-Log $Id; Save-Config }
    $anterior = Read-Estado $Id
    if (@('pastas', 'atalho', 'git') -notcontains $Id) {
        if ($null -ne $anterior -and $anterior.estado -eq 'pronto' -and (Test-Rapido $Id)) {
            Diga 'Ja estava pronto. Nao precisa baixar de novo.'
            Set-Sucesso 'JA_PRONTO' ([string]$anterior.versao)
            Exit-Passo $Id
        }
    }
    if (Test-Path -LiteralPath $script:Estado) {
        try { [System.IO.File]::WriteAllText((Join-Path $script:Estado ($Id + '.pid')), [string]$PID) } catch { }
        Save-Estado $Id 'rodando' '' 'comecando' ''
    }
    Initialize-Tmp
    try {
        switch ($Id) {
            'pasta' { $null = Invoke-PassoPasta }
            'python' { $null = Invoke-PassoPython }
            'node' { $null = Invoke-PassoNode }
            'ffmpeg' { $null = Invoke-PassoFfmpeg }
            'baixador' { $null = Invoke-PassoBaixador }
            'montador' { $null = Invoke-PassoMontador }
            'fala' { $null = Invoke-PassoFala }
            'ouvido' { $null = Invoke-PassoOuvido }
            'git' { $null = Invoke-PassoGit }
            'referencias' { $null = Invoke-PassoReferencias }
            'atalho' { $null = Invoke-PassoAtalho }
            'pastas' { $null = Invoke-PassoPastas }
        }
    } catch {
        Write-Log ('erro: ' + $_.Exception.Message)
        Set-Falha (Get-CodigoExcecao $_) $null $_.Exception.Message
    }
    if ($script:R.ok) {
        if ($script:R.codigo -eq 'OUVIDO_NAO_SUPORTADO') { Save-Estado $Id 'nao_suportado' $script:R.codigo 'nao existe para este computador' '' }
        else { Save-Estado $Id 'pronto' $script:R.codigo 'pronto' $script:R.versao }
    } else {
        Save-Estado $Id 'erro' $script:R.codigo 'parou' $script:R.versao
        if ($script:Log) { Diga ('Nao deu certo (' + $script:R.codigo + '). Detalhes guardados em ' + $script:Log + '.') }
    }
    $pidArq = Join-Path $script:Estado ($Id + '.pid')
    if (Test-Path -LiteralPath $pidArq) { try { Remove-Item -LiteralPath $pidArq -Force } catch { } }
    Exit-Passo $Id
}

function Invoke-AcaoChecar {
    Diga 'Olhando o computador, sem instalar nada...'
    $probs = New-Object System.Collections.ArrayList
    $ok = $true
    $build = Get-Build
    $minimo = 19045
    if (Vv 'WINDOWS_BUILD_MINIMO') { $minimo = [int](Vv 'WINDOWS_BUILD_MINIMO') }
    $versaoSo = [System.Environment]::OSVersion.Version.ToString()
    if ($build -lt $minimo -or -not (Test-Path -LiteralPath $script:Curl) -or -not (Test-Path -LiteralPath $script:Tar)) {
        [void]$probs.Add([ordered]@{ codigo = 'SISTEMA_ANTIGO'; tipo = 'bloqueia'; dados = @{ versao = ((Get-NomeSistema) + ' (' + $versaoSo + ')'); minimo = 'Windows 10 22H2' } })
        $ok = $false
    } elseif ($script:Arq -eq 'arm64' -and $build -lt 22000) {
        # Windows 10 ARM nao emula programas x64 (o Python do ouvido de texto e o navegador escondido precisam disso).
        [void]$probs.Add([ordered]@{ codigo = 'SISTEMA_ANTIGO'; tipo = 'bloqueia'; dados = @{ versao = ((Get-NomeSistema) + ' (' + $versaoSo + ')'); minimo = 'Windows 11' } })
        $ok = $false
    }

    $prontosMb = 0
    foreach ($id in $script:Passos) { if (Test-Rapido $id) { $prontosMb += (Get-TamanhoMb $id) } }
    $precisa = [double](Vv 'ESPACO_MINIMO_GB') - ($prontosMb / 1024)
    $minVer = [double](Vv 'ESPACO_MINIMO_VERIFICAR_GB')
    if ($precisa -lt $minVer) { $precisa = $minVer }
    $precisa = [math]::Round($precisa, 1)
    $livre = Get-EspacoLivreGb
    if ($livre -lt $precisa) {
        [void]$probs.Add([ordered]@{ codigo = 'POUCO_ESPACO'; tipo = 'bloqueia'; dados = @{ livre_gb = $livre; precisa_gb = $precisa } })
        $ok = $false
    }

    $mem = Get-MemoriaGb
    if ($mem -lt [double](Vv 'MEMORIA_MINIMA_GB')) {
        [void]$probs.Add([ordered]@{ codigo = 'POUCA_MEMORIA'; tipo = 'aviso'; dados = @{ memoria_gb = $mem } })
    }

    # Internet. Caixa = o endereco foi achado (o curl chegou a tentar conectar, codigo 7) mas o sistema negou
    # a conexao. E o que a area protegida do Codex faz; ai o certo e pedir internet ao Codex, nao culpar o Wi-Fi.
    $internet = $false
    $codNet = 'SEM_INTERNET'
    if (Test-Path -LiteralPath $script:Curl) {
        $r = Invoke-Nativo -Exe $script:Curl -Argumentos @('-fsSI', '--max-time', '10', 'https://nodejs.org/dist/') -Pasta $env:TEMP
        $internet = ($r.codigo -eq 0)
        if (-not $internet) {
            $saidaNet = [string]$r.saida
            if ($env:CODEX_SANDBOX_NETWORK_DISABLED -eq '1') { $codNet = 'INTERNET_BLOQUEADA_PELA_CAIXA' }
            elseif ($r.codigo -eq 7 -and ($saidaNet.Contains('Permission denied') -or $saidaNet.Contains('not permitted'))) { $codNet = 'INTERNET_BLOQUEADA_PELA_CAIXA' }
        }
    }
    if (-not $internet) {
        [void]$probs.Add([ordered]@{ codigo = $codNet; tipo = 'bloqueia'; dados = @{} })
        $ok = $false
    }

    $destino = Get-DestinoDoRepo
    $nuvem = Get-NuvemDoCaminho $script:Repo
    if ($nuvem) {
        [void]$probs.Add([ordered]@{ codigo = 'PASTA_NA_NUVEM'; tipo = 'acao'; dados = @{ nuvem = $nuvem; caminho = $destino; acao = 'mudar-pasta' } })
        $ok = $false
    } elseif (-not (Test-EstudioNomeSeguro (Get-EstudioNomeDoUsuario))) {
        if (-not $script:Repo.StartsWith('C:\EstudioDeReels\', [System.StringComparison]::OrdinalIgnoreCase)) {
            [void]$probs.Add([ordered]@{ codigo = 'NOME_COM_ACENTO'; tipo = 'acao'; dados = @{ caminho = 'C:\EstudioDeReels'; acao = 'mudar-pasta' } })
            $ok = $false
        }
    }

    if ($script:Arq -eq 'arm64') {
        [void]$probs.Add([ordered]@{ codigo = 'OUVIDO_NAO_SUPORTADO'; tipo = 'aviso'; dados = @{ tipo = 'Windows ARM' } })
    }

    $o = [ordered]@{
        acao = 'checar'; ok = $ok; sistema = 'windows'; arquitetura = $script:Arq; versao_sistema = $versaoSo
        nome_sistema = (Get-NomeSistema); espaco_gb = $livre; memoria_gb = $mem; internet = $internet
        repo_dir = $script:Repo; ferramentas_dir = $script:Ferr; problemas = $probs.ToArray()
    }
    if ($ok) { Sair $o 0 } else { Sair $o 1 }
}

function Invoke-AcaoPlano {
    Read-Config
    $agente = $script:CfgAgente
    if ($script:Agente) { $agente = $script:Agente }
    $itens = New-Object System.Collections.ArrayList
    foreach ($id in $script:Passos) {
        if ($id -eq 'git' -and $agente -eq 'codex') { continue }
        $est = 'falta'
        if ($id -eq 'ouvido' -and $script:Arq -eq 'arm64') {
            $est = 'nao_suportado'
        } else {
            $e = Read-Estado $id
            $estAnt = ''
            if ($null -ne $e) { $estAnt = [string]$e.estado }
            if (@('pasta', 'node', 'fala', 'atalho', 'git') -contains $id) { if (Test-Rapido $id) { $est = 'pronto' } }
            elseif ($id -eq 'pastas') { if ($estAnt -eq 'pronto') { $est = 'pronto' } }
            elseif ($estAnt -eq 'pronto' -and (Test-Rapido $id)) { $est = 'pronto' }
            if ($estAnt -eq 'rodando' -and $est -ne 'pronto') { $est = 'rodando' }
        }
        $numero = 0
        if ($script:Numeros.ContainsKey($id)) { $numero = $script:Numeros[$id] }
        [void]$itens.Add([ordered]@{ id = $id; estado = $est; obrigatorio = (Test-Obrigatorio $id); tamanho_mb = (Get-TamanhoMb $id); segundo_plano = (Test-SegundoPlano $id); numero = $numero })
    }
    $totalProgramas = 8
    if ($agente -eq 'codex') { $totalProgramas = 7 }
    Sair ([ordered]@{ acao = 'plano'; sistema = 'windows'; arquitetura = $script:Arq; total_programas = $totalProgramas; passos = $itens.ToArray() }) 0
}

function Test-PidVivo([string]$Id) {
    $f = Join-Path $script:Estado ($Id + '.pid')
    if (-not (Test-Path -LiteralPath $f)) { return $false }
    $n = 0
    if (-not [int]::TryParse(([System.IO.File]::ReadAllText($f)).Trim(), [ref]$n)) { return $false }
    return ($null -ne (Get-Process -Id $n -ErrorAction SilentlyContinue))
}

function Invoke-AcaoSegundoPlano([string]$Id) {
    if (@('fala', 'ouvido') -notcontains $Id) { Sair ([ordered]@{ passo = $Id; iniciado = $false; log = ''; codigo = 'PASSO_DESCONHECIDO' }) 1 }
    if (-not (Test-Path -LiteralPath $script:Estado)) { Sair ([ordered]@{ passo = $Id; iniciado = $false; log = ''; codigo = 'FALTA_PASSO_ANTERIOR'; dados = @{ falta = 'pasta' } }) 1 }
    $logf = Join-Path $script:Logs ($Id + '.log')
    $e = Read-Estado $Id
    if ($null -ne $e -and $e.estado -eq 'rodando' -and (Test-PidVivo $Id)) { Sair ([ordered]@{ passo = $Id; iniciado = $true; ja_rodando = $true; log = $logf }) 0 }
    if ($null -ne $e -and $e.estado -eq 'pronto' -and (Test-Rapido $Id)) { Sair ([ordered]@{ passo = $Id; iniciado = $true; ja_pronto = $true; log = $logf }) 0 }
    if ($Id -eq 'ouvido' -and $script:Arq -eq 'arm64') {
        Save-Estado $Id 'nao_suportado' 'OUVIDO_NAO_SUPORTADO' 'nao existe para este computador' ''
        Sair ([ordered]@{ passo = $Id; iniciado = $true; ja_pronto = $true; codigo = 'OUVIDO_NAO_SUPORTADO'; log = $logf }) 0
    }
    Save-Config
    Save-Estado $Id 'rodando' '' 'comecando' ''
    $ps = (Get-Process -Id $PID).Path
    $lista = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $script:Repo 'instalar\instalar.ps1'), 'passo', $Id)
    if ($script:Agente) { $lista += @('--agente', $script:Agente) }
    try {
        $p = Start-Process -FilePath $ps -ArgumentList (Join-Argumentos $lista) -WindowStyle Hidden -PassThru
        [System.IO.File]::WriteAllText((Join-Path $script:Estado ($Id + '.pid')), [string]$p.Id)
    } catch {
        Save-Estado $Id 'erro' 'DESCONHECIDO' 'nao comecou' ''
        Sair ([ordered]@{ passo = $Id; iniciado = $false; log = $logf }) 1
    }
    Start-Sleep -Seconds 2
    $e = Read-Estado $Id
    $vivo = ($null -ne (Get-Process -Id $p.Id -ErrorAction SilentlyContinue))
    if ($vivo -or ($null -ne $e -and ($e.estado -eq 'pronto' -or $e.estado -eq 'nao_suportado'))) {
        Sair ([ordered]@{ passo = $Id; iniciado = $true; log = $logf }) 0
    }
    Sair ([ordered]@{ passo = $Id; iniciado = $false; log = $logf }) 1
}

function Invoke-AcaoStatus([string]$Id) {
    $e = Read-Estado $Id
    if ($null -eq $e) { Sair ([ordered]@{ passo = $Id; estado = 'falta'; codigo = ''; progresso = '' }) 0 }
    if ($e.estado -eq 'rodando' -and -not (Test-PidVivo $Id)) {
        $cod = 'DESCONHECIDO'
        if ($Id -eq 'fala') { $cod = 'FALA_FALHOU' }
        if ($Id -eq 'ouvido') { $cod = 'OUVIDO_FALHOU' }
        Save-Estado $Id 'erro' $cod 'parou no meio' ''
        $e = Read-Estado $Id
    }
    Sair ([ordered]@{ passo = $Id; estado = [string]$e.estado; codigo = [string]$e.codigo; progresso = [string]$e.progresso; versao = [string]$e.versao; atualizado_em = [string]$e.atualizado_em }) 0
}

function Invoke-AcaoVerificar {
    Initialize-Log 'verificar'
    Diga 'Conferindo cada programa do estudio...'
    $itens = New-Object System.Collections.ArrayList
    $obrig = $true
    $script:Prontos = 0
    function Add-Item([string]$Id, [bool]$Ok, [string]$Texto, [string]$Codigo = '', [string]$Passo = '', $Dados = $null, [string]$Origem = '') {
        $o = [ordered]@{ id = $Id; ok = $Ok; texto = $Texto }
        if ($Passo) { $o.passo = $Passo }
        if ($Codigo) { $o.codigo = $Codigo }
        if ($null -ne $Dados) { $o.dados = $Dados }
        if ($Origem) { $o.origem = $Origem }
        [void]$itens.Add($o)
        if ($Ok) { $script:Prontos++ }
    }

    $v = Get-VersaoNode
    if ($v.StartsWith('v24.')) { Add-Item 'node' $true ('Motor de video (Node ' + $v + ')') '' 'node' } else { Add-Item 'node' $false 'Motor de video (Node)' 'FALTA_INSTALAR' 'node'; $obrig = $false }

    $npmOk = $false
    if (Test-Path -LiteralPath $script:NpmCmd) {
        $r = Invoke-Bat -Bat $script:NpmCmd -Argumentos @('-v')
        if ($r.codigo -eq 0) { $npmOk = $true; Add-Item 'npm' $true ('Ajudante do motor (npm ' + $r.so.Trim() + ')') '' 'node' }
    }
    if (-not $npmOk) { Add-Item 'npm' $false 'Ajudante do motor (npm)' 'FALTA_INSTALAR' 'node'; $obrig = $false }

    $uvOk = $false
    if (Test-Path -LiteralPath $script:UvExe) {
        $r = Invoke-Nativo -Exe $script:UvExe -Argumentos @('--version')
        if ($r.codigo -eq 0) { $uvOk = $true; Add-Item 'uv' $true ('Instalador do Python (' + $r.so.Trim() + ')') '' 'python' }
    }
    if (-not $uvOk) { Add-Item 'uv' $false 'Instalador do Python (uv)' 'FALTA_INSTALAR' 'python' }

    $pyOk = $false
    if ($uvOk) {
        $r = Invoke-Nativo -Exe $script:UvExe -Argumentos @('run', '--no-project', '--python', $script:PythonPedido, 'python', '-c', "import sys;print('ok', sys.version.split()[0])") -Pasta $script:Ferr
        $s = $r.so.Trim()
        if ($s.StartsWith('ok ')) { $pyOk = $true; Add-Item 'python' $true ('Python ' + $s.Substring(3)) '' 'python' }
    }
    if (-not $pyOk) { Add-Item 'python' $false 'Python' 'FALTA_INSTALAR' 'python' }

    $rc = Test-FfmpegCompleto
    if ($rc -eq 0) { Add-Item 'ffmpeg' $true ('Tesoura de video (FFmpeg ' + (Get-VersaoFfmpeg) + ')') '' 'ffmpeg' }
    elseif ($rc -eq 2) { Add-Item 'ffmpeg' $false 'Tesoura de video (FFmpeg) sem uma peca' 'FFMPEG_INCOMPLETO' 'ffmpeg'; $obrig = $false }
    elseif ($rc -eq 3) { Add-Item 'ffmpeg' $false 'Tesoura de video (FFmpeg)' 'ANTIVIRUS_BLOQUEOU' 'ffmpeg' @{ nome = 'FFmpeg'; arquivo = 'ffmpeg.exe' }; $obrig = $false }
    else { Add-Item 'ffmpeg' $false 'Tesoura de video (FFmpeg)' 'FALTA_INSTALAR' 'ffmpeg'; $obrig = $false }

    $fp = Join-Path $script:Bin 'ffprobe.exe'
    $fpOk = $false
    if (Test-Path -LiteralPath $fp) { $r = Invoke-Nativo -Exe $fp -Argumentos @('-version'); $fpOk = ($r.codigo -eq 0) }
    if ($fpOk) { Add-Item 'ffprobe' $true 'Medidor de video (FFprobe)' '' 'ffmpeg' } else { Add-Item 'ffprobe' $false 'Medidor de video (FFprobe)' 'FALTA_INSTALAR' 'ffmpeg'; $obrig = $false }

    $yt = Join-Path $script:Bin 'yt-dlp.exe'
    $ytOk = $false
    if (Test-Path -LiteralPath $yt) {
        $r = Invoke-Nativo -Exe $yt -Argumentos @('--version')
        if ($r.codigo -eq 0) { $ytOk = $true; Add-Item 'baixador' $true ('Baixador de videos (' + $r.so.Trim() + ')') '' 'baixador' }
    }
    if (-not $ytOk) { Add-Item 'baixador' $false 'Baixador de videos' 'FALTA_INSTALAR' 'baixador' }

    $res = Test-Montador
    if ($res -eq 'ok') {
        $hv = ''
        try { $hv = [string](([System.IO.File]::ReadAllText((Join-Path $script:Repo 'node_modules\hyperframes\package.json'))) | ConvertFrom-Json).version } catch { }
        Add-Item 'montador' $true ('Montador de video (HyperFrames ' + $hv + ')') '' 'montador'
    } else {
        $cod = 'MONTADOR_FALHOU'
        if ($res -eq 'sem-montador') { $cod = 'FALTA_INSTALAR' } elseif ($res.Contains('Chrome')) { $cod = 'NAVEGADOR_FALHOU' }
        Add-Item 'montador' $false 'Montador de video' $cod 'montador'
        $obrig = $false
    }

    $modelo = Get-FalaModelo
    if ($null -ne $modelo) { Add-Item 'fala' $true ('Ouvido de texto (modelo ' + $modelo + ')') '' 'fala' }
    elseif (Test-Path -LiteralPath (Join-Path $script:Ferr 'kit-fala.json')) { Add-Item 'fala' $false 'Ouvido de texto' 'FALA_FALHOU' 'fala' }
    else { Add-Item 'fala' $false 'Ouvido de texto' 'FALTA_INSTALAR' 'fala' }

    $ouvidoDisp = $false
    if ($script:Arq -eq 'arm64') { Add-Item 'ouvido' $true 'Ouvido de som: nao existe para Windows ARM (o video sai igual)' 'OUVIDO_NAO_SUPORTADO' 'ouvido' }
    elseif (Test-Earshot) { $ouvidoDisp = $true; Add-Item 'ouvido' $true 'Ouvido de som' '' 'ouvido' }
    elseif (Test-Path -LiteralPath (Join-Path $script:Bin 'earshot.exe')) { Add-Item 'ouvido' $false 'Ouvido de som' 'OUVIDO_FALHOU' 'ouvido' }
    else { Add-Item 'ouvido' $false 'Ouvido de som' 'FALTA_INSTALAR' 'ouvido' }

    $livre = Get-EspacoLivreGb
    $minVer = [double](Vv 'ESPACO_MINIMO_VERIFICAR_GB')
    if ($livre -lt $minVer) { Add-Item 'espaco' $false ('Espaco livre: ' + $livre + ' GB') 'POUCO_ESPACO' '' @{ livre_gb = $livre; precisa_gb = $minVer } }
    else { Add-Item 'espaco' $true ('Espaco livre: ' + $livre + ' GB') }

    if ((Test-Path -LiteralPath $script:NodeExe) -and (Test-Path -LiteralPath (Join-Path $script:Repo 'kit\scripts\estudio.mjs'))) {
        $r = Invoke-Bat -Bat (Join-Path $script:Repo 'estudio.cmd') -Argumentos @('conferir-kit') -Pasta $script:Repo
        $j = ConvertFrom-JsonSeguro (Get-UltimaLinha $r.so)
        if ($null -ne $j -and $j.ok -eq $true) { Add-Item 'kit' $true 'Pecas do estudio conferidas' '' '' $null 'kit' }
        else {
            $cod = 'DESCONHECIDO'
            if ($null -ne $j -and $j.codigo) { $cod = [string]$j.codigo }
            Add-Item 'kit' $false 'Pecas do estudio' $cod '' $null 'kit'
        }
    } else {
        Add-Item 'kit' $false 'Pecas do estudio' 'ESTUDIO_NAO_INSTALADO'
    }

    $total = $itens.Count
    $ok = ($script:Prontos -eq $total)
    $gravou = $false
    if ($obrig) { $gravou = Save-Instalacao $ouvidoDisp }
    if ($ok) { Diga ('Tudo pronto: ' + $script:Prontos + ' de ' + $total + '.') } else { Diga ('Ficou quase tudo pronto: ' + $script:Prontos + ' de ' + $total + '.') }
    $o = [ordered]@{ ok = $ok; total = $total; prontos = $script:Prontos; instalacao_gravada = $gravou; itens = $itens.ToArray() }
    if ($ok) { Sair $o 0 } else { Sair $o 1 }
}

function Save-Instalacao([bool]$OuvidoDisponivel) {
    Read-Config
    $passos = [ordered]@{}
    foreach ($id in $script:Passos) {
        $e = Read-Estado $id
        if ($null -eq $e) { continue }
        $passos[$id] = [ordered]@{ ok = ($e.estado -eq 'pronto' -or $e.estado -eq 'nao_suportado'); versao = [string]$e.versao; quando = [string]$e.atualizado_em }
    }
    $agente = $script:CfgAgente
    if (-not $agente) { $agente = 'claude' }
    $modo = $script:CfgModo
    if (-not $modo) { $modo = 'tudo' }
    $o = [ordered]@{
        versao_estudio = $script:VersaoEstudio; sistema = 'windows'; arquitetura = $script:Arq
        versao_sistema = [System.Environment]::OSVersion.Version.ToString(); agente = $agente
        ferramentas_dir = $script:Ferr; repo_dir = $script:Repo; passos = $passos
        ouvido_disponivel = $OuvidoDisponivel; git_disponivel = ((Get-CaminhoGit) -ne ''); modo_permissao = $modo
    }
    $f = Join-Path $script:Ferr 'instalacao.json'
    try {
        [System.IO.File]::WriteAllText($f + '.tmp', (ConvertTo-Json -InputObject $o -Depth 6), $script:Utf8)
        if (Test-Path -LiteralPath $f) { Remove-Item -LiteralPath $f -Force }
        Move-Item -LiteralPath ($f + '.tmp') -Destination $f
        return $true
    } catch { return $false }
}

# Tira este processo de dentro de uma pasta: o Windows trava a pasta que e a pasta de trabalho de um processo.
function Exit-PastaAtual {
    $fora = $env:TEMP
    if (-not $fora) { $fora = $env:SystemRoot }
    try { Set-Location -LiteralPath $fora } catch { }
    try { [System.Environment]::CurrentDirectory = $fora } catch { }
}

function Invoke-AcaoMudarPasta {
    $destino = Get-DestinoDoRepo
    $velha = $script:Repo
    if ($velha.TrimEnd('\') -eq $destino) { Sair ([ordered]@{ acao = 'mudar-pasta'; ok = $true; codigo = 'JA_PRONTO'; de = $velha; para = $destino }) 0 }
    if (Test-Path -LiteralPath $destino) { Sair ([ordered]@{ acao = 'mudar-pasta'; ok = $false; codigo = 'PASTA_DESTINO_EXISTE'; de = $velha; para = $destino; dados = @{ pasta = $destino } }) 1 }
    Diga ('Vou mudar o estudio para ' + $destino + '. Nada e apagado.')
    # Antes de mover, sai de dentro do estudio; senao o Windows trava a pasta e o Move falha.
    Exit-PastaAtual
    try {
        $pai = Split-Path -Parent $destino
        if (-not (Test-Path -LiteralPath $pai)) { New-Item -ItemType Directory -Force -Path $pai | Out-Null }
        Move-Item -LiteralPath $velha -Destination $destino
        Sair ([ordered]@{ acao = 'mudar-pasta'; ok = $true; codigo = 'INSTALADO'; copiado = $false; de = $velha; para = $destino }) 0
    } catch {
        $cod = Get-CodigoExcecao $_
        try {
            Copy-Item -LiteralPath $velha -Destination $destino -Recurse -Force
            # Ficou uma copia antiga; o aluno pode apagar depois (texto MUDAR-PASTA-COPIADO).
            Sair ([ordered]@{ acao = 'mudar-pasta'; ok = $true; codigo = 'INSTALADO'; copiado = $true; de = $velha; para = $destino; dados = @{ antiga = $velha } }) 0
        } catch {
            Sair ([ordered]@{ acao = 'mudar-pasta'; ok = $false; codigo = $cod; de = $velha; para = $destino; dados = @{ pasta = $destino } }) 1
        }
    }
}

function Exit-Atualizar([string]$Codigo, $Dados = $null) {
    Remove-Tmp
    if ($null -eq $Dados) { $Dados = @{} }
    Sair ([ordered]@{ acao = 'atualizar'; ok = $false; codigo = $Codigo; de = $script:VersaoEstudio; para = ''; dados = $Dados }) 1
}

# Primeira palavra de um arquivo .sha256 ("hash  nome" ou so o hash), em minusculas.
function Read-ShaDoArquivo([string]$Arquivo) {
    try {
        $t = ([System.IO.File]::ReadAllText($Arquivo)).Trim()
        return ($t.Split([char[]]@(' ', "`t", "`r", "`n"), [System.StringSplitOptions]::RemoveEmptyEntries)[0]).ToLowerInvariant()
    } catch { return '' }
}

# Guarda so as 2 copias mais novas de versao-anterior-* (o nome tem data e hora, entao a ordem do nome e a do tempo).
function Remove-VersoesAntigas {
    $lista = @(Get-ChildItem -LiteralPath $script:Ferr -Directory -Filter 'versao-anterior-*' -ErrorAction SilentlyContinue | Sort-Object Name)
    for ($k = 0; $k -lt ($lista.Count - 2); $k++) {
        try { Remove-Item -LiteralPath $lista[$k].FullName -Recurse -Force } catch { Write-Log ('nao apagou ' + $lista[$k].FullName) }
    }
}

function Invoke-AcaoAtualizar([string]$Origem) {
    if (-not $Origem) { $Origem = Vv 'ESTUDIO_ATUALIZAR_URL' }
    if (-not $Origem -or $Origem.Contains('/CONTA/')) { Exit-Atualizar 'ATUALIZACAO_SEM_ENDERECO' }
    Initialize-Log 'atualizar'
    Initialize-Tmp
    Diga 'Vou baixar a versao nova do estudio. O seu trabalho, a sua marca e os seus videos ficam como estao.'
    $zip = Join-Path $script:Tmp 'novo.zip'
    if (Test-Path -LiteralPath $Origem) {
        # Zip no computador: so com o arquivo .sha256 do mesmo release ao lado.
        if (-not (Test-Path -LiteralPath ($Origem + '.sha256'))) { Exit-Atualizar 'ARQUIVO_DIFERENTE' @{ nome = 'estudio' } }
        $sha = Read-ShaDoArquivo ($Origem + '.sha256')
        Copy-Item -LiteralPath $Origem -Destination $zip -Force
        if ($sha.Length -ne 64 -or (Get-Sha256 $zip) -ne $sha) { Exit-Atualizar 'ARQUIVO_DIFERENTE' @{ nome = 'estudio' } }
    } else {
        $estranho = ($Origem.Contains('..') -or $Origem.Contains('@') -or $Origem.Contains('\'))
        if ($estranho -or -not $Origem.StartsWith($script:EnderecoOficial, [System.StringComparison]::Ordinal)) { Exit-Atualizar 'ATUALIZACAO_ENDERECO_ESTRANHO' }
        $arqSha = Join-Path $script:Tmp 'novo.zip.sha256'
        $c = Get-Arquivo ($Origem + '.sha256') $arqSha
        if ($c) { Exit-Atualizar $c @{ nome = 'estudio' } }
        $sha = Read-ShaDoArquivo $arqSha
        if ($sha.Length -ne 64) { Exit-Atualizar 'ARQUIVO_DIFERENTE' @{ nome = 'estudio' } }
        $c = Get-Arquivo $Origem $zip $sha
        if ($c) { Exit-Atualizar $c @{ nome = 'estudio' } }
    }
    $pastaNova = Join-Path $script:Tmp 'novo'
    if (-not (Expand-Zip $zip $pastaNova)) { Exit-Atualizar 'DOWNLOAD_FALHOU' @{ nome = 'estudio' } }
    $versaoArq = Get-ChildItem -LiteralPath $pastaNova -Recurse -File -Filter 'VERSAO' -Depth 1 -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $versaoArq) { Exit-Atualizar 'ARQUIVO_DIFERENTE' @{ nome = 'estudio' } }
    $novo = $versaoArq.DirectoryName
    $de = $script:VersaoEstudio
    $para = ([System.IO.File]::ReadAllText($versaoArq.FullName)).Trim()
    $pkgMudou = $false
    foreach ($f in @('package.json', 'package-lock.json')) {
        $a = ''; $b = ''
        try { $a = [System.IO.File]::ReadAllText((Join-Path $script:Repo $f)) } catch { }
        try { $b = [System.IO.File]::ReadAllText((Join-Path $novo $f)) } catch { }
        if ($a -ne $b) { $pkgMudou = $true }
    }
    $antigo = Join-Path $script:Ferr ('versao-anterior-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Force -Path $antigo | Out-Null
    # O trabalho do aluno e os programas instalados nunca sao tocados.
    $nuncaTocar = @('.ferramentas', 'minha-marca', 'projetos', '1-referencias', '2-videos-brutos', '3-videos-prontos', 'node_modules', '.git')
    try {
        foreach ($item in (Get-ChildItem -LiteralPath $novo -Force)) {
            $nome = $item.Name
            if ($nuncaTocar -contains $nome) { continue }
            $atual = Join-Path $script:Repo $nome
            if (Test-Path -LiteralPath $atual) { Move-Item -LiteralPath $atual -Destination (Join-Path $antigo $nome) }
            Copy-Item -LiteralPath $item.FullName -Destination $atual -Recurse -Force
        }
        $local = Join-Path $antigo '.claude\settings.local.json'
        if (Test-Path -LiteralPath $local) {
            New-Item -ItemType Directory -Force -Path (Join-Path $script:Repo '.claude') | Out-Null
            Copy-Item -LiteralPath $local -Destination (Join-Path $script:Repo '.claude\settings.local.json') -Force
        }
    } catch {
        $cod = Get-CodigoExcecao $_
        Remove-Tmp
        Sair ([ordered]@{ acao = 'atualizar'; ok = $false; codigo = $cod; de = $de; para = $para; copia_anterior = $antigo }) 1
    }
    Remove-VersoesAntigas
    if ($pkgMudou) {
        Diga 'O montador mudou na versao nova. Vou atualizar.'
        foreach ($f in @('montador.json')) { $x = Join-Path $script:Estado $f; if (Test-Path -LiteralPath $x) { Remove-Item -LiteralPath $x -Force } }
        $ps = (Get-Process -Id $PID).Path
        $null = Invoke-Nativo -Exe $ps -Argumentos @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $script:Repo 'instalar\instalar.ps1'), 'passo', 'montador') -Pasta $script:Repo
    }
    Diga ('Pronto: estudio atualizado de ' + $de + ' para ' + $para + '. A versao anterior ficou guardada em ' + $antigo + '.')
    Remove-Tmp
    Sair ([ordered]@{ acao = 'atualizar'; ok = $true; de = $de; para = $para; copia_anterior = $antigo }) 0
}

# Tamanho de uma pasta em MB (0 se nao der para medir).
function Get-TamanhoPastaMb([string]$Pasta) {
    try {
        $soma = (Get-ChildItem -LiteralPath $Pasta -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if ($null -eq $soma) { return 0 }
        return [int][math]::Round($soma / 1MB, 0)
    } catch { return 0 }
}

# Desinstalar: apaga so o que o instalador pos (a pasta .ferramentas, as pecas do montador e os atalhos).
# Sem --confirmar so diz o que seria apagado. Os videos, a marca e os projetos ficam.
function Invoke-AcaoDesinstalar {
    $alvo = Join-Path $script:Repo '.ferramentas'
    $modulos = Join-Path $script:Repo 'node_modules'
    $lista = New-Object System.Collections.ArrayList
    $mb = 0
    foreach ($p in @($alvo, $modulos)) {
        if (Test-Path -LiteralPath $p) { [void]$lista.Add($p); $mb += (Get-TamanhoPastaMb $p) }
    }
    foreach ($p in @((Get-CaminhoAtalho), (Get-CaminhoAtalhoPasta))) { if (Test-Path -LiteralPath $p) { [void]$lista.Add($p) } }
    $fica = @('minha-marca', 'projetos', '1-referencias', '2-videos-brutos', '3-videos-prontos')
    if (-not $script:Confirmar) {
        Sair ([ordered]@{ acao = 'desinstalar'; ok = $true; confirmado = $false; apagaria = $lista.ToArray(); tamanho_mb = $mb; fica = $fica }) 0
    }
    foreach ($id in @('fala', 'ouvido')) {
        if (Test-PidVivo $id) { Sair ([ordered]@{ acao = 'desinstalar'; ok = $false; codigo = 'ARQUIVO_EM_USO'; dados = @{} }) 1 }
    }
    Diga 'Vou apagar os programas do estudio e os atalhos. Os seus videos, a sua marca e os projetos ficam.'
    Exit-PastaAtual
    foreach ($p in @($alvo, $modulos)) {
        if (-not (Test-Path -LiteralPath $p)) { continue }
        # rd do cmd lida melhor com caminho longo do node_modules do que o Remove-Item do PowerShell 5.1.
        $null = Invoke-Nativo -Exe $script:Cmd -Bruto ('/d /c rd /s /q "' + $p + '"') -Pasta $env:TEMP
        if (Test-Path -LiteralPath $p) { try { Remove-Item -LiteralPath $p -Recurse -Force } catch { } }
    }
    foreach ($p in @((Get-CaminhoAtalho), (Get-CaminhoAtalhoPasta))) {
        if (Test-Path -LiteralPath $p) { try { Remove-Item -LiteralPath $p -Force } catch { } }
    }
    if ((Test-Path -LiteralPath $alvo) -or (Test-Path -LiteralPath $modulos)) {
        Sair ([ordered]@{ acao = 'desinstalar'; ok = $false; codigo = 'ARQUIVO_EM_USO'; dados = @{} }) 1
    }
    Diga 'Pronto: programas do estudio apagados.'
    Sair ([ordered]@{ acao = 'desinstalar'; ok = $true; confirmado = $true; apagou = $lista.ToArray(); pasta_do_estudio = $script:Repo }) 0
}

# ---------------------------------------------------------------- despacho

switch ($script:Acao) {
    'checar' { Invoke-AcaoChecar }
    'plano' { Invoke-AcaoPlano }
    'passo' { Invoke-AcaoPasso $script:Id }
    'segundo-plano' { Invoke-AcaoSegundoPlano $script:Id }
    'status' { Invoke-AcaoStatus $script:Id }
    'verificar' { Invoke-AcaoVerificar }
    'mudar-pasta' { Invoke-AcaoMudarPasta }
    'atualizar' { Invoke-AcaoAtualizar $script:Id }
    'desinstalar' { Invoke-AcaoDesinstalar }
    default {
        Sair ([ordered]@{ acao = $script:Acao; ok = $false; codigo = 'ACAO_DESCONHECIDA'; dados = @{ acoes = @('checar', 'plano', 'passo', 'segundo-plano', 'status', 'verificar', 'mudar-pasta', 'atualizar', 'desinstalar') } }) 1
    }
}
