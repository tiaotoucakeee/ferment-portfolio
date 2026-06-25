@echo off
cd /d "%~dp0"
echo.
echo   ferment portfolio preview
echo   Open:  http://localhost:8765
echo   Press Ctrl+C to stop.
echo.
python -m http.server 8765
