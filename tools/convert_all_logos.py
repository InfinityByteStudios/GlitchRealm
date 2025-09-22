from PIL import Image, UnidentifiedImageError
import os
base = r"c:\Users\Hanan\Desktop\InfinityByte Studios\Shared\GlitchRealm\assets\Game Logos"
files = [
    'coderunner logo.png',
    'dimensional dominion.png',
    'neurocore byte wars logo.png',
    'shadowlight.png'
]
for f in files:
    src = os.path.join(base, f)
    if not os.path.exists(src):
        print('Missing:', src)
        continue
    name, ext = os.path.splitext(f)
    out = os.path.join(base, name + '.webp')
    try:
        with Image.open(src) as im:
            im.save(out, 'WEBP', quality=85, method=6)
            print('Wrote', out, 'size', im.size)
    except (UnidentifiedImageError, OSError) as e:
        # File not found, unreadable, or image format not recognized
        print('Error converting', src, '-', type(e).__name__ + ':', e)
