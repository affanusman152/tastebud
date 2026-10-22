@echo off
setlocal EnableDelayedExpansion
title tastebud
cd /d "%~dp0"

rem Double-click to type or paste a link, or drag an .html file onto this file.

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  tastebud needs Node.js, which is not installed on this computer.
  echo  Opening nodejs.org: download the LTS version, install it, then run tastebud again.
  echo.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)

if not exist "node_modules\playwright-core" (
  echo.
  echo  First run: installing tastebud's parts. This needs internet once and takes about a minute.
  echo.
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo.
    echo  The install did not finish. Check your internet connection and run tastebud again.
    pause
    exit /b 1
  )
)

if not "%~1"=="" (
  node bin\tastebud.js audit "%~1" --open
  echo.
  pause
  exit /b 0
)

:ask
echo.
echo  tastebud: a spell-checker for design
echo.
echo  Paste a website link, or drag an .html file into this window.
echo  Then press Enter. Leave it empty and press Enter to quit.
echo.
set "TARGET="
set /p "TARGET=  > "
if not defined TARGET exit /b 0
set "TARGET=!TARGET:"=!"
node bin\tastebud.js audit "!TARGET!" --open
goto ask
