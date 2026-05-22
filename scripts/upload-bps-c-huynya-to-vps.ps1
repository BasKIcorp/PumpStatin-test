# Загружает мем-картинку карточки BPS-C хуйня на VPS (без полного деплоя).
# Требуется: $env:PUMPSTATIN_SSH_PASSWORD

param(
    [string] $Server = "root@83.222.16.200",
    [string] $RemotePath = "/opt/pumpstatin-test/frontend/dist/public/selection-assets/hm-cards/bps-c-huynya.png"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$local = Join-Path $root "frontend\client\public\selection-assets\hm-cards\bps-c-huynya.png"

if (-not (Test-Path $local)) {
    Write-Error "Нет файла: $local"
}

$pw = $env:PUMPSTATIN_SSH_PASSWORD
if (-not $pw) {
    Write-Error 'Задайте пароль: $env:PUMPSTATIN_SSH_PASSWORD = "..."'
}

$plink = Join-Path $env:TEMP "plink.exe"
$pscp = Join-Path $env:TEMP "pscp.exe"
if (-not (Test-Path $plink)) {
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe" -OutFile $plink -UseBasicParsing
}
if (-not (Test-Path $pscp)) {
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe" -OutFile $pscp -UseBasicParsing
}

$hostKey = "SHA256:391+u6WgC+Xwd4FBC6Q5b5NowF6/WSAPt1aRXWjJl1s"
$remoteDir = Split-Path $RemotePath -Parent

& $plink -batch -ssh -hostkey $hostKey -pw $pw $Server "mkdir -p `"$remoteDir`""
& $pscp -batch -hostkey $hostKey -pw $pw $local "${Server}:${RemotePath}"

Write-Host "OK: $local -> $RemotePath"
Write-Host "Обновите страницу с Ctrl+F5 (кэш браузера)."
