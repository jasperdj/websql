# WebSQL Windows Portable Quick Rebuild Script
# For use when you've already built once and just need to rebuild

param(
    [switch]$SkipFrontend,
    [switch]$SkipDependencies,
    [switch]$Debug
)

Write-Host "=== Quick Rebuild WebSQL Portable ===" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Install/update dependencies if not skipped
if (-not $SkipDependencies) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

# Build frontend if not skipped
if (-not $SkipFrontend) {
    Write-Host "Building frontend..." -ForegroundColor Yellow
    npx vite build --config vite.config.tauri.ts
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build frontend"
        exit 1
    }
}

# Build Tauri
Write-Host "Building Tauri application..." -ForegroundColor Yellow
Set-Location src-tauri

$env:CARGO_BUILD_JOBS = "8"

if ($Debug) {
    cargo build
    $buildType = "debug"
} else {
    cargo build --release
    $buildType = "release"
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build Tauri"
    Set-Location ..
    exit 1
}

Set-Location ..

# Copy to portable
Write-Host "Updating portable package..." -ForegroundColor Yellow

if (-not (Test-Path "portable")) {
    New-Item -ItemType Directory -Path "portable" -Force | Out-Null
}

$exePath = "src-tauri\target\$buildType\websql-data-compare.exe"
Copy-Item $exePath "portable\WebSQL.exe" -Force

$webview2Path = "src-tauri\target\$buildType\WebView2Loader.dll"
if (Test-Path $webview2Path) {
    Copy-Item $webview2Path "portable\" -Force
}

Write-Host ""
Write-Host "[OK] Rebuild complete!" -ForegroundColor Green
Write-Host "  Executable: portable\WebSQL.exe" -ForegroundColor White
Write-Host ""

# Offer to run
$response = Read-Host "Run WebSQL? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    Start-Process "portable\WebSQL.exe"
}