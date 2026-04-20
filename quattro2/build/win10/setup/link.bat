@REM MS-DOS COMMAND (admin)
@cd %~dp0
mklink /D html ..\..\html
@if %ERRORLEVEL% neq 0 @pause
