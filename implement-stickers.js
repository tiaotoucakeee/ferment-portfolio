(function () {
  'use strict';

  const STICKER_SIZE = 80;
  const STICKER_GAP = 92;
  const QR_TAP_MOVE_THRESHOLD = 8;

  const QR_STICKERS = {
    wechat: {
      src: './assets/implement/qr-wechat.png',
      alt: 'WeChat QR code',
      label: 'WeChat QR code',
    },
    qq: {
      src: './assets/implement/qr-qq.png',
      alt: 'QQ QR code',
      label: 'QQ QR code',
    },
  };

  const IMPLEMENT_STICKERS = [
    {
      id: 'wechat',
      src: './assets/implement/sticker-wechat.png',
      width: STICKER_SIZE,
      rotate: 0,
      peelDirection: 0,
      peelBackHoverPct: 18,
      peelBackActivePct: 30,
      shadowIntensity: 0.22,
      offsetX: 0,
    },
    {
      id: 'tiktok',
      src: './assets/implement/sticker-tiktok.png',
      width: STICKER_SIZE,
      rotate: 0,
      peelDirection: 0,
      peelBackHoverPct: 18,
      peelBackActivePct: 30,
      shadowIntensity: 0.22,
      offsetX: STICKER_GAP,
    },
    {
      id: 'xhs',
      src: './assets/implement/sticker-xhs.png',
      width: STICKER_SIZE,
      rotate: 0,
      peelDirection: 0,
      peelBackHoverPct: 18,
      peelBackActivePct: 30,
      shadowIntensity: 0.22,
      offsetX: STICKER_GAP * 2,
    },
    {
      id: 'qq',
      src: './assets/implement/sticker-qq.png',
      width: STICKER_SIZE,
      rotate: 0,
      peelDirection: 0,
      peelBackHoverPct: 18,
      peelBackActivePct: 30,
      shadowIntensity: 0.22,
      offsetX: STICKER_GAP * 3,
    },
  ];

  let board = null;
  let qrPopupUiReady = false;
  let qrStickerHandlers = null;
  let qrPopupElements = null;
  let qrTapState = null;
  let qrActiveStickerId = null;
  let qrAnimTimeline = null;
  let qrClosing = false;

  function getImplementContentLeft(boundsRect) {
    const content = document.querySelector('.pf-implement__content');
    if (content) {
      return content.getBoundingClientRect().left - boundsRect.left;
    }

    const label = document.querySelector('.pf-implement__label');
    if (label) {
      return label.getBoundingClientRect().left - boundsRect.left;
    }

    const implement = document.querySelector('.pf-implement');
    const gutter = implement
      ? parseFloat(getComputedStyle(implement).getPropertyValue('--implement-gutter'))
      : NaN;

    return Number.isFinite(gutter) ? gutter : Math.max(24, Math.min(64, window.innerWidth * 0.05));
  }

  function layoutImplementStickers(targetBoard) {
    const { boundsEl, instances } = targetBoard;
    const boundsRect = boundsEl.getBoundingClientRect();
    const leftPad = getImplementContentLeft(boundsRect);
    const bottomGap = 10;

    instances.forEach((item) => {
      const { root, config } = item;
      const stickerSize = config.width;
      const x = leftPad + config.offsetX;
      const y = boundsRect.height - stickerSize - bottomGap;

      if (typeof gsap !== 'undefined') {
        gsap.set(root, { x, y, scale: 1, rotation: 0, transformOrigin: '50% 100%' });
      } else {
        root.style.transform = `translate(${x}px, ${y}px)`;
      }
    });
  }

  function getQrPopupElements() {
    if (qrPopupElements) return qrPopupElements;

    qrPopupElements = {
      root: document.getElementById('implementQrPopup'),
      backdrop: document.getElementById('implementQrBackdrop'),
      frame: document.getElementById('implementQrFrame'),
      img: document.getElementById('implementQrImg'),
    };

    return qrPopupElements;
  }

  function getStickerAnchor(stickerId) {
    const sticker = document.querySelector(
      `.pf-implement__stickers .sticker-peel[data-sticker-id="${stickerId}"]`
    );
    if (!sticker) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }

    const rect = sticker.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function resetQrPopupMotion({ backdrop, frame } = getQrPopupElements()) {
    if (typeof gsap === 'undefined') return;
    if (backdrop) gsap.set(backdrop, { clearProps: 'opacity' });
    if (frame) gsap.set(frame, { clearProps: 'all' });
  }

  function initQrPopupUi() {
    if (qrPopupUiReady) return;

    const { root, backdrop } = getQrPopupElements();
    if (!root || !backdrop) return;

    backdrop.addEventListener('click', closeImplementQrPopup);
    root.addEventListener('click', (event) => {
      if (event.target === root || event.target === backdrop) {
        closeImplementQrPopup();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !root.hidden) {
        closeImplementQrPopup();
      }
    });

    qrPopupUiReady = true;
  }

  function openImplementQrPopup(stickerId) {
    if (qrClosing) return;

    const config = QR_STICKERS[stickerId];
    const { root, backdrop, frame, img } = getQrPopupElements();
    if (!config || !root || !backdrop || !frame || !img) return;

    if (qrAnimTimeline) {
      qrAnimTimeline.kill();
      qrAnimTimeline = null;
    }

    qrActiveStickerId = stickerId;
    img.src = config.src;
    img.alt = config.alt;
    root.setAttribute('aria-label', config.label);
    root.hidden = false;
    root.removeAttribute('aria-hidden');
    document.body.classList.add('is-implement-qr-open');

    const anchor = getStickerAnchor(stickerId);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || typeof gsap === 'undefined') {
      gsap?.set(backdrop, { opacity: 1 });
      gsap?.set(frame, {
        left: '50%',
        top: '50%',
        xPercent: -50,
        yPercent: -50,
        scale: 1,
        opacity: 1,
        rotation: 0,
      });
      return;
    }

    gsap.set(backdrop, { opacity: 0 });
    gsap.set(frame, {
      left: anchor.x,
      top: anchor.y,
      xPercent: -50,
      yPercent: -50,
      scale: 0.16,
      opacity: 0.45,
      rotation: -8,
    });

    qrAnimTimeline = gsap.timeline();
    qrAnimTimeline.to(
      backdrop,
      { opacity: 1, duration: 0.38, ease: 'power2.out' },
      0
    );
    qrAnimTimeline.to(
      frame,
      {
        left: '50%',
        top: '50%',
        xPercent: -50,
        yPercent: -50,
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: 0.62,
        ease: 'back.out(1.15)',
      },
      0
    );
  }

  function closeImplementQrPopup() {
    const { root, backdrop, frame, img } = getQrPopupElements();
    if (!root || root.hidden || qrClosing) return;

    const stickerId = qrActiveStickerId;
    const anchor = stickerId
      ? getStickerAnchor(stickerId)
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const finishClose = () => {
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-implement-qr-open');
      qrActiveStickerId = null;
      qrClosing = false;

      if (qrAnimTimeline) {
        qrAnimTimeline.kill();
        qrAnimTimeline = null;
      }

      resetQrPopupMotion({ backdrop, frame });

      if (img) {
        img.removeAttribute('src');
        img.alt = '';
      }
    };

    if (reducedMotion || typeof gsap === 'undefined' || !stickerId) {
      finishClose();
      return;
    }

    qrClosing = true;

    if (qrAnimTimeline) {
      qrAnimTimeline.kill();
      qrAnimTimeline = null;
    }

    qrAnimTimeline = gsap.timeline({
      onComplete: finishClose,
    });

    qrAnimTimeline.to(
      frame,
      {
        left: anchor.x,
        top: anchor.y,
        xPercent: -50,
        yPercent: -50,
        scale: 0.16,
        opacity: 0,
        rotation: 8,
        duration: 0.5,
        ease: 'power3.in',
      },
      0
    );
    qrAnimTimeline.to(
      backdrop,
      { opacity: 0, duration: 0.42, ease: 'power2.in' },
      0.04
    );
  }

  function resolveQrStickerId(event) {
    const stickerRoot = event.target.closest('.sticker-peel[data-sticker-id]');
    if (!stickerRoot) return null;

    const stickerId = stickerRoot.dataset.stickerId;
    return QR_STICKERS[stickerId] ? stickerId : null;
  }

  function unbindQrStickerHandlers() {
    if (!qrStickerHandlers) return;

    const { container, onContextMenu, onPointerDown, onPointerUp } = qrStickerHandlers;
    container.removeEventListener('contextmenu', onContextMenu, true);
    container.removeEventListener('pointerdown', onPointerDown, true);
    container.removeEventListener('pointerup', onPointerUp, true);
    qrStickerHandlers = null;
    qrTapState = null;
  }

  function bindQrStickerHandlers(targetBoard) {
    unbindQrStickerHandlers();

    const container = targetBoard.boundsEl;
    if (!container) return;

    const onContextMenu = (event) => {
      const stickerId = resolveQrStickerId(event);
      if (!stickerId) return;

      event.preventDefault();
      event.stopPropagation();
      openImplementQrPopup(stickerId);
    };

    const onPointerDown = (event) => {
      const stickerId = resolveQrStickerId(event);
      if (!stickerId || event.button !== 0) return;

      qrTapState = {
        stickerId,
        x: event.clientX,
        y: event.clientY,
      };
    };

    const onPointerUp = (event) => {
      if (!qrTapState || event.button !== 0) return;

      const stickerId = resolveQrStickerId(event);
      if (!stickerId || stickerId !== qrTapState.stickerId) {
        qrTapState = null;
        return;
      }

      const dx = Math.abs(event.clientX - qrTapState.x);
      const dy = Math.abs(event.clientY - qrTapState.y);
      qrTapState = null;

      if (dx > QR_TAP_MOVE_THRESHOLD || dy > QR_TAP_MOVE_THRESHOLD) return;

      event.preventDefault();
      event.stopPropagation();
      openImplementQrPopup(stickerId);
    };

    container.addEventListener('contextmenu', onContextMenu, true);
    container.addEventListener('pointerdown', onPointerDown, true);
    container.addEventListener('pointerup', onPointerUp, true);

    qrStickerHandlers = {
      container,
      onContextMenu,
      onPointerDown,
      onPointerUp,
    };
  }

  function initImplementStickers() {
    destroyImplementStickers();
    initQrPopupUi();

    board = window.StickerPeelCore?.initBoard({
      container: 'implementStickers',
      stickers: IMPLEMENT_STICKERS,
      layout: layoutImplementStickers,
    });

    if (board) {
      bindQrStickerHandlers(board);
    }
  }

  function destroyImplementStickers() {
    closeImplementQrPopup();
    unbindQrStickerHandlers();
    window.StickerPeelCore?.destroyBoard(board);
    board = null;
  }

  window.initImplementStickers = initImplementStickers;
  window.destroyImplementStickers = destroyImplementStickers;
  window.closeImplementQrPopup = closeImplementQrPopup;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQrPopupUi, { once: true });
  } else {
    initQrPopupUi();
  }
})();
