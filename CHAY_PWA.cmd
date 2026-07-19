@echo off
setlocal
cd /d "%~dp0"
title SCADA Report Studio PWA Server
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0LOCAL_PWA_SERVER.ps1" -Port 8765
if errorlevel 1 (
  echo.
  echo [LOI] Khong khoi dong duoc PWA server.
  echo Kiem tra xem cong 8765 co dang duoc su dung hay khong.
  pause
)
