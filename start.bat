@echo off
rem Double click this to run the cake shop.
cd /d "%~dp0"
echo Starting the Tera shop server...
echo.
node server.js
echo.
echo The server stopped. Press any key to close this window.
pause >nul
