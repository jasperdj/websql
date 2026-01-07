#!/bin/bash

echo "=== WSLg Diagnostic Script ==="
echo ""
echo "1. Checking WSL version:"
cat /proc/version

echo ""
echo "2. Checking for WSLg directory:"
ls -la /mnt/wslg/ 2>/dev/null || echo "WSLg directory not found"

echo ""
echo "3. Checking for X11 sockets:"
ls -la /tmp/.X11-unix/ 2>/dev/null || echo "X11 socket directory not found"

echo ""
echo "4. Checking DISPLAY variable:"
echo "DISPLAY=$DISPLAY"

echo ""
echo "5. Checking for running X server:"
ps aux | grep -E "(Xwayland|X11|weston)" | grep -v grep || echo "No X server processes found"

echo ""
echo "6. Checking D-Bus:"
ls -la /run/dbus/system_bus_socket 2>/dev/null || echo "D-Bus socket not found"

echo ""
echo "7. WSL environment variables:"
env | grep -E "(WSL|DISPLAY|WAYLAND)" || echo "No WSL-related env vars found"

echo ""
echo "=== Troubleshooting Steps ==="
echo ""
echo "If WSLg is not working, try:"
echo "1. In Windows PowerShell (as admin): wsl --update"
echo "2. Restart WSL: wsl --shutdown"
echo "3. Start WSL again and check if /mnt/wslg exists"
echo ""
echo "Alternative: Use VcXsrv"
echo "1. Download VcXsrv from: https://sourceforge.net/projects/vcxsrv/"
echo "2. Run XLaunch with 'Disable access control' checked"
echo "3. In WSL, set: export DISPLAY=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}'):0"
echo ""