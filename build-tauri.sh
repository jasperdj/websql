#!/bin/bash

echo "=== Building WebSQL with Tauri (WebView2) ==="
echo ""

# Source cargo environment
source "$HOME/.cargo/env"

# Check if we can use tauri
if ! npx tauri --version &> /dev/null; then
    echo "Tauri CLI is not available. Please install it first."
    exit 1
fi

echo "1. Building web assets..."
npm run build

echo ""
echo "2. Building Tauri app for Linux..."

# Build for Linux (native)
npx tauri build

echo ""
echo "=== Build Complete! ==="
echo ""
echo "Linux packages created in:"
echo "- AppImage: src-tauri/target/release/bundle/appimage/"
echo "- Deb: src-tauri/target/release/bundle/deb/"
echo ""
echo "File sizes:"
echo "- Tauri app: ~10-15MB (vs ~100MB for Electron)"
echo "- Uses system WebKit2"