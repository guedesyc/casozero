$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $projectRoot

$backupRoot = Join-Path $projectRoot '.pages-build-backup'
$generatedDirectories = @('app','admin','muriloguedes','precos','404','_next')
$legacyFiles = @('app.html','app.txt','admin.html','admin.txt','muriloguedes.html','muriloguedes.txt','precos.html','precos.txt','index.html','index.txt','404.html','casozero-logo.png','casozero-intro.mp4')

if (Test-Path -LiteralPath $backupRoot) { Remove-Item -LiteralPath $backupRoot -Recurse -Force }
New-Item -ItemType Directory -Path $backupRoot | Out-Null

foreach ($name in @('app','admin','muriloguedes')) {
  $source = Join-Path $projectRoot $name
  if (Test-Path -LiteralPath $source) { Move-Item -LiteralPath $source -Destination $backupRoot }
}

$buildSucceeded = $false
try {
  $outPath = Join-Path $projectRoot 'out'
  if (Test-Path -LiteralPath $outPath) { Remove-Item -LiteralPath $outPath -Recurse -Force }
  $env:GITHUB_ACTIONS = 'true'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE" }

  foreach ($name in $generatedDirectories) {
    $target = Join-Path $projectRoot $name
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
  }
  foreach ($name in $legacyFiles) {
    $target = Join-Path $projectRoot $name
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
  }
  Copy-Item -Path (Join-Path $outPath '*') -Destination $projectRoot -Recurse -Force
  $buildSucceeded = $true
}
finally {
  Remove-Item Env:GITHUB_ACTIONS -ErrorAction SilentlyContinue
  if (-not $buildSucceeded) {
    foreach ($name in @('app','admin','muriloguedes')) {
      $saved = Join-Path $backupRoot $name
      if (Test-Path -LiteralPath $saved) { Move-Item -LiteralPath $saved -Destination $projectRoot }
    }
  }
  if (Test-Path -LiteralPath $backupRoot) { Remove-Item -LiteralPath $backupRoot -Recurse -Force }
}
