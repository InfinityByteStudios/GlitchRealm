"""
Convert game logos to WebP format for faster loading
Requires: pip install Pillow
"""
from PIL import Image
import os
from pathlib import Path

def convert_to_webp(input_path, output_path=None, quality=85):
    """Convert image to WebP format"""
    if output_path is None:
        output_path = str(Path(input_path).with_suffix('.webp'))
    
    try:
        with Image.open(input_path) as img:
            # Convert RGBA to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            
            img.save(output_path, 'WebP', quality=quality, method=6)
            
            # Get file sizes
            orig_size = os.path.getsize(input_path)
            webp_size = os.path.getsize(output_path)
            savings = ((orig_size - webp_size) / orig_size) * 100
            
            print(f"✓ {Path(input_path).name} → {Path(output_path).name}")
            print(f"  {orig_size/1024:.1f}KB → {webp_size/1024:.1f}KB ({savings:.1f}% smaller)")
            
    except (OSError, IOError) as e:
        print(f"✗ Error converting {input_path}: {e}")
    except ValueError as e:
        print(f"✗ Invalid image format {input_path}: {e}")

def main():
    logo_dir = Path(__file__).parent.parent / "assets" / "game logos"
    
    if not logo_dir.exists():
        print(f"Error: Directory not found: {logo_dir}")
        return
    
    print("Converting game logos to WebP format...\n")
    
    # Convert PNG and JPG files
    for ext in ['*.png', '*.jpg', '*.jpeg']:
        for img_file in logo_dir.glob(ext):
            # Skip if WebP already exists
            webp_file = img_file.with_suffix('.webp')
            if not webp_file.exists():
                convert_to_webp(str(img_file), str(webp_file))
            else:
                print(f"⊘ Skipping {img_file.name} (WebP already exists)")
    
    print("\n✓ Conversion complete!")
    print("\nNext steps:")
    print("1. Update HTML to use <picture> elements with WebP fallback")
    print("2. Service worker will auto-serve WebP to supporting browsers")

if __name__ == "__main__":
    main()
