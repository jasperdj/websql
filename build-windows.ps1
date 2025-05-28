# WebSQL Windows Build Script
Write-Host "=== Building WebSQL for Windows ===" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if Rust is installed
try {
    $rustVersion = rustc --version
    Write-Host "✓ Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Rust not found. Please install from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build the app
Write-Host ""
Write-Host "Building Tauri app..." -ForegroundColor Yellow
npm run tauri:build

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

# Show output location
Write-Host ""
Write-Host "=== Build Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Installers created in:" -ForegroundColor Cyan
Write-Host "  • NSIS Installer: src-tauri\target\release\bundle\nsis\" -ForegroundColor White
Write-Host "  • MSI Installer: src-tauri\target\release\bundle\msi\" -ForegroundColor White
Write-Host "  • Executable: src-tauri\target\release\websql.exe" -ForegroundColor White
Write-Host ""

# Open the output folder
$outputPath = Join-Path $PSScriptRoot "src-tauri\target\release\bundle\nsis"
if (Test-Path $outputPath) {
    Write-Host "Opening output folder..." -ForegroundColor Yellow
    Start-Process explorer.exe $outputPath
}