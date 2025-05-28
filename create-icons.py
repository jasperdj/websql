#!/usr/bin/env python3

import os
import base64

# Simple 1x1 blue pixel PNG
png_data = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
)

os.chdir('src-tauri/icons')

# Create icon files
for filename in ['32x32.png', '128x128.png', '128x128@2x.png']:
    with open(filename, 'wb') as f:
        f.write(png_data)
    print(f'Created {filename}')

# Create ICO file (same as PNG for now)
with open('icon.ico', 'wb') as f:
    f.write(png_data)
print('Created icon.ico')

# Create ICNS file (placeholder)
with open('icon.icns', 'wb') as f:
    f.write(b'icns')
print('Created icon.icns')