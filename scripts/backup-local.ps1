param([string]$OutputDirectory = (Join-Path $PSScriptRoot '../../../local-packages'))
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupName = "phurai-$stamp.bak"
$sqlBackupDir = Join-Path $projectRoot 'local-data/backup'
New-Item -ItemType Directory -Force $sqlBackupDir | Out-Null
& icacls $sqlBackupDir /grant 'NT SERVICE\MSSQLSERVER:(OI)(CI)M' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot grant local SQL Server access to the backup directory.' }
$serverBackupPath = Join-Path $sqlBackupDir $backupName
$escaped = $serverBackupPath.Replace("'", "''")
& sqlcmd -S localhost -E -C -b -Q "BACKUP DATABASE [System_Restaurant] TO DISK=N'$escaped' WITH COPY_ONLY, CHECKSUM; RESTORE VERIFYONLY FROM DISK=N'$escaped' WITH CHECKSUM;"
if ($LASTEXITCODE -ne 0) { throw 'Database backup/verification failed.' }
New-Item -ItemType Directory -Force (Join-Path $projectRoot 'local-data/backup') | Out-Null
Copy-Item -LiteralPath $serverBackupPath -Destination (Join-Path $projectRoot 'local-data/backup/System_Restaurant.bak')
$archive = Join-Path $OutputDirectory "phurai-local-$stamp.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($archive, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in Get-ChildItem -LiteralPath $projectRoot -File -Recurse -Force) {
    $relative = $file.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    if ($relative.StartsWith('local-data/logs/') -or $relative.StartsWith('local-data/restore-staging/') -or $relative -eq 'local-schema.log') { continue }
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative, [IO.Compression.CompressionLevel]::Fastest)
  }
} finally { $zip.Dispose() }
# Check every packaged file before reporting success, including Unicode paths.
$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
  foreach ($entry in $zip.Entries) {
    $source = Join-Path $projectRoot $entry.FullName
    if ((Get-Item -LiteralPath $source).Length -ne $entry.Length) { throw "Archive size mismatch: $($entry.FullName)" }
  }
} finally { $zip.Dispose() }
$hash = Get-FileHash -LiteralPath $archive -Algorithm SHA256
"$($hash.Hash)  $([IO.Path]::GetFileName($archive))" | Set-Content -LiteralPath "$archive.sha256"
Write-Host "Saved: $archive"
