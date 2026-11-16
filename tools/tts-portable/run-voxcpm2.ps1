param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$GeneratorArgs
)

$toolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonPath = if ($env:VOXCPM2_PYTHON) { $env:VOXCPM2_PYTHON } else { 'D:\PythonEnvs\tts-voxcpm\Scripts\python.exe' }
$modelPath = if ($env:VOXCPM2_MODEL_PATH) { $env:VOXCPM2_MODEL_PATH } else { 'D:\HuggingFaceCache\VoxCPM2' }
$generatorPath = Join-Path $toolRoot 'generate-preschool-vocab.py'

if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw "VoxCPM2 Python 不存在：$pythonPath"
}
if (-not (Test-Path -LiteralPath $modelPath)) {
    throw "VoxCPM2 模型目录不存在：$modelPath"
}

$env:VOXCPM2_PYTHON = $pythonPath
$env:VOXCPM2_MODEL_PATH = $modelPath
& $pythonPath $generatorPath @GeneratorArgs
exit $LASTEXITCODE
