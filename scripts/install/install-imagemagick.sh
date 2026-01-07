#!/bin/bash

echo "Installing ImageMagick for icon generation..."
echo "This will prompt for your sudo password:"
echo ""

sudo apt update && sudo apt install -y imagemagick

echo ""
echo "Installation complete!"