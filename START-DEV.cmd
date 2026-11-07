@echo off
cd /d "%~dp0"
set "PATH=%CD%\runtime;%PATH%"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\stop-local.ps1
if errorlevel 1 exit /b 1
echo Development UI: http://localhost:5173
echo API: http://localhost:5001 - Ctrl+C to stop both.
call runtime\npm.cmd run dev:full
pause
