#!/usr/bin/env python3

import struct
import os

def create_ico_file():
    """Create a proper Windows ICO file with multiple sizes"""
    
    # ICO header
    ico_header = struct.pack('<HHH', 0, 1, 1)  # Reserved, Type (1=ICO), Count
    
    # Directory entry for 32x32 icon
    width = 32
    height = 32
    colors = 0  # 0 = more than 256 colors
    reserved = 0
    planes = 1
    bit_count = 32  # 32-bit color
    image_size = 40 + (width * height * 4)  # Header + RGBA data
    offset = 22  # After header and directory
    
    dir_entry = struct.pack('<BBBBHHII', 
        width if width < 256 else 0,
        height if height < 256 else 0,
        colors, reserved, planes, bit_count, image_size, offset)
    
    # BMP header (BITMAPINFOHEADER)
    bmp_header = struct.pack('<IIIHHIIIIII',
        40,  # Header size
        width,
        height * 2,  # Height * 2 for ICO format
        1,  # Planes
        32,  # Bits per pixel
        0,  # Compression (BI_RGB)
        width * height * 4,  # Image size
        0, 0, 0, 0)  # Resolution and colors
    
    # Create image data (blue square)
    image_data = b''
    for y in range(height):
        for x in range(width):
            # BGRA format (Blue, Green, Red, Alpha)
            image_data += struct.pack('BBBB', 235, 99, 37, 255)  # Blue color
    
    # AND mask (all transparent)
    and_mask_size = ((width + 31) // 32) * 4 * height
    and_mask = b'\x00' * and_mask_size
    
    # Combine all parts
    ico_data = ico_header + dir_entry + bmp_header + image_data + and_mask
    
    # Write ICO file
    os.chdir('src-tauri/icons')
    with open('icon.ico', 'wb') as f:
        f.write(ico_data)
    
    print(f'Created proper Windows icon.ico ({len(ico_data)} bytes)')

if __name__ == '__main__':
    create_ico_file()