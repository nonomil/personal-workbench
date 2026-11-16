param(
    [int]$Port = 4177
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$env:PARENT_REVIEW_PORT = [string]$Port
Set-Location -LiteralPath $projectRoot
node (Join-Path $projectRoot 'scripts\parent-review-exporter-server.mjs')
