#!/bin/bash

echo "Installing missing JavaScriptCore GTK dependency..."
echo "This will prompt for your sudo password:"
echo ""

sudo apt update && sudo apt install -y libjavascriptcoregtk-4.1-dev

echo ""
echo "Installation complete!"