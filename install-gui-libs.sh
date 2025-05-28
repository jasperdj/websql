#!/bin/bash
echo "This script will install the required GUI libraries for Electron."
echo "You need to run it with sudo. Copy and paste this command:"
echo ""
echo "sudo apt-get update && sudo apt-get install -y libgtk-3-0"
echo ""
echo "After installation, run:"
echo "export DISPLAY=:0"
echo "npm run electron:dev"