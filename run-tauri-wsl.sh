#!/bin/bash

echo "=== Running Tauri Linux App in WSL ==="
echo ""

# Check if running in WSL
if ! grep -q Microsoft /proc/version; then
    echo "Not running in WSL. Just run: npm run tauri:dev"
    exit 1
fi

# For WSL1, we need an X server
if [[ $(uname -r) == *"4.4.0"* ]]; then
    echo "Detected WSL1. You need an X server on Windows."
    echo ""
    echo "Options:"
    echo "1. Install VcXsrv: https://sourceforge.net/projects/vcxsrv/"
    echo "2. Install X410: https://x410.dev/"
    echo "3. Install Xming: https://sourceforge.net/projects/xming/"
    echo ""
    echo "After installing, run the X server with these settings:"
    echo "- Multiple windows"
    echo "- Start no client"
    echo "- Disable access control"
    echo ""
    echo "Then set DISPLAY:"
    export DISPLAY=:0.0
    echo "export DISPLAY=:0.0"
fi

# Install required libraries if missing
if ! dpkg -l | grep -q libwebkit2gtk-4.0-37; then
    echo ""
    echo "Installing required libraries..."
    echo "Run: sudo apt update && sudo apt install -y libwebkit2gtk-4.0-37 libgtk-3-0"
    echo ""
    exit 1
fi

# Option 1: Run development version
echo "Starting Tauri development server..."
npm run tauri:dev

# Option 2: Build and run release version
# echo "Building Tauri app..."
# npm run tauri:build
# ./src-tauri/target/release/websql