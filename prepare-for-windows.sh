#!/bin/bash

echo "=== Preparing WebSQL for Windows Transfer ==="
echo ""

# Build web assets first
echo "1. Building web assets..."
npm run build

echo ""
echo "2. Creating transfer package..."

# Create a clean copy without unnecessary files
cd ..
rm -f websql-for-windows.zip

# Create zip excluding large/unnecessary directories
zip -r websql-for-windows.zip websql/ \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "*/target/*" \
  -x "*/dist-electron/*" \
  -x "*/release/*" \
  -x "*/.npm/*" \
  -x "*/portable-win/*"

echo ""
echo "3. Copying to Windows desktop..."

# Try to find Windows user directory
WIN_USER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r\n')
if [ -n "$WIN_USER" ]; then
    cp websql-for-windows.zip "/mnt/c/Users/$WIN_USER/Desktop/" 2>/dev/null && \
    echo "✅ Copied to C:\\Users\\$WIN_USER\\Desktop\\websql-for-windows.zip" || \
    echo "❌ Could not copy to Windows desktop automatically"
else
    echo "❌ Could not detect Windows username"
fi

echo ""
echo "=== Transfer Instructions ==="
echo ""
echo "The project is ready at: $(pwd)/websql-for-windows.zip"
echo ""
echo "On Windows:"
echo "1. Extract websql-for-windows.zip"
echo "2. Open PowerShell in the extracted folder"
echo "3. Run these commands:"
echo "   npm install"
echo "   npm run tauri:build"
echo ""
echo "The Windows installer will be created in:"
echo "src-tauri\\target\\release\\bundle\\nsis\\"