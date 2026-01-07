#!/bin/bash

echo "Installing Tauri dependencies..."
echo "This will prompt for your sudo password:"
echo ""

sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

echo ""
echo "Installation complete!"