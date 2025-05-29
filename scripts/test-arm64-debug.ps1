# Enhanced debug script for ARM64 Tauri apps
param(
    [Parameter(Mandatory=$true)]
    [string]$ExePath
)

Write-Host "=== ARM64 Tauri Debug Test ==="
Write-Host ""

# Check architecture compatibility
$exe = Get-Item $ExePath
Write-Host "Executable: $($exe.Name)"
Write-Host "Size: $([math]::Round($exe.Length / 1MB, 2)) MB"

# Check file architecture
Write-Host "`n=== Binary Architecture Check ==="
try {
    $bytes = [System.IO.File]::ReadAllBytes($ExePath)
    # PE header starts at offset specified at 0x3C
    $peOffset = [BitConverter]::ToInt32($bytes, 0x3C)
    # Machine type is at PE header + 4
    $machineType = [BitConverter]::ToUInt16($bytes, $peOffset + 4)
    
    switch ($machineType) {
        0x8664 { Write-Host "Architecture: x64 (AMD64)" }
        0xAA64 { Write-Host "Architecture: ARM64 (AArch64)" }
        0x14C  { Write-Host "Architecture: x86 (32-bit)" }
        default { Write-Host "Architecture: Unknown (0x$($machineType.ToString('X4')))" }
    }
} catch {
    Write-Host "Could not determine architecture: $_"
}

# Check WebView2 installation
Write-Host "`n=== WebView2 Runtime Check ==="
$webview2Paths = @(
    "${env:ProgramFiles}\Microsoft\EdgeWebView\Application",
    "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application",
    "${env:LOCALAPPDATA}\Microsoft\EdgeWebView\Application"
)

$webview2Found = $false
foreach ($path in $webview2Paths) {
    if (Test-Path $path) {
        Write-Host "WebView2 found at: $path"
        $versions = Get-ChildItem -Path $path -Directory | Where-Object { $_.Name -match '\d+\.\d+\.\d+\.\d+' }
        foreach ($ver in $versions) {
            Write-Host "  Version: $($ver.Name)"
            # Check if msedgewebview2.exe exists and its architecture
            $webviewExe = Join-Path $ver.FullName "msedgewebview2.exe"
            if (Test-Path $webviewExe) {
                $webviewInfo = Get-Item $webviewExe
                Write-Host "  WebView2 EXE: $([math]::Round($webviewInfo.Length / 1MB, 2)) MB"
            }
        }
        $webview2Found = $true
    }
}

if (-not $webview2Found) {
    Write-Host "WebView2 Runtime NOT FOUND!"
    Write-Host "For ARM64, you need the ARM64 version of WebView2"
    Write-Host "Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
}

# Check for ARM64 Edge installation
Write-Host "`n=== Microsoft Edge Check ==="
$edgePaths = @(
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

foreach ($edgePath in $edgePaths) {
    if (Test-Path $edgePath) {
        Write-Host "Edge found at: $edgePath"
    }
}

# Check Event Log for application errors
Write-Host "`n=== Checking Windows Event Log ==="
try {
    # Clear any previous test crashes
    $appName = [System.IO.Path]::GetFileNameWithoutExtension($ExePath)
    
    # Get current time
    $startTime = Get-Date
    
    # Start the process
    Write-Host "Starting process..."
    $process = Start-Process -FilePath $ExePath -PassThru
    
    # Wait a bit
    Start-Sleep -Seconds 3
    
    # Check if still running
    if ($process.HasExited) {
        Write-Host "Process exited with code: $($process.ExitCode)"
        
        # Check event log for crashes
        $events = Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=$startTime} -ErrorAction SilentlyContinue |
                  Where-Object { $_.Message -like "*$appName*" -or $_.Message -like "*WebView2*" }
        
        if ($events) {
            Write-Host "`nFound related events in Event Log:"
            foreach ($event in $events) {
                Write-Host "[$($event.Level)] $($event.Message.Split("`n")[0])"
            }
        }
    } else {
        Write-Host "Process is running (PID: $($process.Id))"
        $process.Kill()
    }
} catch {
    Write-Host "Error during process test: $_"
}

# Try running with debugging environment variables
Write-Host "`n=== Running with Debug Environment ==="
try {
    $env:RUST_LOG = "trace"
    $env:RUST_BACKTRACE = "full"
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--enable-logging --v=1"
    
    $debugProcess = Start-Process -FilePath $ExePath -PassThru -NoNewWindow -RedirectStandardError "error.log" -RedirectStandardOutput "output.log"
    Start-Sleep -Seconds 3
    
    if ($debugProcess.HasExited) {
        Write-Host "Debug process exited with code: $($debugProcess.ExitCode)"
        
        if (Test-Path "error.log") {
            Write-Host "`nError log:"
            Get-Content "error.log" | Select-Object -First 20
        }
        
        if (Test-Path "output.log") {
            Write-Host "`nOutput log:"
            Get-Content "output.log" | Select-Object -First 20
        }
    } else {
        Write-Host "Debug process running, stopping..."
        $debugProcess.Kill()
    }
    
    # Cleanup
    Remove-Item "error.log", "output.log" -ErrorAction SilentlyContinue
} catch {
    Write-Host "Debug run error: $_"
}

Write-Host "`n=== Recommendations ==="
Write-Host "1. Ensure you have ARM64 WebView2 Runtime installed"
Write-Host "2. Try running as Administrator"
Write-Host "3. Check Windows Security/Defender logs"
Write-Host "4. Consider installing Visual C++ Redistributables for ARM64"