# Building WebSQL for Windows

You have 3 options to get the Tauri app running on Windows:

## Option 1: Build on Windows Directly (Recommended)

### Prerequisites on Windows:
1. **Install Node.js** (v18 or later)
   - Download from: https://nodejs.org/

2. **Install Rust**
   - Download from: https://www.rust-lang.org/tools/install
   - Run the installer and follow prompts

3. **Install Microsoft C++ Build Tools**
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Or install Visual Studio Community with C++ workload

### Build Steps on Windows:
```powershell
# 1. Clone or transfer the project to Windows
# 2. Open PowerShell or Command Prompt in the project directory

# 3. Install dependencies
npm install

# 4. Build the Tauri app
npm run tauri:build

# The installer will be in:
# src-tauri\target\release\bundle\nsis\
# src-tauri\target\release\bundle\msi\
```

## Option 2: Use Pre-built Windows Binary from WSL

Since cross-compilation requires mingw-w64 (which failed to install), let's create a simple Windows build locally:

```bash
# In WSL, build just the web assets
npm run build

# Then transfer to Windows and build there
```

## Option 3: Quick Development Build

For testing purposes, you can run the development version:

```powershell
# On Windows, in the project directory
npm install
npm run tauri:dev
```

## File Transfer from WSL to Windows

To transfer your project from WSL to Windows:

```bash
# Option 1: Copy to Windows filesystem
cp -r /home/jjasp/github/websql /mnt/c/Users/YOUR_USERNAME/Desktop/

# Option 2: Create a zip file
cd /home/jjasp/github
zip -r websql.zip websql/ -x "*/node_modules/*" -x "*/.git/*" -x "*/target/*"
cp websql.zip /mnt/c/Users/YOUR_USERNAME/Desktop/
```

## Expected Results

Once built on Windows:
- **Installer Size**: ~10-15MB
- **Installed Size**: ~20-30MB  
- **RAM Usage**: ~50MB
- **Uses Edge WebView2** (already on Windows 10/11)

## Troubleshooting

If you get Rust errors on Windows:
- Make sure you installed the MSVC toolchain (not GNU)
- Restart your terminal after installing Rust
- Run `rustup default stable-msvc`

If npm install fails:
- Delete node_modules and package-lock.json
- Run `npm install` again