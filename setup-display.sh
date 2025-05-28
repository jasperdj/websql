#!/bin/bash

# Get Windows host IP
export WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "Windows host IP: $WINDOWS_HOST"

# Try different display configurations
echo "Trying different display configurations..."

# Try WSLg default
export DISPLAY=:0
echo "1. Trying DISPLAY=:0"
if xset q &>/dev/null; then
    echo "✓ Display :0 works!"
    exit 0
fi

# Try with .0
export DISPLAY=:0.0
echo "2. Trying DISPLAY=:0.0"
if xset q &>/dev/null; then
    echo "✓ Display :0.0 works!"
    exit 0
fi

# Try Windows host
export DISPLAY=$WINDOWS_HOST:0.0
echo "3. Trying DISPLAY=$WINDOWS_HOST:0.0"
if xset q &>/dev/null; then
    echo "✓ Display $WINDOWS_HOST:0.0 works!"
    echo "You have an X server running on Windows (like VcXsrv)"
    exit 0
fi

# Try localhost
export DISPLAY=localhost:0.0
echo "4. Trying DISPLAY=localhost:0.0"
if xset q &>/dev/null; then
    echo "✓ Display localhost:0.0 works!"
    exit 0
fi

echo ""
echo "❌ No working display found."
echo ""
echo "To fix this:"
echo "1. Install VcXsrv on Windows from: https://sourceforge.net/projects/vcxsrv/"
echo "2. Run XLaunch with:"
echo "   - Multiple windows"
echo "   - Start no client"
echo "   - ✓ Disable access control (important!)"
echo "3. Then run: export DISPLAY=$WINDOWS_HOST:0.0"
echo "4. Run: npm run electron:dev"