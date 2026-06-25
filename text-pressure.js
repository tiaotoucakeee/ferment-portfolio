/** Cursor-proximity letter animation (ported from React Bits TextPressure / CodePen rgXKGQ). */
function initTextPressure(root, options = {}) {
  if (!root) return null;

  const {
    weight = true,
    width = true,
    italic = true,
    alpha = false,
    minWeight = 420,
    maxWeight = 820,
    minOpsz = 28,
    maxOpsz = 88,
    minScaleX = 0.9,
    maxScaleX = 1.1,
    maxSkew = 8,
    smoothing = 15,
  } = options;

  const chars = [...root.querySelectorAll('.hero-char')];
  if (!chars.length) return null;

  const mouse = { x: 0, y: 0 };
  const cursor = { x: 0, y: 0 };
  let rafId = 0;
  let running = false;

  const dist = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAttr = (distance, maxDist, minVal, maxVal) => {
    const t = Math.min(1, Math.max(0, distance / maxDist));
    return minVal + (maxVal - minVal) * (1 - t);
  };

  const seedCenter = () => {
    const rect = root.getBoundingClientRect();
    mouse.x = rect.left + rect.width / 2;
    mouse.y = rect.top + rect.height / 2;
    cursor.x = mouse.x;
    cursor.y = mouse.y;
  };

  const onMouseMove = (event) => {
    cursor.x = event.clientX;
    cursor.y = event.clientY;
  };

  const onTouchMove = (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    cursor.x = touch.clientX;
    cursor.y = touch.clientY;
  };

  const resetChars = () => {
    chars.forEach((char) => {
      char.style.fontVariationSettings = '';
      char.style.transform = '';
      char.style.opacity = '';
    });
  };

  const tick = () => {
    mouse.x += (cursor.x - mouse.x) / smoothing;
    mouse.y += (cursor.y - mouse.y) / smoothing;

    const titleRect = root.getBoundingClientRect();
    const maxDist = Math.max(titleRect.width * 0.45, 120);

    chars.forEach((char) => {
      const rect = char.getBoundingClientRect();
      const center = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      };
      const d = dist(mouse, center);

      const wght = weight ? Math.round(getAttr(d, maxDist, minWeight, maxWeight)) : 700;
      const opsz = weight ? Math.round(getAttr(d, maxDist, minOpsz, maxOpsz)) : 56;
      const scaleX = width ? getAttr(d, maxDist, minScaleX, maxScaleX) : 1;
      const skewX = italic ? -getAttr(d, maxDist, 0, maxSkew) : 0;
      const alphaVal = alpha ? getAttr(d, maxDist, 0.55, 1).toFixed(2) : 1;

      const variation = `'wght' ${wght}, 'opsz' ${opsz}`;
      if (char.style.fontVariationSettings !== variation) {
        char.style.fontVariationSettings = variation;
      }

      const transform = `scaleX(${scaleX.toFixed(3)}) skewX(${skewX.toFixed(2)}deg)`;
      if (char.style.transform !== transform) {
        char.style.transform = transform;
      }

      if (alpha && char.style.opacity !== String(alphaVal)) {
        char.style.opacity = alphaVal;
      }
    });

    rafId = requestAnimationFrame(tick);
  };

  return {
    start() {
      if (running) return;
      running = true;
      seedCenter();
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('resize', seedCenter, { passive: true });
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', seedCenter);
      resetChars();
    },
    destroy() {
      this.stop();
    },
  };
}
