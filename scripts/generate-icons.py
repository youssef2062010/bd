from PIL import Image, ImageDraw
import math

def draw_phone_icon(size):
    # Create image with RGBA
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Rounded rectangle background with vibrant green gradient
    radius = int(size * 0.225)
    
    # Base background
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=(16, 185, 129, 255))
    
    # Phone handset dimensions scaled to size
    # Draw realistic phone handset
    center_x = size / 2
    center_y = size / 2
    scale = size / 192.0
    
    # Coordinates of phone handset polygon/arcs
    # Or create a smooth icon
    handset = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(handset)
    
    # Earpiece circle
    p1 = (center_x - 30 * scale, center_y - 38 * scale)
    r1 = 18 * scale
    hdraw.ellipse([p1[0] - r1, p1[1] - r1, p1[0] + r1, p1[1] + r1], fill=(255, 255, 255, 255))
    
    # Mouthpiece circle
    p2 = (center_x + 38 * scale, center_y + 30 * scale)
    r2 = 18 * scale
    hdraw.ellipse([p2[0] - r2, p2[1] - r2, p2[0] + r2, p2[1] + r2], fill=(255, 255, 255, 255))
    
    # Connecting handle bar
    hdraw.line([p1[0], p1[1], p2[0], p2[1]], fill=(255, 255, 255, 255), width=int(18 * scale))
    
    # Curve handle
    curve_center = (center_x + 8 * scale, center_y - 8 * scale)
    hdraw.arc([center_x - 45 * scale, center_y - 45 * scale, center_x + 45 * scale, center_y + 45 * scale], start=100, end=210, fill=(255, 255, 255, 255), width=int(16 * scale))
    
    # Rotate handset by -45 degrees for classic phone tilt
    rotated = handset.rotate(-42, resample=Image.BICUBIC, center=(center_x, center_y))
    img.alpha_composite(rotated)
    
    return img

if __name__ == '__main__':
    icon192 = draw_phone_icon(192)
    icon192.save('public/icon-192.png', 'PNG')
    
    icon512 = draw_phone_icon(512)
    icon512.save('public/icon-512.png', 'PNG')
    print("Successfully generated public/icon-192.png and public/icon-512.png")
