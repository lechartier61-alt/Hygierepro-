@echo off
setlocal
cd /d "%~dp0"
where bash >nul 2>nul
if errorlevel 1 (
  echo Git Bash est introuvable. Ouvrez Git Bash dans ce dossier et lancez :
  echo ./push-github.sh
  pause
  exit /b 1
)
bash "%~dp0push-github.sh"
pause
