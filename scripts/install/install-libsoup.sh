#!/bin/bash

echo "Installing missing libsoup-3.0 dependency..."
echo "This will prompt for your sudo password:"
echo ""

sudo apt update && sudo apt install -y libsoup-3.0-dev

echo ""
echo "Installation complete!"