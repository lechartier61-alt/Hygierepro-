\
@echo off
where bash >nul 2>nul
if errorlevel 1 (
  echo Git Bash n'est pas disponible dans le PATH.
  echo Ouvrez le dossier dans Git Bash et lancez :
  echo ./push-github-remplacer.sh
  pause
  exit /b 1
)
bash "%~dp0push-github-remplacer.sh"
pause
