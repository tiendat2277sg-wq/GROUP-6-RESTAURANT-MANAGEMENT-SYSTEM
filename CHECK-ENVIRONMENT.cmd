@echo off
cd /d "%~dp0"
runtime\node.exe scripts\check-environment.mjs
pause
