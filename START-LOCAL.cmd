@echo off
cd /d "%~dp0"
set "PATH=%CD%\runtime;%PATH%"
if not exist dist\index.html (
  echo Build frontend...
  runtime\node.exe node_modules\vite\bin\vite.js build frontend
  if errorlevel 1 exit /b 1
)
echo Phurai Local: http://localhost:5001
echo Dong cua so hoac Ctrl+C de dung.
runtime\node.exe backend\src\index.js
pause
