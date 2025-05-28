#!/bin/bash

echo "=== Building Electron App for Windows from WSL ==="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Not in the websql directory"
    exit 1
fi

echo "Step 1: Building web assets..."
npm run build

echo ""
echo "Step 2: Compiling Electron files..."
npm run electron:compile

echo ""
echo "Step 3: Building Windows executable..."
echo ""
echo "Since electron-builder might have issues in WSL, here are your options:"
echo ""
echo "Option A: Use npx to run electron-builder without installing"
echo "Run: npx electron-builder --win"
echo ""
echo "Option B: Manual build"
echo "1. The web files are in: ./dist/"
echo "2. The electron files are in: ./dist-electron/"
echo "3. Copy these to Windows and run electron-builder there"
echo ""
echo "Option C: Use pre-built Electron"
echo "1. Download Electron for Windows from: https://github.com/electron/electron/releases"
echo "2. Extract it"
echo "3. Copy your dist/ and dist-electron/ folders into the resources/app/ folder"
echo "4. Run electron.exe"
echo ""
echo "The compiled files are ready in:"
echo "- Web assets: $(pwd)/dist/"
echo "- Electron files: $(pwd)/dist-electron/"