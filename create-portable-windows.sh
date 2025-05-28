#!/bin/bash

echo "=== Creating Portable Windows Electron App ==="
echo ""

# Ensure builds are up to date
echo "1. Building web assets..."
npm run build

echo ""
echo "2. Compiling Electron files..."
npm run electron:compile

echo ""
echo "3. Creating portable structure..."
mkdir -p portable-win/resources/app

# Copy necessary files
cp -r dist portable-win/resources/app/
cp -r dist-electron portable-win/resources/app/
cp package.json portable-win/resources/app/

# Create a simple run script
cat > portable-win/resources/app/run-electron.js << 'EOF'
// Simple electron runner
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  // Load the compiled main.js
  require('./dist-electron/main.js');
});
EOF

echo ""
echo "4. Creating Windows batch file..."
cat > portable-win/run-websql.bat << 'EOF'
@echo off
echo Starting WebSQL Data Compare...
cd resources\app
..\..\electron.exe run-electron.js
EOF

echo ""
echo "=== Build Complete! ==="
echo ""
echo "To run on Windows:"
echo "1. Download Electron for Windows (win32-x64 or win32-arm64):"
echo "   https://github.com/electron/electron/releases/tag/v28.1.3"
echo ""
echo "2. Extract electron-v28.1.3-win32-x64.zip"
echo ""
echo "3. Copy the contents of ./portable-win/ into the extracted folder"
echo ""
echo "4. Double-click run-websql.bat"
echo ""
echo "Portable files created in: $(pwd)/portable-win/"