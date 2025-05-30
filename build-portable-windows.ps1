# Build portable Windows executable from WebSQL
# This script builds the Tauri app and creates a portable package

Write-Host "=== Building WebSQL Portable for Windows ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required. Please install from https://nodejs.org/"
    exit 1
}

if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Error "Rust is required. Please install from https://rustup.rs/"
    exit 1
}

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Path "dist" -Recurse -Force }
if (Test-Path "src-tauri\target\release") { Remove-Item -Path "src-tauri\target\release" -Recurse -Force }

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies"
    exit 1
}

# Sync versions
Write-Host "Syncing versions..." -ForegroundColor Yellow
npm run version:sync

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build frontend"
    exit 1
}

# Build Tauri
Write-Host "Building Tauri application..." -ForegroundColor Yellow
cd src-tauri
cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build Tauri"
    exit 1
}
cd ..

# Create portable directory
$portableDir = "portable"
if (Test-Path $portableDir) { Remove-Item -Path $portableDir -Recurse -Force }
New-Item -ItemType Directory -Path $portableDir | Out-Null

# Copy executable
$exePath = "src-tauri\target\release\websql-data-compare.exe"
if (Test-Path $exePath) {
    Copy-Item $exePath "$portableDir\WebSQL.exe"
    Write-Host "✓ Copied main executable" -ForegroundColor Green
} else {
    Write-Error "Main executable not found at $exePath"
    exit 1
}

# Copy WebView2 loader if exists
$webview2Path = "src-tauri\target\release\WebView2Loader.dll"
if (Test-Path $webview2Path) {
    Copy-Item $webview2Path "$portableDir\"
    Write-Host "✓ Copied WebView2Loader.dll" -ForegroundColor Green
}

# Copy resources from dist
if (Test-Path "dist") {
    New-Item -ItemType Directory -Path "$portableDir\resources" -Force | Out-Null
    Copy-Item -Path "dist\*" -Destination "$portableDir\resources\" -Recurse
    Write-Host "✓ Copied web resources" -ForegroundColor Green
}

# Create launcher batch file
@"
@echo off
cd /d "%~dp0"
start "" "WebSQL.exe"
"@ | Out-File -FilePath "$portableDir\Launch WebSQL.bat" -Encoding ASCII

# Create portable archive
$zipPath = "WebSQL-Portable-Windows.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path "$portableDir\*" -DestinationPath $zipPath

# Summary
Write-Host ""
Write-Host "=== Build Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Portable package created:" -ForegroundColor Cyan
Write-Host "  • Archive: $zipPath" -ForegroundColor White
Write-Host "  • Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor White
Write-Host ""
Write-Host "Portable directory contents:" -ForegroundColor Cyan
Get-ChildItem -Path $portableDir -Recurse | Select-Object Name, Length | Format-Table -AutoSize

# Open folder
$response = Read-Host "Open portable folder? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    Start-Process explorer.exe (Resolve-Path $portableDir)
}