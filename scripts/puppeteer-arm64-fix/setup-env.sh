#!/bin/bash

echo "Setting up Puppeteer environment for ARM64..."

# Set environment variables
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/home/jjasp/.cache/ms-playwright/chromium-1169/chrome-linux/chrome

# Check if Playwright Chrome exists
if [ ! -f "$PUPPETEER_EXECUTABLE_PATH" ]; then
  echo "Playwright Chrome not found. Installing..."
  cd /home/jjasp/github/websql
  npx playwright install chromium
fi

echo "Environment setup complete!"
echo ""
echo "To use Puppeteer, set these environment variables:"
echo "export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
echo "export PUPPETEER_EXECUTABLE_PATH=$PUPPETEER_EXECUTABLE_PATH"
