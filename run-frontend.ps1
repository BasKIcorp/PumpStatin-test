# Запуск фронта (Node) — порт 5000, прокси к API на 8000
$frontendDir = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}
$env:USE_SQLITE = "true"
$env:SQLITE_PATH = Join-Path $frontendDir "data\app.sqlite"
Write-Host "Starting frontend on http://127.0.0.1:5000 (SQLite API)"
npm run dev
