@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\open-local.ps1"
if errorlevel 1 pause
