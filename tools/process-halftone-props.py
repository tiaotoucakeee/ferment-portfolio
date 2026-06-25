"""Process high-res halftone hover stickers from 素材/image 8-10.png."""

from PIL import Image
import cv2
import numpy as np
import os

SRC_DIR = os.path.join(os.path.dirname(__file__), '..', '素材')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')

SOURCES = {
    'hero-prop-desk-halftone.png': 'image 10.png',
    'hero-prop-counter-halftone.png': 'image 9.png',
    'hero-prop-board-halftone.png': 'image 8.png',
}


def extract_sticker(img_rgba, black_threshold=28, min_area=800):
    arr = np.array(img_rgba.convert('RGBA'))
    lum = arr[:, :, :3].astype(np.float32).mean(axis=2)
    alpha = arr[:, :, 3].astype(np.float32)

    if alpha.max() > 0:
        visible = (alpha > 16) & (lum >= black_threshold)
    else:
        visible = lum >= black_threshold

    mask = visible.astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n <= 1:
        arr[:, :, 3] = (mask * 255).astype(np.uint8)
        return Image.fromarray(arr)

    best = 1
    best_area = 0
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        if area > best_area and area >= min_area:
            best = i
            best_area = area

    x, y, w, h, _ = stats[best]
    out_alpha = np.where(labels == best, 255, 0).astype(np.uint8)
    arr[:, :, 3] = out_alpha
    return Image.fromarray(arr[y : y + h, x : x + w])


def main():
    for out_name, src_name in SOURCES.items():
        src = Image.open(os.path.join(SRC_DIR, src_name))
        sticker = extract_sticker(src)
        dest = os.path.join(OUT, out_name)
        sticker.save(dest, optimize=True)
        print(dest, sticker.size, src.size)


if __name__ == '__main__':
    main()
