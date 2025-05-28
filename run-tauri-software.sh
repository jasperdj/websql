#!/bin/bash

echo "Running Tauri with software rendering for WSL..."
echo ""

# Force software rendering
export LIBGL_ALWAYS_SOFTWARE=1
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export GDK_BACKEND=x11

npm run tauri:dev