#!/bin/bash

echo "Testing GUI support in WSL..."

# Test X11
if [ -n "$DISPLAY" ]; then
    echo "✓ DISPLAY is set to: $DISPLAY"
else
    echo "✗ DISPLAY not set. Setting to :0.0"
    export DISPLAY=:0.0
fi

# Test with a simple GUI app
if command -v xclock &> /dev/null; then
    echo "Testing with xclock..."
    xclock &
    sleep 2
    pkill xclock
elif command -v xeyes &> /dev/null; then
    echo "Testing with xeyes..."
    xeyes &
    sleep 2
    pkill xeyes
else
    echo "No X11 test apps found. Install with: sudo apt install x11-apps"
fi

echo ""
echo "If you see a window, GUI is working!"
echo "If not, install an X server on Windows (VcXsrv recommended)"