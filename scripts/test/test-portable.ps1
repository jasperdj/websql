# PowerShell script to test and debug the portable executable
param(
    [Parameter(Mandatory=$true)]
    [string]$PortableExePath
)

Write-Host "=== WebSQL Portable Executable Test ==="
Write-Host ""

# Check if file exists
if (-not (Test-Path $PortableExePath)) {
    Write-Error "Portable executable not found: $PortableExePath"
    exit 1
}

$exe = Get-Item $PortableExePath
Write-Host "File: $($exe.Name)"
Write-Host "Size: $([math]::Round($exe.Length / 1MB, 2)) MB"
Write-Host "Path: $($exe.FullName)"
Write-Host ""

# Check file properties
Write-Host "=== File Properties ==="
$version = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($exe.FullName)
Write-Host "Product Name: $($version.ProductName)"
Write-Host "File Version: $($version.FileVersion)"
Write-Host "Company: $($version.CompanyName)"
Write-Host "Description: $($version.FileDescription)"
Write-Host ""

# Check for dependencies in the same directory
Write-Host "=== Files in Portable Directory ==="
$portableDir = Split-Path $PortableExePath -Parent
Get-ChildItem -Path $portableDir | ForEach-Object {
    if ($_.PSIsContainer) {
        Write-Host "DIR:  $($_.Name)/"
    } else {
        Write-Host "FILE: $($_.Name) ($([math]::Round($_.Length / 1KB, 2)) KB)"
    }
}
Write-Host ""

# Check system requirements
Write-Host "=== System Check ==="
Write-Host "OS: $((Get-WmiObject Win32_OperatingSystem).Caption)"
Write-Host "Architecture: $($env:PROCESSOR_ARCHITECTURE)"

# Check for WebView2 runtime
$webview2Paths = @(
    "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application",
    "${env:ProgramFiles}\Microsoft\EdgeWebView\Application",
    "${env:LOCALAPPDATA}\Microsoft\EdgeWebView\Application"
)

$webview2Found = $false
foreach ($path in $webview2Paths) {
    if (Test-Path $path) {
        $versions = Get-ChildItem -Path $path -Directory | Where-Object { $_.Name -match '\d+\.\d+\.\d+\.\d+' }
        if ($versions) {
            Write-Host "WebView2 Runtime: Found at $path"
            $webview2Found = $true
            break
        }
    }
}

if (-not $webview2Found) {
    Write-Host "WebView2 Runtime: NOT FOUND - This might be the issue!"
    Write-Host "Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
}
Write-Host ""

# Try to run with error capture
Write-Host "=== Attempting to Run ==="
Write-Host "Starting executable..."

try {
    # Start the process and capture any errors
    $process = Start-Process -FilePath $PortableExePath -PassThru -NoNewWindow -RedirectStandardError "stderr.txt" -RedirectStandardOutput "stdout.txt"
    
    # Wait a few seconds to see if it starts
    Start-Sleep -Seconds 3
    
    if ($process.HasExited) {
        Write-Host "Process exited with code: $($process.ExitCode)"
        
        if (Test-Path "stderr.txt") {
            $stderr = Get-Content "stderr.txt" -Raw
            if ($stderr) {
                Write-Host "Standard Error:"
                Write-Host $stderr
            }
        }
        
        if (Test-Path "stdout.txt") {
            $stdout = Get-Content "stdout.txt" -Raw
            if ($stdout) {
                Write-Host "Standard Output:"
                Write-Host $stdout
            }
        }
    } else {
        Write-Host "Process is running (PID: $($process.Id))"
        Write-Host "Stopping process for testing..."
        $process.Kill()
    }
    
    # Clean up temp files
    Remove-Item "stderr.txt", "stdout.txt" -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "Error starting process: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "=== Test Complete ==="