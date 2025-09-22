from PIL import Image
import os
im_path = r"c:\Users\Hanan\Desktop\InfinityByte Studios\Shared\GlitchRealm\assets\Game Logos\ByteSurge.png"
out_path = r"c:\Users\Hanan\Desktop\InfinityByte Studios\Shared\GlitchRealm\assets\Game Logos\ByteSurge.webp"

if not os.path.exists(im_path):
    print('Source not found:', im_path)
else:
    im = Image.open(im_path)
    w,h = im.size
    im.save(out_path, 'WEBP', quality=85, method=6)
    print('Wrote', out_path)
    print('Size:', w, h)
