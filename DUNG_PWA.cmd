@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess -Unique; if($p){$p ^| ForEach-Object {Stop-Process -Id $_ -Force}; Write-Host 'Da dung PWA server.'}else{Write-Host 'Khong tim thay PWA server dang chay.'}"
pause
