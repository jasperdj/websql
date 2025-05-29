@echo off
echo Starting WebSQL with debug logging enabled...
echo.
echo Log file will be created at: %USERPROFILE%\websql-debug.log
echo.

REM Set environment variables for maximum logging
set RUST_LOG=trace
set RUST_BACKTRACE=full
set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--enable-logging --v=1

REM Clear any existing log file
if exist "%USERPROFILE%\websql-debug.log" (
    echo Clearing existing log file...
    del "%USERPROFILE%\websql-debug.log"
)

REM Run the executable
echo Starting WebSQL...
"%~dp0websql-data-compare.exe" %*

REM Check if the log file was created
if exist "%USERPROFILE%\websql-debug.log" (
    echo.
    echo ===== Log file contents: =====
    type "%USERPROFILE%\websql-debug.log"
    echo.
    echo ===== End of log =====
    echo.
    echo Full log saved to: %USERPROFILE%\websql-debug.log
) else (
    echo.
    echo No log file was created. The application may have crashed before logging could start.
)

echo.
pause