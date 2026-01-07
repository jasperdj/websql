#!/bin/bash

echo "=== Building WebSQL with Tauri for Windows ==="
echo ""

# Source cargo environment
source "$HOME/.cargo/env"

# Ensure we're in the right directory
cd /home/jjasp/github/websql

echo "1. Building web assets..."
npm run build

echo ""
echo "2. Checking Rust toolchain..."
rustc --version
cargo --version

echo ""
echo "3. Building Tauri app..."
cd src-tauri

# Build for Windows using GNU target (works from WSL)
cargo build --release --target x86_64-pc-windows-gnu

echo ""
echo "=== Build Status ==="
if [ -f "target/x86_64-pc-windows-gnu/release/websql-data-compare.exe" ]; then
    echo "✅ Build successful!"
    echo ""
    echo "Windows executable created:"
    ls -lh target/x86_64-pc-windows-gnu/release/*.exe
    echo ""
    echo "To run on Windows:"
    echo "1. Copy websql-data-compare.exe to Windows"
    echo "2. Make sure Edge WebView2 is installed (it usually is)"
    echo "3. Double-click the exe!"
    echo ""
    echo "Size comparison:"
    echo "- Tauri exe: $(du -h target/x86_64-pc-windows-gnu/release/websql-data-compare.exe | cut -f1)"
    echo "- Electron would be: ~100MB"
else
    echo "❌ Build failed. Check the error messages above."
fi