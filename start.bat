@echo off
cd /d "%~dp0"
echo Starting Site Generator...
echo.
call npm i
call npm run dev
pause
