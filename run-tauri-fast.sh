#!/bin/bash

echo "Running Tauri in optimized mode..."
echo ""
echo "This uses release mode for Rust which is much faster but takes longer to compile initially."
echo ""

# Set environment variables for better performance
export RUST_LOG=error
export LIBGL_ALWAYS_SOFTWARE=1

# Run Tauri with release flag
npm run tauri:dev -- -- --release