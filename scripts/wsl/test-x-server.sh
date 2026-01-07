#!/bin/bash

echo "=== X Server Connection Test for WSL1 ==="
echo ""

# Test different display configurations
test_display() {
    local display=$1
    echo -n "Testing DISPLAY=$display ... "
    DISPLAY=$display timeout 1s xhost 2>&1 >/dev/null
    if [ $? -eq 124 ] || [ $? -eq 0 ]; then
        echo "✓ Connected!"
        return 0
    else
        echo "✗ Failed"
        return 1
    fi
}

echo "1. Testing common display configurations:"
test_display "localhost:0.0" && exit 0
test_display "localhost:0" && exit 0
test_display "127.0.0.1:0.0" && exit 0
test_display "127.0.0.1:0" && exit 0
test_display ":0.0" && exit 0
test_display ":0" && exit 0

# Get Windows host IP for WSL1
WINDOWS_IP=$(route -n | grep '^0.0.0.0' | awk '{print $2}')
echo ""
echo "2. Windows host IP detected: $WINDOWS_IP"
test_display "${WINDOWS_IP}:0.0" && exit 0
test_display "${WINDOWS_IP}:0" && exit 0

echo ""
echo "=== No X server found ==="
echo ""
echo "Please ensure VcXsrv is running on Windows:"
echo ""
echo "1. Start VcXsrv (XLaunch)"
echo "2. Choose 'Multiple windows'"
echo "3. Choose 'Start no client'"
echo "4. CHECK 'Disable access control' ← Important!"
echo "5. Finish"
echo ""
echo "The X server icon should appear in your Windows system tray."