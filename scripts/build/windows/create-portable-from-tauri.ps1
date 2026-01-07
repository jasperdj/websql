# PowerShell script to create portable executable from Tauri build
# This extracts the main executable from a Tauri NSIS installer

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallerPath,
    
    [string]$OutputPath = ".\WebSQL-Portable.exe"
)

# Check if installer exists
if (-not (Test-Path $InstallerPath)) {
    Write-Error "Installer not found: $InstallerPath"
    exit 1
}

# Create temp directory
$tempDir = Join-Path $env:TEMP "websql-portable-$(Get-Random)"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
    # Check for 7-Zip
    $7zipPath = @(
        "C:\Program Files\7-Zip\7z.exe",
        "C:\Program Files (x86)\7-Zip\7z.exe",
        "$env:ProgramFiles\7-Zip\7z.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $7zipPath) {
        Write-Error "7-Zip not found. Please install 7-Zip to extract the installer."
        exit 1
    }

    Write-Host "Extracting installer contents..."
    & $7zipPath x -o"$tempDir" $InstallerPath -y | Out-Null

    # Find the main executable
    $mainExe = Get-ChildItem -Path $tempDir -Filter "*.exe" -Recurse | 
               Where-Object { 
                   $_.Name -match "websql|WebSQL" -and 
                   $_.Name -notmatch "setup|installer|uninstall" -and
                   $_.Length -gt 1MB  # Main exe should be substantial
               } |
               Sort-Object Length -Descending |
               Select-Object -First 1

    if ($mainExe) {
        # Copy the executable
        Copy-Item $mainExe.FullName $OutputPath -Force
        
        # Find and copy any required DLLs from the same directory
        $exeDir = $mainExe.Directory
        $dlls = Get-ChildItem -Path $exeDir -Filter "*.dll" -ErrorAction SilentlyContinue
        
        if ($dlls) {
            $outputDir = Split-Path $OutputPath -Parent
            foreach ($dll in $dlls) {
                Copy-Item $dll.FullName (Join-Path $outputDir $dll.Name) -Force
            }
            Write-Host "Copied $($dlls.Count) DLL files"
        }
        
        Write-Host "Successfully created portable executable: $OutputPath"
        Write-Host "Size: $([math]::Round($mainExe.Length / 1MB, 2)) MB"
    } else {
        Write-Error "Could not find main executable in installer"
        
        # List what was found for debugging
        Write-Host "`nFiles found in installer:"
        Get-ChildItem -Path $tempDir -Filter "*.exe" -Recurse | 
            ForEach-Object { Write-Host "  - $($_.FullName) ($([math]::Round($_.Length / 1KB, 2)) KB)" }
    }
} finally {
    # Clean up temp directory
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}