@echo off
REM ============================================================
REM  My English Adventure -- launch the map server
REM  Double-click this file, or run it from any terminal.
REM  Stop: press Ctrl+C, or just close this window.
REM
REM  NOTE: This .bat keeps a cmd window open (useful for devs who
REM  want to see server logs). For a one-click, no-window, native
REM  desktop-app feel (fullscreen Chrome, auto-cleanup on close),
REM  use launch.vbs instead -- or run install-shortcut.vbs once to
REM  get a Desktop/Tasbar shortcut that calls it.
REM ============================================================

cd /d "%~dp0app"

if not exist ".venv\Scripts\python.exe" (
  echo.
  echo  [error] Virtualenv not found at .venv\Scripts\python.exe
  echo          Create it inside app first.
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
