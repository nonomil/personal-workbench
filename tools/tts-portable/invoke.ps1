[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'start', 'health', 'voices', 'dry-run', 'generate', 'content-dry-run', 'content-generate')]
    [string]$Command = 'help',

    [string]$ProjectRoot,
    [string]$Bank,
    [string]$OutputDir,
    [string]$MainPython,
    [string]$VoxPython,
    [string]$Model,

    # Allows commands such as: invoke.ps1 generate --word brown --device cuda
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$GeneratorArgs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workbenchRoot = Split-Path -Parent (Split-Path -Parent $toolRoot)
$serverPath = Join-Path $toolRoot 'tts_server.py'
$generatorPath = Join-Path $toolRoot 'generate-preschool-vocab.py'
$contentGeneratorPath = Join-Path $toolRoot 'generate-content-audio.py'

function Resolve-PathValue {
    param(
        [AllowNull()]
        [string]$Value,
        [Parameter(Mandatory = $true)]
        [string]$Fallback
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return [IO.Path]::GetFullPath($Fallback)
    }
    return [IO.Path]::GetFullPath($Value)
}

function Resolve-PythonCommand {
    param(
        [AllowNull()]
        [string]$Explicit,
        [AllowNull()]
        [string]$EnvironmentValue,
        [string]$Fallback = 'python'
    )

    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        return $Explicit
    }
    if (-not [string]::IsNullOrWhiteSpace($EnvironmentValue)) {
        return $EnvironmentValue
    }
    return $Fallback
}

function Show-Help {
    @'
tts-portable 共享语音工具

常用命令（可从任意工作目录执行）：
  .\run.bat health
  .\run.bat voices
  .\run.bat start
  .\run.bat dry-run
  .\run.bat generate --word brown --device cuda
  .\run.bat content-dry-run
  .\run.bat content-generate --category poetry --engine edge

PowerShell 直接调用：
  .\invoke.ps1 dry-run
  .\invoke.ps1 generate -GeneratorArgs @('--limit', '10', '--device', 'cuda')

跨项目生成时显式指定词库和输出：
  .\invoke.ps1 dry-run `
    -Bank 'G:\StudyCode\个人工作台\prj\data\preschool\英语\vocabulary-bank.json' `
    -OutputDir 'G:\StudyCode\个人工作台\prj\assets\audio\vocab'

环境变量：
  TTS_PORTABLE_PYTHON   实时服务使用的 Python（默认 python）
  VOXCPM2_PYTHON        VoxCPM2 生成使用的 Python
  VOXCPM2_MODEL_PATH    VoxCPM2 本地模型目录
  TTS_HOST / TTS_PORT    服务监听地址和端口
'@ | Write-Output
}

if ($Command -eq 'help') {
    Show-Help
    exit 0
}

if (-not (Test-Path -LiteralPath $serverPath)) {
    throw "共享 TTS 服务入口不存在：$serverPath"
}

$resolvedProjectRoot = Resolve-PathValue -Value $ProjectRoot -Fallback $workbenchRoot
$defaultBank = Join-Path $resolvedProjectRoot 'prj\data\preschool\英语\vocabulary-bank.json'
$defaultOutputDir = Join-Path $resolvedProjectRoot 'prj\assets\audio\vocab'
$defaultContentOutputDir = Join-Path $resolvedProjectRoot 'prj\assets\audio\tts'

switch ($Command) {
    'start' {
        $runtimePython = Resolve-PythonCommand -Explicit $MainPython -EnvironmentValue $env:TTS_PORTABLE_PYTHON
        if (-not [string]::IsNullOrWhiteSpace($VoxPython)) {
            $env:VOXCPM2_PYTHON = $VoxPython
        }
        if (-not [string]::IsNullOrWhiteSpace($Model)) {
            $env:VOXCPM2_MODEL_PATH = $Model
        }
        & $runtimePython $serverPath
        exit $LASTEXITCODE
    }

    'health' {
        $hostValue = if ([string]::IsNullOrWhiteSpace($env:TTS_HOST)) { '127.0.0.1' } else { $env:TTS_HOST }
        $portValue = if ([string]::IsNullOrWhiteSpace($env:TTS_PORT)) { '9885' } else { $env:TTS_PORT }
        $uri = "http://$($hostValue):$($portValue)/health"
        try {
            $response = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 10
            $response | ConvertTo-Json -Depth 5
            exit 0
        }
        catch {
            Write-Error "TTS 服务不可达：$uri。请先执行 .\run.bat start。$($_.Exception.Message)"
            exit 1
        }
    }

    'voices' {
        $hostValue = if ([string]::IsNullOrWhiteSpace($env:TTS_HOST)) { '127.0.0.1' } else { $env:TTS_HOST }
        $portValue = if ([string]::IsNullOrWhiteSpace($env:TTS_PORT)) { '9885' } else { $env:TTS_PORT }
        $uri = "http://$($hostValue):$($portValue)/voices"
        try {
            $response = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 10
            $response | ConvertTo-Json -Depth 5
            exit 0
        }
        catch {
            Write-Error "TTS 服务不可达：$uri。请先执行 .\run.bat start。$($_.Exception.Message)"
            exit 1
        }
    }

    'dry-run' {
        $generatorPython = Resolve-PythonCommand -Explicit $VoxPython -EnvironmentValue $env:VOXCPM2_PYTHON
        $args = @('--dry-run', '--bank', (Resolve-PathValue -Value $Bank -Fallback $defaultBank), '--output-dir', (Resolve-PathValue -Value $OutputDir -Fallback $defaultOutputDir))
        if ($GeneratorArgs) {
            $args += $GeneratorArgs
        }
        & $generatorPython $generatorPath @args
        exit $LASTEXITCODE
    }

    'generate' {
        $generatorPython = Resolve-PythonCommand -Explicit $VoxPython -EnvironmentValue $env:VOXCPM2_PYTHON -Fallback 'D:\PythonEnvs\tts-voxcpm\Scripts\python.exe'
        $args = @('--bank', (Resolve-PathValue -Value $Bank -Fallback $defaultBank), '--output-dir', (Resolve-PathValue -Value $OutputDir -Fallback $defaultOutputDir))
        if (-not [string]::IsNullOrWhiteSpace($Model)) {
            $args += @('--model', $Model)
        }
        if ($GeneratorArgs) {
            $args += $GeneratorArgs
        }
        & $generatorPython $generatorPath @args
        exit $LASTEXITCODE
    }

    'content-dry-run' {
        $generatorPython = Resolve-PythonCommand -Explicit $MainPython -EnvironmentValue $env:TTS_PORTABLE_PYTHON
        $args = @('--dry-run', '--summary', '--project-root', $resolvedProjectRoot, '--output-dir', (Resolve-PathValue -Value $OutputDir -Fallback $defaultContentOutputDir))
        if ($GeneratorArgs) {
            $args += $GeneratorArgs
        }
        & $generatorPython $contentGeneratorPath @args
        exit $LASTEXITCODE
    }

    'content-generate' {
        $usesVox = $false
        if ($GeneratorArgs -and ($GeneratorArgs -contains 'voxcpm2' -or $GeneratorArgs -contains '--engine=voxcpm2')) {
            $usesVox = $true
        }
        if ($usesVox) {
            $generatorPython = Resolve-PythonCommand -Explicit $VoxPython -EnvironmentValue $env:VOXCPM2_PYTHON -Fallback 'D:\PythonEnvs\tts-voxcpm\Scripts\python.exe'
        } else {
            $generatorPython = Resolve-PythonCommand -Explicit $MainPython -EnvironmentValue $env:TTS_PORTABLE_PYTHON
        }
        $args = @('--project-root', $resolvedProjectRoot, '--output-dir', (Resolve-PathValue -Value $OutputDir -Fallback $defaultContentOutputDir))
        if (-not [string]::IsNullOrWhiteSpace($Model)) {
            $args += @('--model', $Model)
        }
        if ($GeneratorArgs) {
            $args += $GeneratorArgs
        }
        & $generatorPython $contentGeneratorPath @args
        exit $LASTEXITCODE
    }
}

throw "未处理的命令：$Command"
