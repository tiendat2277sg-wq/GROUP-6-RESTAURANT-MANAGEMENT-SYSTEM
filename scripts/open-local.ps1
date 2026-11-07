param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
$listener = Get-NetTCPConnection -LocalPort 5001 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  $health = Invoke-RestMethod 'http://127.0.0.1:5001/health' -TimeoutSec 5
  if ($health.service -ne 'phurai-api') { throw 'Port 5001 belongs to another application.' }
} else {
  if ((Get-Service MSSQLSERVER).Status -ne 'Running') { throw 'Start the MSSQLSERVER service, then retry.' }
  if (-not (Test-Path (Join-Path $root 'dist/index.html'))) { throw 'Build the frontend first: runtime/npm.cmd run build' }
  New-Item -ItemType Directory -Force (Join-Path $root 'local-data/logs') | Out-Null
  $process = Start-Process -FilePath (Join-Path $root 'runtime/node.exe') -ArgumentList 'backend/src/index.js' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'local-data/logs/server.log') -RedirectStandardError (Join-Path $root 'local-data/logs/server-error.log') -PassThru
  $process.Id | Set-Content (Join-Path $root 'local-data/server.pid')
  $ready = $false
  for ($attempt=0; $attempt -lt 30; $attempt++) {
    try { $ready = (Invoke-RestMethod 'http://127.0.0.1:5001/health' -TimeoutSec 2).service -eq 'phurai-api' } catch { }
    if ($ready) { break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Startup failed. See local-data/logs/server-error.log.' }
}
if (-not $NoBrowser) { Start-Process 'http://localhost:5001' }
Write-Host 'Phurai ready: http://localhost:5001'
