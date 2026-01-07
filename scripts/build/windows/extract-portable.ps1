# PowerShell script to extract portable executable from NSIS installer

param(
    [string]$InstallerPath,
    [string]$OutputDir = ".\portable"
)

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir

# Use 7-Zip to extract the installer contents
# The NSIS installer is essentially a self-extracting archive
$7zipPath = "C:\Program Files\7-Zip\7z.exe"

if (Test-Path $7zipPath) {
    & $7zipPath x -o"$OutputDir\temp" $InstallerPath -y
    
    # Find and copy the main executable
    $exePath = Get-ChildItem -Path "$OutputDir\temp" -Filter "*.exe" -Recurse | 
               Where-Object { $_.Name -like "websql*.exe" -or $_.Name -like "WebSQL*.exe" } |
               Select-Object -First 1
    
    if ($exePath) {
        Copy-Item $exePath.FullName "$OutputDir\WebSQL.exe"
        Write-Host "Extracted portable executable to: $OutputDir\WebSQL.exe"
    } else {
        Write-Error "Could not find main executable in installer"
    }
    
    # Clean up temp directory
    Remove-Item -Path "$OutputDir\temp" -Recurse -Force
} else {
    Write-Error "7-Zip not found. Please install 7-Zip to extract the installer."
}