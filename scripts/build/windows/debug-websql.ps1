#!/usr/bin/env pwsh
Write-Host "Starting WebSQL with debug logging enabled..." -ForegroundColor Green
Write-Host ""
Write-Host "Log file will be created at: $env:USERPROFILE\websql-debug.log" -ForegroundColor Yellow
Write-Host ""

# Set environment variables for maximum logging
$env:RUST_LOG = "trace"
$env:RUST_BACKTRACE = "full"
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--enable-logging --v=1"

# Clear any existing log file
$logPath = "$env:USERPROFILE\websql-debug.log"
if (Test-Path $logPath) {
    Write-Host "Clearing existing log file..." -ForegroundColor Yellow
    Remove-Item $logPath
}

# Find the executable
$exePath = Join-Path $PSScriptRoot "websql-data-compare.exe"
if (-not (Test-Path $exePath)) {
    # Try portable executable name
    $exePath = Join-Path $PSScriptRoot "websql-portable.exe"
}
if (-not (Test-Path $exePath)) {
    Write-Host "ERROR: Could not find WebSQL executable in current directory" -ForegroundColor Red
    Write-Host "Looking for: websql-data-compare.exe or websql-portable.exe" -ForegroundColor Red
    exit 1
}

Write-Host "Starting WebSQL from: $exePath" -ForegroundColor Cyan
Write-Host ""

# Run the executable
& $exePath $args

# Check if the log file was created
if (Test-Path $logPath) {
    Write-Host ""
    Write-Host "===== Log file contents: =====" -ForegroundColor Green
    Get-Content $logPath
    Write-Host "===== End of log =====" -ForegroundColor Green
    Write-Host ""
    Write-Host "Full log saved to: $logPath" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "No log file was created. The application may have crashed before logging could start." -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running with administrator privileges:" -ForegroundColor Yellow
    Write-Host "  Start-Process powershell -Verb RunAs -ArgumentList '-File', '$PSCommandPath'" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")