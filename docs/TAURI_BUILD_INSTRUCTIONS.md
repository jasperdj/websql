# Building Tauri App for Windows from WSL

## Current Status
✅ Tauri configuration complete
✅ Rust installed and configured
✅ Web assets built successfully
❌ Missing Windows cross-compilation tools

## To Complete the Build

### 1. Install MinGW (Windows cross-compiler)
```bash
sudo apt-get update
sudo apt-get install mingw-w64
```

### 2. Run the build script
```bash
./build-tauri-windows.sh
```

### 3. Alternative: Build without cross-compilation
If you can't install mingw-w64, you can:

#### Option A: Build on Windows directly
1. Copy the project to Windows
2. Install Rust on Windows: https://rustup.rs/
3. Run in Windows PowerShell:
   ```powershell
   cd websql
   npm run tauri:build
   ```

#### Option B: Use GitHub Actions
1. Push to GitHub
2. Use the included GitHub Actions workflow
3. Download built artifacts

## What Tauri Gives You
- **10MB exe** instead of 100MB (Electron)
- **Uses Edge WebView2** (already on Windows)
- **Native performance**
- **Instant startup**
- **Professional installer**

## Build Output
Once built, you'll have:
- `websql-data-compare.exe` - Standalone executable
- `.msi` installer - For IT deployment
- `.exe` installer - For end users

## Quick Test
The easiest way to test is:
1. Install mingw-w64: `sudo apt-get install mingw-w64`
2. Run: `./build-tauri-windows.sh`
3. Copy the exe to Windows and run!

## Why This is Better
- Tauri + WebView2 = 10MB
- Electron = 100MB+
- Same features, 1/10th the size!