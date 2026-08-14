@echo off
REM ============================================================
REM  My English Adventure — launch the map server
REM  Double-click this file, or run it from any terminal.
REM  Stop: press Ctrl+C, or just close this window.
REM ============================================================

cd /d "%~dp0roleplay-website"

if not exist ".venv\Scripts\python.exe" (
    echo.
    echo  [error] Virtualenv not found at .venv\Scripts\python.exe
    echo          Create it inside roleplay-website first.
    echo.
    pause
    exit /b 1
)

echo.
echo  Starting My English Adventure ...
echo  Opening http://127.0.0.1:5000 in your browser.
echo  (Stop with Ctrl+C.)
echo.

start "" http://127.0.0.1:5000
".venv\Scripts\python.exe" app.py

echo.
echo  Server stopped.
pause
