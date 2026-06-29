# Local dev: pick free API + web ports (reuse healthy API if already running).
param(
  [int[]]$ApiPortCandidates = @(8000, 8001, 8010, 8020, 8030),
  [int[]]$WebPortCandidates = @(5173, 5180, 5188, 5190, 5195, 5200)
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-PortListening([int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect("127.0.0.1", $Port)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Test-PumpApi([int]$Port) {
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
    return $h.status -eq "ok"
  } catch {
    return $false
  }
}

function Wait-PumpApi([int]$Port, [int]$Seconds = 45) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PumpApi $Port) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

$apiPort = $null
$apiAlreadyRunning = $false
foreach ($p in $ApiPortCandidates) {
  if (Test-PumpApi $p) {
    $apiPort = $p
    $apiAlreadyRunning = $true
    break
  }
}
if (-not $apiPort) {
  foreach ($p in $ApiPortCandidates) {
    if (-not (Test-PortListening $p)) {
      $apiPort = $p
      break
    }
  }
}
if (-not $apiPort) {
  throw "No free API port in: $($ApiPortCandidates -join ', ')"
}

$webPort = $null
foreach ($p in $WebPortCandidates) {
  if (-not (Test-PortListening $p)) {
    $webPort = $p
    break
  }
}
if (-not $webPort) {
  throw "No free web port in: $($WebPortCandidates -join ', ')"
}

$portsFile = Join-Path $Root ".dev-ports.json"
@{
  api = $apiPort
  web = $webPort
  apiBaseUrl = "http://127.0.0.1:$apiPort"
  webUrl = "http://127.0.0.1:$webPort"
} | ConvertTo-Json | Set-Content -Path $portsFile -Encoding utf8

Write-Host ""
Write-Host "PumpStation dev" -ForegroundColor Cyan
Write-Host "  API:  http://127.0.0.1:$apiPort"
Write-Host "  Web:  http://127.0.0.1:$webPort"
Write-Host "  Ports saved: $portsFile"
Write-Host ""

$apiJob = $null
if (-not $apiAlreadyRunning) {
  Write-Host "Starting API on port $apiPort..."
  $apiJob = Start-Job -ScriptBlock {
    param($Root, $Port)
    Set-Location (Join-Path $Root "apps\api")
    uv run uvicorn app.main:app --reload --host 127.0.0.1 --port $Port
  } -ArgumentList $Root, $apiPort

  if (-not (Wait-PumpApi $apiPort)) {
    if ($apiJob) {
      Receive-Job $apiJob -ErrorAction SilentlyContinue | Write-Host
      Stop-Job $apiJob -ErrorAction SilentlyContinue
      Remove-Job $apiJob -ErrorAction SilentlyContinue
    }
    throw "API failed to start on port $apiPort"
  }
  Write-Host "API ready." -ForegroundColor Green
} else {
  Write-Host "Reusing API on port $apiPort." -ForegroundColor Green
}

$env:VITE_API_BASE_URL = "http://127.0.0.1:$apiPort"

try {
  pnpm --filter @pumpstation/web dev --host 127.0.0.1 --port $webPort --strictPort
} finally {
  if ($apiJob) {
    Stop-Job $apiJob -ErrorAction SilentlyContinue
    Remove-Job $apiJob -ErrorAction SilentlyContinue
  }
}
