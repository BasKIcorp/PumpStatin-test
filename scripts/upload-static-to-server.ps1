# Синхронизация статики frontend (public) на сервер по SSH/SCP.
# Перед запуском: настройте пользователя и путь (ключ должен работать: ssh user@host).
# Пример: .\scripts\upload-static-to-server.ps1 -User deploy -RemotePath /var/www/pump-station-static

param(
    [string] $SshHost = "159.194.215.53",
    [string] $User = "root",
    [string] $RemotePath = "/var/www/pump-station-static",
    [switch] $DryRun
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$public = Join-Path $root "frontend\client\public"

if (-not (Test-Path $public)) {
    Write-Error "Не найден каталог: $public"
}

$target = "${User}@${SshHost}:${RemotePath}"
Write-Host "Источник: $public"
Write-Host "Назначение: $target"

if ($DryRun) {
    Write-Host "[DryRun] scp -r `"$public\fonts`" `"$target/`""
    Write-Host "[DryRun] scp -r `"$public\selection-assets`" `"$target/`""
    exit 0
}

# Создать каталог на сервере (если ssh доступен)
ssh -o BatchMode=yes "${User}@${SshHost}" "mkdir -p `"$RemotePath`""
scp -r "$public\fonts" "${User}@${SshHost}:${RemotePath}/"
scp -r "$public\selection-assets" "${User}@${SshHost}:${RemotePath}/"
Write-Host "Done. Point VITE_STATIC_BASE_URL at the public URL for $RemotePath (Nginx)."
