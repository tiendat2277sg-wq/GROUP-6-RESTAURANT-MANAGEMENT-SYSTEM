$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$pidFile = Join-Path $root 'local-data/server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Host 'No managed server. Use Ctrl+C in its terminal if running manually.'; exit 0 }
$serverId = [int](Get-Content -LiteralPath $pidFile)
$server = Get-CimInstance Win32_Process -Filter "ProcessId=$serverId"
if ($server) {
  if ($server.ExecutablePath -ne (Join-Path $root 'runtime/node.exe') -or $server.CommandLine -notmatch 'backend[/\\]src[/\\]index\.js') { throw 'PID belongs to a different process; refusing to stop it.' }
  Stop-Process -Id $serverId
}
Remove-Item -LiteralPath $pidFile
Write-Host 'Phurai local server stopped.'
