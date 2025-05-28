# Tauri (WebView2) Quick Start

## What is Tauri?
Tauri is a modern alternative to Electron that uses:
- **Edge WebView2** on Windows (already installed)
- **WebKit** on macOS
- **WebKitGTK** on Linux

Result: ~10MB app instead of ~100MB!

## Current Status
✅ Tauri configuration created
✅ Rust source files ready
⏳ Tauri CLI installing (takes ~10-15 minutes first time)

## To Build for Windows

### Option 1: After Tauri CLI finishes
```bash
# Check if installed
source "$HOME/.cargo/env"
cargo-tauri --version

# Build for Windows
npm run tauri:build:win
```

### Option 2: Use npx (no install needed)
```bash
# This downloads and runs tauri without installing
npx @tauri-apps/cli build --target x86_64-pc-windows-msvc
```

### Option 3: Direct cargo build
```bash
cd src-tauri
cargo build --release --target x86_64-pc-windows-msvc
```

## Output Files
Windows builds create:
- `src-tauri/target/release/websql-data-compare.exe` - Standalone exe (~10MB)
- `src-tauri/target/release/bundle/msi/` - MSI installer
- `src-tauri/target/release/bundle/nsis/` - NSIS installer

## Development Mode
To run in development with hot reload:
```bash
npm run tauri:dev
```

## Why Tauri is Better for Your App
1. **Tiny size**: 10MB vs 100MB
2. **Native performance**: Uses OS webview
3. **Lower memory usage**: No bundled Chromium
4. **Faster startup**: Instant launch
5. **Auto-updates**: Built-in update system
6. **Better security**: Rust-based backend

## Cross-Compilation
From WSL, you can build for:
- Windows x64: `--target x86_64-pc-windows-msvc`
- Windows ARM64: `--target aarch64-pc-windows-msvc`
- Linux: `--target x86_64-unknown-linux-gnu`

## Next Steps
Once Tauri CLI is installed, your app will:
1. Use Edge WebView2 (no download needed)
2. Be a single ~10MB exe file
3. Start instantly
4. Use less memory than Chrome tab
5. Look and feel native on Windows