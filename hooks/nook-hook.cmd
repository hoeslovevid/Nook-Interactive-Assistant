@echo off
node "%~dp0nook-hook.js" %*
exit /b %ERRORLEVEL%
