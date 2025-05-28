#!/usr/bin/env python3

import os
import struct
import zlib

def create_png(width, height, color=(37, 99, 235)):  # Blue color
    """Create a minimal valid PNG file"""
    
    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # RGBA, 8-bit
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff  # Calculate correct CRC
    ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # Create image data (simple solid color with alpha)
    row_bytes = width * 4  # 4 bytes per RGBA pixel
    image_data = b''
    for y in range(height):
        row = b'\x00'  # Filter type: None
        for x in range(width):
            row += bytes(color) + b'\xff'  # RGBA pixel (full opacity)
        image_data += row
    
    # Compress with zlib
    compressed = zlib.compress(image_data, 1)
    
    # IDAT chunk
    idat_crc = zlib.crc32(b'IDAT' + compressed) & 0xffffffff
    idat_chunk = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_chunk = b'\x00\x00\x00\x00IEND\xae\x42\x60\x82'
    
    return png_signature + ihdr_chunk + idat_chunk + iend_chunk

# Change to icons directory
os.chdir('src-tauri/icons')

# Create proper PNG files
sizes = [(32, 32), (128, 128), (256, 256)]
names = ['32x32.png', '128x128.png', '128x128@2x.png']

for (width, height), name in zip(sizes, names):
    png_data = create_png(width, height)
    with open(name, 'wb') as f:
        f.write(png_data)
    print(f'Created {name} ({len(png_data)} bytes)')

print('All PNG icons created successfully!')