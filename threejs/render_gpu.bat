@echo off
rem Fast GPU render.
rem   Drag a video folder (e.g. videos\pineapple) onto this file, or double-click and type the video name.
rem   From cmd: render_gpu.bat pineapple [--from 0 --to 20 --workers 3]
cd /d "%~dp0"
set "V=%~1"
if "%V%"=="" set /p "V=Video name (folder in videos\, e.g. pineapple): "
if exist "%V%\" for %%I in ("%V%") do set "V=%%~nxI"
shift
node kit\render_gpu.js "%V%" %1 %2 %3 %4 %5 %6 %7 %8
echo.
echo Done: videos\%V%\
pause
