#!/bin/bash

# Run Tauri dev with suppressed EGL warnings
export LIBGL_ALWAYS_SOFTWARE=1
npm run tauri:dev