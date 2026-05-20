# Запуск фронта (Node) — порт 5000, прокси к API на 8000
$frontendDir = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}
$env:BACKEND_API_URL = "http://127.0.0.1:8000"
Write-Host "Starting frontend on http://127.0.0.1:5000 (API proxy -> 8000)"
npm run dev
