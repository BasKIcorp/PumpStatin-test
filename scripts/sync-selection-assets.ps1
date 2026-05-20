#Requires -Version 5.1
<#
  Копирует frontend/client/public/selection-assets/* на демо-сервер по SSH.
  Нужен профиль в ~/.ssh/config (например Host pump-source) и файлы podbor-001.png … podbor-024.png локально.

  Пример:
    .\scripts\sync-selection-assets.ps1
    .\scripts\sync-selection-assets.ps1 -SshHost pump-station
#>
param(
  [string] $SshHost = "pump-source",
  [string] $RemoteDir = "/opt/pump_station_api/frontend/selection-assets"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$localDir = Join-Path $root "frontend\client\public\selection-assets"

if (-not (Test-Path $localDir)) {
  Write-Error "Нет каталога: $localDir"
}

$files = Get-ChildItem -Path $localDir -File -ErrorAction SilentlyContinue
if (-not $files -or $files.Count -eq 0) {
  Write-Warning "В $localDir нет файлов. Положите podbor-001.png … podbor-024.png и запустите снова."
  exit 1
}

Write-Host "SSH: $SshHost -> $RemoteDir ($($files.Count) файлов)"
ssh -o BatchMode=yes $SshHost "mkdir -p $RemoteDir && chown www-data:www-data $RemoteDir"

$paths = @($files | ForEach-Object { $_.FullName })
& scp -o BatchMode=yes @paths "${SshHost}:${RemoteDir}/"

ssh -o BatchMode=yes $SshHost "chown -R www-data:www-data $RemoteDir && ls -la $RemoteDir"
Write-Host "Готово."
