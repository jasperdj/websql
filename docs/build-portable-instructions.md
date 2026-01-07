# Building WebSQL Portable Windows Executable

## Option 1: Build on Windows (Recommended)

### Prerequisites
1. Install Node.js from https://nodejs.org/
2. Install Rust from https://rustup.rs/
3. Install Visual Studio Build Tools or Visual Studio with C++ workload

### Steps
1. Open PowerShell or Command Prompt
2. Navigate to the WebSQL directory
3. Run the following commands:

```powershell
# Install dependencies
npm ci

# Sync versions
npm run version:sync

# Build the application
npm run tauri:build
```

4. After build completes, find the executable at:
   - `src-tauri\target\release\websql-data-compare.exe`

5. To create a portable package, run:
```powershell
.\build-portable-windows.ps1
```

## Option 2: Build from WSL/Linux with Cross-Compilation

### Prerequisites
```bash
# Install MinGW for cross-compilation
sudo apt-get update
sudo apt-get install -y mingw-w64

# Add Windows target to Rust
rustup target add x86_64-pc-windows-gnu
```

### Steps
```bash
# Clean and build frontend
npm ci
npm run version:sync
npm run build

# Build for Windows
cd src-tauri
cargo build --release --target x86_64-pc-windows-gnu
```

The executable will be at: `src-tauri/target/x86_64-pc-windows-gnu/release/websql-data-compare.exe`

## Option 3: Use GitHub Actions

1. Push your changes to GitHub
2. Create a new tag: `git tag v0.4.0 && git push origin v0.4.0`
3. GitHub Actions will automatically build and create a release with the portable executable

## Creating Portable Package Manually

Once you have the executable, create a portable package:

1. Create a new folder called `portable`
2. Copy these files:
   - `websql-data-compare.exe` → `portable/WebSQL.exe`
   - `WebView2Loader.dll` (if exists) → `portable/`
   - All files from `dist/` → `portable/resources/`

3. Create `portable/Launch WebSQL.bat`:
```batch
@echo off
cd /d "%~dp0"
start "" "WebSQL.exe"
```

4. Zip the `portable` folder to create `WebSQL-Portable-Windows.zip`

## Notes
- The portable executable requires Edge WebView2 Runtime (usually pre-installed on Windows 10/11)
- The executable is self-contained and doesn't require installation
- Configuration is stored in the user's AppData folder