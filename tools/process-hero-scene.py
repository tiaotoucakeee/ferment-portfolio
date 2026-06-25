from PIL import Image
from collections import deque
import cv2
import numpy as np
import os
import json

SRC = r'C:\Users\xqsx4\.cursor\projects\d-2025-26\assets'
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
REF = os.path.join(
    SRC,
    'c__Users_xqsx4_AppData_Roaming_Cursor_User_workspaceStorage_cdde79f268164ccfd551d337eb920f66_images_image-1c7217e6-12e3-4df6-bfa3-e9cf1283b218.png',
)

FILES = {
    'hero-scene-bg.png': 'c__Users_xqsx4_AppData_Roaming_Cursor_User_workspaceStorage_cdde79f268164ccfd551d337eb920f66_images_image-654fa000-9c4e-4566-9aa4-e2b0b163f5ef.png',
    'hero-prop-desk.png': 'c__Users_xqsx4_AppData_Roaming_Cursor_User_workspaceStorage_cdde79f268164ccfd551d337eb920f66_images_image-09c702bf-0b1c-4664-a0ce-778bcf194ebf.png',
    'hero-prop-counter.png': 'c__Users_xqsx4_AppData_Roaming_Cursor_User_workspaceStorage_cdde79f268164ccfd551d337eb920f66_images_image-071b85a1-1e97-4c68-a809-8fa76b396833.png',
    'hero-prop-board.png': 'c__Users_xqsx4_AppData_Roaming_Cursor_User_workspaceStorage_cdde79f268164ccfd551d337eb920f66_images_image-1f9f1811-ffac-4c7c-9f84-361704ecfea3.png',
}

NAMES = {
    'hero-prop-desk.png': 'desk',
    'hero-prop-counter.png': 'counter',
    'hero-prop-board.png': 'board',
}


def key_white(im, tolerance=22):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    bg = [[False] * w for _ in range(h)]

    def is_bg(x, y):
        r, g, b, _a = px[x, y]
        return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance

    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(x, y) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and is_bg(nx, ny):
                bg[ny][nx] = True
                q.append((nx, ny))

    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    opx = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if bg[y][x]:
                opx[x, y] = (r, g, b, 0)
            else:
                opx[x, y] = (r, g, b, 255)
    return out


def crop_alpha(im, pad=4):
    arr = np.array(im)
    mask = arr[:, :, 3] > 20
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + pad + 1)
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + pad + 1)
    crop = Image.fromarray(arr[y0:y1, x0:x1])
    return crop


def match_layout(ref_bgr, prop_rgba):
    mask = (prop_rgba[:, :, 3] > 20).astype(np.uint8) * 255
    ys, xs = np.where(prop_rgba[:, :, 3] > 20)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    tpl = prop_rgba[y0:y1, x0:x1, :3]
    tpl_mask = mask[y0:y1, x0:x1]
    tpl_bgr = cv2.cvtColor(tpl, cv2.COLOR_RGB2BGR)
    th, tw = tpl_bgr.shape[:2]
    h, w = ref_bgr.shape[:2]

    best = None
    for scale in np.linspace(0.35, 1.05, 29):
        nw = max(1, int(tw * scale))
        nh = max(1, int(th * scale))
        if nw >= w or nh >= h:
            continue
        resized = cv2.resize(tpl_bgr, (nw, nh), interpolation=cv2.INTER_AREA)
        resized_mask = cv2.resize(tpl_mask, (nw, nh), interpolation=cv2.INTER_NEAREST)
        result = cv2.matchTemplate(ref_bgr, resized, cv2.TM_CCORR_NORMED, mask=resized_mask)
        _, score, _, (mx, my) = cv2.minMaxLoc(result)
        if best is None or score > best['score']:
            best = {
                'left_pct': round(mx / w * 100, 2),
                'top_pct': round(my / h * 100, 2),
                'width_pct': round(nw / w * 100, 2),
                'height_pct': round(nh / h * 100, 2),
                'scale': round(float(scale), 3),
                'score': round(float(score), 4),
            }
    return best


def main():
    ref = np.array(Image.open(REF).convert('RGB'))
    ref_bgr = cv2.cvtColor(ref, cv2.COLOR_RGB2BGR)
    layout = {}

    for out_name, src_name in FILES.items():
        src = Image.open(os.path.join(SRC, src_name))
        if out_name.startswith('hero-prop'):
            img = key_white(src)
            img = crop_alpha(img)
            name = NAMES[out_name]
            layout[name] = match_layout(ref_bgr, np.array(img))
        else:
            img = src.convert('RGBA')

        dest = os.path.join(OUT, out_name)
        img.save(dest, optimize=True)
        print(dest, img.size, img.mode)

    layout_path = os.path.join(OUT, 'hero-scene-layout.json')
    with open(layout_path, 'w', encoding='utf-8') as f:
        json.dump(layout, f, indent=2)
    print(layout_path)
    print(json.dumps(layout, indent=2))


if __name__ == '__main__':
    main()
