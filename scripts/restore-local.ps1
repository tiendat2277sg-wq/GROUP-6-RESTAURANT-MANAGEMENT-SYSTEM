param(
  [string]$BackupFile = (Join-Path $PSScriptRoot '../local-data/backup/System_Restaurant.bak'),
  [ValidatePattern('^[A-Za-z][A-Za-z0-9_]{0,63}$')][string]$DatabaseName = 'System_Restaurant'
)
$ErrorActionPreference = 'Stop'
$existing = (& sqlcmd -S localhost -E -C -W -h -1 -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name=N'$DatabaseName';").Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot connect to local SQL Server.' }
if ($existing -ne '0') { throw 'System_Restaurant already exists. Restore stopped to preserve existing data.' }
$dataDir = (& sqlcmd -S localhost -E -C -W -h -1 -Q "SET NOCOUNT ON; SELECT CONVERT(nvarchar(260),SERVERPROPERTY('InstanceDefaultDataPath'));").Trim()
$logDir = (& sqlcmd -S localhost -E -C -W -h -1 -Q "SET NOCOUNT ON; SELECT CONVERT(nvarchar(260),SERVERPROPERTY('InstanceDefaultLogPath'));").Trim()
$staging = Join-Path (Split-Path $PSScriptRoot -Parent) 'local-data/restore-staging'
New-Item -ItemType Directory -Force $staging | Out-Null
& icacls $staging /grant 'NT SERVICE\MSSQLSERVER:(OI)(CI)R' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot grant SQL Server read access to backup file.' }
$target = Join-Path $staging ('restore-'+[guid]::NewGuid()+'.bak')
Copy-Item -LiteralPath $BackupFile -Destination $target
$b = $target.Replace("'", "''")
$d = (Join-Path $dataDir "$DatabaseName.mdf").Replace("'", "''")
$l = (Join-Path $logDir "${DatabaseName}_log.ldf").Replace("'", "''")
& sqlcmd -S localhost -E -C -b -Q "RESTORE DATABASE [$DatabaseName] FROM DISK=N'$b' WITH MOVE N'System_Restaurant' TO N'$d', MOVE N'System_Restaurant_log' TO N'$l', CHECKSUM;"
if ($LASTEXITCODE -ne 0) { throw 'Restore failed.' }
