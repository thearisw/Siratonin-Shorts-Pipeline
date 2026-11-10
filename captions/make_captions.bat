@echo off
REM Drag a script .txt/.md onto this file, or run:  make_captions.bat myscript.txt [options]
python "%~dp0make_captions.py" %*
pause
