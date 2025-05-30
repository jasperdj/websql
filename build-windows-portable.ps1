# WebSQL Windows Portable Build Script
# Builds the entire app and creates a portable Windows executable

Write-Host "=== Building WebSQL Portable for Windows ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Error "Node.js not found. Please install from https://nodejs.org/"
    exit 1
}

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Host "[OK] Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Error "Rust not found. Please install from https://rustup.rs/"
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Clean previous builds
Write-Host ""
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") { 
    Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "src-tauri\target\release") { 
    Remove-Item -Path "src-tauri\target\release" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "portable") { 
    Remove-Item -Path "portable" -Recurse -Force -ErrorAction SilentlyContinue
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies"
    exit 1
}

# Sync versions
Write-Host ""
Write-Host "Syncing versions..." -ForegroundColor Yellow
npm run version:sync
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to sync versions"
    exit 1
}

# Build frontend for Tauri
Write-Host ""
Write-Host "Building frontend..." -ForegroundColor Yellow
npx tsc -b
if ($LASTEXITCODE -ne 0) {
    Write-Error "TypeScript compilation failed"
    exit 1
}

npx vite build --config vite.config.tauri.ts
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build frontend"
    exit 1
}

# Build Tauri application
Write-Host ""
Write-Host "Building Tauri application (this may take a few minutes)..." -ForegroundColor Yellow
Set-Location src-tauri

# Set environment variable for parallel builds
$env:CARGO_BUILD_JOBS = "8"

# Build release version
cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build Tauri application"
    Set-Location ..
    exit 1
}

Set-Location ..

# Create portable package
Write-Host ""
Write-Host "Creating portable package..." -ForegroundColor Yellow

# Create portable directory
New-Item -ItemType Directory -Path "portable" -Force | Out-Null

# Check if executable exists
$exePath = "src-tauri\target\release\websql-data-compare.exe"
if (-not (Test-Path $exePath)) {
    Write-Error "Executable not found at: $exePath"
    exit 1
}

# Copy executable
Copy-Item $exePath "portable\WebSQL.exe"
Write-Host "[OK] Copied main executable" -ForegroundColor Green

# Copy WebView2 loader if it exists
$webview2Path = "src-tauri\target\release\WebView2Loader.dll"
if (Test-Path $webview2Path) {
    Copy-Item $webview2Path "portable\"
    Write-Host "[OK] Copied WebView2Loader.dll" -ForegroundColor Green
}

# Check if the app needs additional resources
# Tauri v2 usually embeds everything in the exe, but let's check
$resourcesPath = "src-tauri\target\release\resources"
if (Test-Path $resourcesPath) {
    Copy-Item -Path $resourcesPath -Destination "portable\resources" -Recurse
    Write-Host "[OK] Copied resources folder" -ForegroundColor Green
}

# Create launcher batch file
@'
@echo off
cd /d "%~dp0"
start "" "WebSQL.exe"
'@ | Out-File -FilePath "portable\Launch WebSQL.bat" -Encoding ASCII
Write-Host "[OK] Created launcher script" -ForegroundColor Green

# Create README
$packageVersion = (Get-Content package.json | ConvertFrom-Json).version
$buildDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$readmeContent = @"
WebSQL Portable Edition
======================

This is a portable version of WebSQL that can be run from any location.

Requirements:
- Windows 10/11 (64-bit)
- Microsoft Edge WebView2 Runtime (usually pre-installed)

To run:
- Double-click WebSQL.exe or Launch WebSQL.bat

Features:
- No installation required
- Settings stored in user's AppData folder
- Can be run from USB drive

Version: $packageVersion
Built: $buildDate
"@
$readmeContent | Out-File -FilePath "portable\README.txt" -Encoding UTF8
Write-Host "[OK] Created README" -ForegroundColor Green

# Get portable folder size
$portableSize = (Get-ChildItem -Path "portable" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$exeSize = (Get-Item "portable\WebSQL.exe").Length / 1MB

# Create ZIP archive
Write-Host ""
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
$zipPath = "WebSQL-Portable-Windows.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

Compress-Archive -Path "portable\*" -DestinationPath $zipPath -CompressionLevel Optimal

# Summary
Write-Host ""
Write-Host "=== Build Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Portable package created successfully!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Details:" -ForegroundColor Yellow
Write-Host ("  - Executable size: {0:N2} MB" -f $exeSize) -ForegroundColor White
Write-Host ("  - Portable folder size: {0:N2} MB" -f $portableSize) -ForegroundColor White
$archiveSize = (Get-Item $zipPath).Length / 1MB
Write-Host ("  - Archive: {0} ({1:N2} MB)" -f $zipPath, $archiveSize) -ForegroundColor White
Write-Host ""
Write-Host "Files created:" -ForegroundColor Yellow
Write-Host "  - portable\WebSQL.exe - Main executable" -ForegroundColor White
Write-Host "  - portable\Launch WebSQL.bat - Launcher script" -ForegroundColor White
Write-Host "  - portable\README.txt - Instructions" -ForegroundColor White
Write-Host "  - $zipPath - Compressed archive" -ForegroundColor White
Write-Host ""

# Offer to test
$response = Read-Host "Would you like to test the portable executable? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host "Launching WebSQL..." -ForegroundColor Yellow
    Start-Process "portable\WebSQL.exe"
}

# Offer to open folder
$response = Read-Host "Open portable folder? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    Start-Process explorer.exe (Resolve-Path "portable")
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green