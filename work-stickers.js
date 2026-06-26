(function () {
  'use strict';

  const STICKER_SIZE = 104;

  const STICKER_DEFAULTS = {
    width: STICKER_SIZE,
    rotate: 0,
    peelDirection: 0,
    peelBackHoverPct: 20,
    peelBackActivePct: 34,
    shadowIntensity: 0.38,
  };

  const WORK_STICKERS = [
    { id: 'canva', src: './assets/work/stickers/sticker-canva.png' },
    { id: 'figma', src: './assets/work/stickers/sticker-figma.png' },
    { id: 'ae', src: './assets/work/stickers/sticker-ae.png' },
    { id: 'capcut', src: './assets/work/stickers/sticker-capcut.png' },
    { id: 'ai', src: './assets/work/stickers/sticker-ai.png' },
    { id: 'ps', src: './assets/work/stickers/sticker-ps.png' },
    { id: 'procreate', src: './assets/work/stickers/sticker-procreate.png' },
    { id: 'td', src: './assets/work/stickers/sticker-td.png' },
    { id: 'pinterest', src: './assets/work/stickers/sticker-pinterest.png' },
  ].map((item) => ({ ...STICKER_DEFAULTS, ...item }));

  let board = null;

  function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function seededRandom(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function buildSidePlan(total) {
    const leftCount = Math.floor(total / 2);
    const plan = Array(total).fill('right');

    for (let i = 0; i < leftCount; i += 1) {
      const index = Math.round(i * (total - 1) / Math.max(1, leftCount - 1));
      plan[index] = 'left';
    }

    return plan;
  }

  function layoutWorkStickers(targetBoard) {
    const { boundsEl, instances } = targetBoard;
    const boundsRect = boundsEl.getBoundingClientRect();
    const gallery = document.getElementById('workPortfolioGrid');
    const galleryRect = gallery?.getBoundingClientRect();

    const topStart = boundsRect.height * 0.08;
    const bottomPad = 120;
    const lift = 72;
    const usableHeight = Math.max(0, boundsRect.height - topStart - bottomPad);
    const edgeInset = 8;
    const contentGap = 18;
    const sidePlan = buildSidePlan(instances.length);
    const bandHeight = usableHeight / Math.max(1, instances.length);

    let leftZoneMax = boundsRect.width * 0.1;
    let rightZoneMin = boundsRect.width * 0.9;

    if (galleryRect) {
      const galleryLeft = galleryRect.left - boundsRect.left;
      const galleryRight = galleryRect.right - boundsRect.left;
      leftZoneMax = Math.max(edgeInset + STICKER_SIZE, galleryLeft - contentGap);
      rightZoneMin = Math.min(boundsRect.width - edgeInset - STICKER_SIZE, galleryRight + contentGap);
    }

    instances.forEach((item, index) => {
      const { root, config } = item;
      const seed = hashString(config.id) + index * 17;
      const onLeft = sidePlan[index] === 'left';
      const stickerW = config.width;
      const stickerH = config.width;
      const bandTop = topStart + index * bandHeight;
      const yJitter = seededRandom(seed + 2) * Math.max(0, bandHeight - stickerH - 16);
      const y = Math.max(topStart, bandTop + yJitter - lift);

      let x;
      if (onLeft) {
        const spread = Math.max(0, leftZoneMax - stickerW - edgeInset);
        x = edgeInset + seededRandom(seed + 1) * spread;
      } else {
        const spread = Math.max(0, boundsRect.width - edgeInset - stickerW - rightZoneMin);
        x = rightZoneMin + seededRandom(seed + 1) * spread;
      }

      const rotSign = onLeft ? -1 : 1;
      const rotation = rotSign * (6 + seededRandom(seed + 3) * 16);

      if (typeof gsap !== 'undefined') {
        gsap.set(root, {
          x,
          y,
          scale: 1,
          rotation,
          transformOrigin: '50% 50%',
        });
      } else {
        root.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
      }
    });
  }

  function initWorkStickers() {
    destroyWorkStickers();

    board = window.StickerPeelCore?.initBoard({
      container: 'workStickers',
      stickers: WORK_STICKERS,
      layout: layoutWorkStickers,
    });
  }

  function destroyWorkStickers() {
    window.StickerPeelCore?.destroyBoard(board);
    board = null;
  }

  window.initWorkStickers = initWorkStickers;
  window.destroyWorkStickers = destroyWorkStickers;
})();
