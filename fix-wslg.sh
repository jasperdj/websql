#!/bin/bash

echo "=== WSLg Fix Script ==="
echo ""
echo "This script will guide you through fixing WSLg"
echo ""

# Check if we can create X11 directory
echo "1. Creating X11 directories..."
sudo mkdir -p /tmp/.X11-unix
sudo chmod 1777 /tmp/.X11-unix
echo "   Done"
echo ""

# Check for mnt/wslg runtime
echo "2. Checking WSLg runtime directory..."
if [ -d "/mnt/wslg/runtime-dir" ]; then
    echo "   ✓ WSLg runtime directory exists"
    ls -la /mnt/wslg/runtime-dir/
else
    echo "   ✗ WSLg runtime directory missing"
    echo "   This suggests WSLg is not properly initialized"
fi
echo ""

# Try to symlink X11 socket
echo "3. Checking for Wayland display..."
if [ -S "/mnt/wslg/runtime-dir/wayland-0" ]; then
    echo "   ✓ Wayland socket found"
    echo "   Creating X11 symlink..."
    sudo ln -sf /mnt/wslg/runtime-dir/wayland-0 /tmp/.X11-unix/X0 2>/dev/null
else
    echo "   ✗ No Wayland socket found"
fi
echo ""

# Set up environment
echo "4. Setting up environment variables..."
echo "   Add these to your ~/.bashrc:"
echo ""
echo "   # WSLg support"
echo "   export DISPLAY=:0"
echo "   export WAYLAND_DISPLAY=wayland-0"
echo "   export XDG_RUNTIME_DIR=/mnt/wslg/runtime-dir"
echo "   export PULSE_SERVER=/mnt/wslg/PulseServer"
echo ""

# Test
echo "5. Testing X11 connection..."
DISPLAY=:0 xset q 2>&1 | head -5 || echo "   X11 test failed"
echo ""

echo "=== If this doesn't work, try: ==="
echo ""
echo "1. In Windows Terminal/PowerShell (as Administrator):"
echo "   wsl --shutdown"
echo "   wsl --update --pre-release"
echo ""
echo "2. Then restart WSL and run this script again"
echo ""
echo "3. If still not working, install VcXsrv as an alternative"