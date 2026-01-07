#!/bin/bash

echo "Generating placeholder icons for Tauri..."

cd src-tauri/icons

# Create a simple SVG icon
cat > icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563eb"/>
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="180" font-weight="bold" text-anchor="middle" fill="white">SQL</text>
</svg>
EOF

# Generate PNG icons using ImageMagick (if available) or create placeholders
if command -v convert &> /dev/null; then
    convert icon.svg -resize 32x32 32x32.png
    convert icon.svg -resize 128x128 128x128.png
    convert icon.svg -resize 256x256 128x128@2x.png
    convert icon.svg icon.ico
else
    # Create placeholder files
    echo "ImageMagick not found. Creating placeholder icon files..."
    touch 32x32.png
    touch 128x128.png
    touch 128x128@2x.png
    touch icon.ico
    touch icon.icns
fi

echo "Icons generated in src-tauri/icons/"