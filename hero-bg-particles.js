/** Home2 background dot grid — cursor repulsion with smoothed follow. */
function initHeroBgParticles(canvas) {
  if (!canvas) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const host = canvas.parentElement;
  if (!ctx || !host) return null;

  const spacing = 13;
  const baseRadius = 1.05;
  const maxDist = 110;
  const maxPush = 12;
  const smoothing = 14;
  const dotRgb = '148, 176, 214';

  let running = false;
  let rafId = 0;
  let dots = [];
  let viewW = 0;
  let viewH = 0;
  let dpr = 1;
  const mouse = { x: 0, y: 0 };
  const cursor = { x: 0, y: 0 };

  function buildDots() {
    dots = [];
    for (let y = spacing * 0.5; y < viewH; y += spacing) {
      for (let x = spacing * 0.5; x < viewW; x += spacing) {
        dots.push({ ox: x, oy: y, x, y });
      }
    }
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = Math.max(1, rect.width);
    viewH = Math.max(1, rect.height);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildDots();
    if (reduced) drawFrame(true);
  }

  function seedCenter() {
    cursor.x = viewW * 0.5;
    cursor.y = viewH * 0.5;
    mouse.x = cursor.x;
    mouse.y = cursor.y;
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    cursor.x = event.clientX - rect.left;
    cursor.y = event.clientY - rect.top;
  }

  function drawFrame(staticGrid) {
    ctx.clearRect(0, 0, viewW, viewH);

    if (!staticGrid) {
      mouse.x += (cursor.x - mouse.x) / smoothing;
      mouse.y += (cursor.y - mouse.y) / smoothing;
    }

    for (const dot of dots) {
      let x = dot.ox;
      let y = dot.oy;
      let radius = baseRadius;
      let alpha = 0.24;

      if (!staticGrid) {
        const dx = dot.ox - mouse.x;
        const dy = dot.oy - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        const t = Math.max(0, 1 - dist / maxDist);
        const push = t * t * maxPush;
        x = dot.ox + (dx / dist) * push;
        y = dot.oy + (dy / dist) * push;
        radius = baseRadius + t * 1.35;
        alpha = 0.2 + t * 0.42;
      }

      dot.x = x;
      dot.y = y;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${dotRgb}, ${alpha})`;
      ctx.fill();
    }
  }

  function tick() {
    drawFrame(false);
    rafId = requestAnimationFrame(tick);
  }

  const onResize = () => resize();

  return {
    start() {
      if (running) return;
      running = true;
      resize();
      seedCenter();
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      if (reduced) return;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      ctx.clearRect(0, 0, viewW, viewH);
    },
    destroy() {
      this.stop();
    },
  };
}
