# Quick Start: Running WebSQL on Windows

## Fastest Option: Prepare and Transfer

1. **In WSL, run:**
   ```bash
   ./prepare-for-windows.sh
   ```

2. **On Windows:**
   - Find `websql-for-windows.zip` on your Desktop
   - Extract it
   - Double-click `build-windows.ps1`
   - Or run in PowerShell:
     ```powershell
     npm install
     npm run tauri:build
     ```

## What You'll Get

- **WebSQL.exe installer** (~10MB)
- Installs to `Program Files\WebSQL Data Compare`
- Desktop shortcut created
- Uses Edge WebView2 (no Chrome bundle)
- Starts instantly, uses ~50MB RAM

## Requirements on Windows

- Node.js 18+ (https://nodejs.org/)
- Rust (https://rustup.rs/)
- Visual Studio Build Tools or Visual Studio Community

## Alternative: Run Without Building

For quick testing without building an installer:
```powershell
npm install
npm run tauri:dev
```

This opens the app directly without creating an installer.