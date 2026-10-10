@echo off
setlocal
if exist "%~dp0..\..\..\Nook.exe" goto packaged
node "%~dp0nook-hook.js" %*
exit /b %ERRORLEVEL%
:packaged
set "ELECTRON_RUN_AS_NODE=1"
"%~dp0..\..\..\Nook.exe" "%~dp0nook-hook.js" %*
exit /b %ERRORLEVEL%
