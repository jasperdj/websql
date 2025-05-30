#!/bin/bash
# Prepare WebSQL for Windows portable build from WSL/Linux

echo "=== Preparing WebSQL for Windows Portable Build ==="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Must run from WebSQL root directory"
    exit 1
fi

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist
rm -rf src-tauri/target/release

# Install dependencies
echo "Installing dependencies..."
npm ci
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

# Sync versions
echo "Syncing versions..."
npm run version:sync

# Build frontend
echo "Building frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "Error: Failed to build frontend"
    exit 1
fi

echo ""
echo "=== Frontend build complete! ==="
echo ""
echo "Next steps to build on Windows:"
echo "1. Copy this entire project to Windows"
echo "2. Open PowerShell as Administrator"
echo "3. Navigate to the project directory"
echo "4. Run: ./build-portable-windows.ps1"
echo ""
echo "Or if you have Rust installed on Windows:"
echo "1. cd src-tauri"
echo "2. cargo build --release"
echo "3. The executable will be at: src-tauri/target/release/websql-data-compare.exe"
echo ""

# Create a simple Windows build script
cat > build-windows-simple.bat << 'EOF'
@echo off
echo Building WebSQL for Windows...
cd src-tauri
cargo build --release
cd ..
echo.
echo Build complete! Executable at: src-tauri\target\release\websql-data-compare.exe
pause
EOF

echo "Created build-windows-simple.bat for easy Windows building"