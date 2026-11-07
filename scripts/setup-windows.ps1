$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$destination = Join-Path $env:LOCALAPPDATA 'Programs/PhuraiNode'
$recordDir = Join-Path $root 'local-data/environment'
New-Item -ItemType Directory -Force $destination,$recordDir | Out-Null
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
$snapshot = Join-Path $recordDir 'before-setup.json'
if (-not (Test-Path $snapshot)) {
  @{savedAt=(Get-Date -Format o);originalUserPath=$userPath;nodeDirectory=$destination;projectDirectory=$root} | ConvertTo-Json | Set-Content -Encoding utf8 $snapshot
}
foreach ($file in @('node.exe','npm.cmd','npx.cmd')) { Copy-Item -LiteralPath (Join-Path $root "runtime/$file") -Destination $destination -Force }
Copy-Item -LiteralPath (Join-Path $root 'runtime/package') -Destination $destination -Recurse -Force
$parts = @($userPath -split ';' | Where-Object { $_ -and $_ -ne $destination })
[Environment]::SetEnvironmentVariable('Path',($destination+';'+($parts -join ';')),'User')
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$items = @{'Phurai - Mo ung dung'='OPEN-LOCAL.cmd';'Phurai - Dung ung dung'='STOP-LOCAL.cmd';'Phurai - Lap trinh'='START-DEV.cmd'}
foreach ($name in $items.Keys) {
  $shortcut = $shell.CreateShortcut((Join-Path $desktop "$name.lnk"))
  $shortcut.TargetPath = Join-Path $root $items[$name]
  $shortcut.WorkingDirectory = $root
  $shortcut.Save()
}
$code = Join-Path $env:LOCALAPPDATA 'Programs/Microsoft VS Code/Code.exe'
if (Test-Path $code) {
  $shortcut = $shell.CreateShortcut((Join-Path $desktop 'Phurai - VS Code.lnk'))
  $shortcut.TargetPath = $code
  $shortcut.Arguments = '"'+$root+'"'
  $shortcut.WorkingDirectory = $root
  $shortcut.Save()
}
Write-Host 'Node/PATH and shortcuts configured. Open a new terminal. See WINDOWS-ENVIRONMENT.md.'
