@echo off
title Noir - Oyun Sunucusu
color 0A

echo.
echo  ==========================================
echo    ^|       NOIR - Oyun Sunucusu       ^|
echo  ==========================================
echo.
echo  Sunucu baslatiliyor, lutfen bekleyin...
echo  Bu pencereyi kapatmayin!
echo.

cd /d "%~dp0"

:: 2 saniye sonra tarayiciyi ac
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5173"

:: Sunucuyu baslat
npm run dev

pause
