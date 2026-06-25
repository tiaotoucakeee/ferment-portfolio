/** Home bread: hold 1s to cycle expressions, with hold/switch motion. */
function initBreadPixel(root, options = {}) {
  const holdMs = options.holdMs ?? 1000;
  const frame = root.querySelector('.bread-pixel__frame');
  const defaultEl = root.querySelector('.bread-pixel__img--default');
  const exprEls = [...root.querySelectorAll('.bread-pixel__img--expr')];
  const slides = [defaultEl, ...exprEls].filter(Boolean);
  if (slides.length < 2) return null;

  const BREAD_EXPR_LAYOUT = {
    'bread.png': { scale: 1, x: 0, y: 0 },
    'bread-kiss.png': { scale: 1.24, x: -5, y: 0 },
    'bread-smirk.png': { scale: 1, x: 0, y: 0 },
    'bread-silly.png': { scale: 1, x: 0, y: 0 },
    'bread-tongue.png': { scale: 1, x: 0, y: 0 },
  };

  const applyBreadLayout = (el) => {
    const file = el.getAttribute('src')?.split('/').pop() || '';
    const layout = BREAD_EXPR_LAYOUT[file] || { scale: 1, x: 0, y: 0 };
    el.style.setProperty('--bread-img-scale', String(layout.scale));
    el.style.setProperty('--bread-img-x', `${layout.x}%`);
    el.style.setProperty('--bread-img-y', `${layout.y}%`);
  };

  slides.forEach(applyBreadLayout);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let index = 0;
  let holdTimer = null;
  let squishTimer = null;
  let holding = false;
  let activePointerId = null;
  let holdStartTime = 0;
  let switchedThisGesture = false;

  const TAP_POP_MAX_MS = 420;
  const HOLD_SQUISH_DELAY_MS = 120;

  function clearHoldTimer() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  function setHolding(active) {
    holding = active;
    root.classList.toggle('is-holding', active);
  }

  function playPop() {
    if (!frame || reducedMotion) return;
    root.classList.add('is-switching');
    frame.classList.remove('is-popping');
    void frame.offsetWidth;
    frame.classList.add('is-popping');
    frame.addEventListener(
      'animationend',
      () => {
        frame.classList.remove('is-popping');
        root.classList.remove('is-switching');
      },
      { once: true }
    );
  }

  function showIndex(next, { pop = false } = {}) {
    index = ((next % slides.length) + slides.length) % slides.length;
    slides.forEach((el, i) => {
      const active = i === index;
      el.classList.toggle('is-visible', active);
      el.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    root.classList.toggle('is-bread-alt', index > 0);
    if (pop) playPop();
  }

  function nextExpression() {
    switchedThisGesture = true;
    showIndex(index + 1, { pop: true });
  }

  function scheduleHoldCycle() {
    clearHoldTimer();
    holdTimer = window.setTimeout(() => {
      nextExpression();
      if (activePointerId !== null) scheduleHoldCycle();
    }, holdMs);
  }

  function endHold() {
    clearHoldTimer();
    if (squishTimer) {
      clearTimeout(squishTimer);
      squishTimer = null;
    }
    setHolding(false);
    activePointerId = null;
  }

  function startHold(event) {
    if (root.disabled || event.button !== 0) return;

    const pointerId = event.pointerId;
    activePointerId = pointerId;
    holdStartTime = Date.now();
    switchedThisGesture = false;
    squishTimer = window.setTimeout(() => {
      if (activePointerId !== pointerId) return;
      setHolding(true);
    }, HOLD_SQUISH_DELAY_MS);
    scheduleHoldCycle();

    try {
      root.setPointerCapture(pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  const handlePointerDown = (event) => {
    if (root.disabled || activePointerId !== null) return;
    startHold(event);
  };

  const handlePointerUp = (event) => {
    if (event.pointerId !== activePointerId) return;
    const elapsed = Date.now() - holdStartTime;
    const shouldTapPop = !switchedThisGesture && elapsed < TAP_POP_MAX_MS;
    endHold();
    if (shouldTapPop) playPop();
    try {
      root.releasePointerCapture(event.pointerId);
    } catch (_) {
      /* ignore */
    }
  };

  const handlePointerCancel = (event) => {
    if (event.pointerId !== activePointerId) return;
    endHold();
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
  };

  root.addEventListener('pointerdown', handlePointerDown);
  root.addEventListener('pointerup', handlePointerUp);
  root.addEventListener('pointercancel', handlePointerCancel);
  root.addEventListener('contextmenu', handleContextMenu);
  showIndex(0);

  return {
    next: () => nextExpression(),
    reset() {
      clearHoldTimer();
      if (squishTimer) {
        clearTimeout(squishTimer);
        squishTimer = null;
      }
      setHolding(false);
      root.classList.remove('is-holding', 'is-switching');
      showIndex(0);
    },
    destroy() {
      clearHoldTimer();
      if (squishTimer) {
        clearTimeout(squishTimer);
        squishTimer = null;
      }
      setHolding(false);
      root.removeEventListener('pointerdown', handlePointerDown);
      root.removeEventListener('pointerup', handlePointerUp);
      root.removeEventListener('pointercancel', handlePointerCancel);
      root.removeEventListener('contextmenu', handleContextMenu);
    },
  };
}
