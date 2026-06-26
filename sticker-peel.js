(function () {
  'use strict';

  function canUseDraggable() {
    return typeof gsap !== 'undefined' && typeof Draggable !== 'undefined';
  }

  function createSvgFilters(uid, lightingIntensity, shadowIntensity) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(svgNS, 'defs');

    const pointLight = document.createElementNS(svgNS, 'filter');
    pointLight.id = `${uid}-pointLight`;
    pointLight.innerHTML = `
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feSpecularLighting result="spec" in="blur" specularExponent="100" specularConstant="${lightingIntensity}" lighting-color="white">
        <fePointLight x="100" y="100" z="300" />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceGraphic" result="lit" />
      <feComposite in="lit" in2="SourceAlpha" operator="in" />
    `;
    const pointLightNode = pointLight.querySelector('fePointLight');

    const pointLightFlipped = document.createElementNS(svgNS, 'filter');
    pointLightFlipped.id = `${uid}-pointLightFlipped`;
    pointLightFlipped.innerHTML = `
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feSpecularLighting result="spec" in="blur" specularExponent="100" specularConstant="${lightingIntensity * 7}" lighting-color="white">
        <fePointLight x="100" y="100" z="300" />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceGraphic" result="lit" />
      <feComposite in="lit" in2="SourceAlpha" operator="in" />
    `;
    const pointLightFlippedNode = pointLightFlipped.querySelector('fePointLight');

    const dropShadow = document.createElementNS(svgNS, 'filter');
    dropShadow.id = `${uid}-dropShadow`;
    dropShadow.innerHTML = `
      <feDropShadow dx="2" dy="4" stdDeviation="${3 * shadowIntensity}" flood-color="black" flood-opacity="${shadowIntensity}" />
    `;

    const expandAndFill = document.createElementNS(svgNS, 'filter');
    expandAndFill.id = `${uid}-expandAndFill`;
    expandAndFill.innerHTML = `
      <feOffset dx="0" dy="0" in="SourceAlpha" result="shape" />
      <feFlood flood-color="rgb(179,179,179)" result="flood" />
      <feComposite operator="in" in="flood" in2="shape" />
    `;

    defs.append(pointLight, pointLightFlipped, dropShadow, expandAndFill);
    svg.append(defs);

    return {
      svg,
      pointLightNode,
      pointLightFlippedNode,
      filterVars: {
        '--sticker-filter-light': `url(#${uid}-pointLight)`,
        '--sticker-filter-light-flipped': `url(#${uid}-pointLightFlipped)`,
        '--sticker-filter-shadow': `url(#${uid}-dropShadow)`,
        '--sticker-filter-fill': `url(#${uid}-expandAndFill)`,
      },
    };
  }

  function setStyleProps(node, props) {
    Object.entries(props).forEach(([key, value]) => {
      node.style.setProperty(key, value);
    });
  }

  function createStickerPeel(options) {
    const {
      id,
      imageSrc = options.src,
      rotate = 0,
      peelBackHoverPct = 30,
      peelBackActivePct = 40,
      width = 200,
      shadowIntensity = 0.6,
      lightingIntensity = 0.1,
      peelDirection = 0,
    } = options;

    const uid = `sticker-${id}`;
    const root = document.createElement('div');
    root.className = width <= 40 ? 'sticker-peel sticker-peel--compact' : 'sticker-peel';
    root.dataset.stickerId = id;

    setStyleProps(root, {
      '--sticker-rotate': `${rotate}deg`,
      '--sticker-p': `${width <= 8 ? 1 : width <= 32 ? 2 : width <= 56 ? 5 : 10}px`,
      '--sticker-peelback-hover': `${peelBackHoverPct}%`,
      '--sticker-peelback-active': `${peelBackActivePct}%`,
      '--sticker-width': `${width}px`,
      '--sticker-shadow-opacity': String(shadowIntensity),
      '--sticker-lighting-constant': String(lightingIntensity),
      '--peel-direction': `${peelDirection}deg`,
    });

    const { svg, pointLightNode, pointLightFlippedNode, filterVars } = createSvgFilters(
      uid,
      lightingIntensity,
      shadowIntensity
    );
    setStyleProps(root, filterVars);
    root.append(svg);

    const container = document.createElement('div');
    container.className = 'sticker-peel__container';

    const main = document.createElement('div');
    main.className = 'sticker-peel__main';

    const lighting = document.createElement('div');
    lighting.className = 'sticker-peel__lighting';

    const image = document.createElement('img');
    image.className = 'sticker-peel__image';
    image.src = imageSrc;
    image.alt = '';
    image.width = width;
    image.style.width = `${width}px`;
    image.style.height = 'auto';
    image.style.maxWidth = `${width}px`;
    image.draggable = false;
    image.decoding = 'async';
    image.addEventListener('contextmenu', (event) => event.preventDefault());

    lighting.append(image);
    main.append(lighting);

    const flap = document.createElement('div');
    flap.className = 'sticker-peel__flap';

    const flapLighting = document.createElement('div');
    flapLighting.className = 'sticker-peel__flap-lighting';

    const flapImage = document.createElement('img');
    flapImage.className = 'sticker-peel__flap-image';
    flapImage.src = imageSrc;
    flapImage.alt = '';
    flapImage.width = width;
    flapImage.style.width = `${width}px`;
    flapImage.style.height = 'auto';
    flapImage.style.maxWidth = `${width}px`;
    flapImage.draggable = false;
    flapImage.decoding = 'async';
    flapImage.addEventListener('contextmenu', (event) => event.preventDefault());

    flapLighting.append(flapImage);
    flap.append(flapLighting);

    container.append(main, flap);
    root.append(container);

    const updateLight = (event) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      pointLightNode.setAttribute('x', String(x));
      pointLightNode.setAttribute('y', String(y));

      const normalizedAngle = Math.abs(peelDirection % 360);
      if (normalizedAngle !== 180) {
        pointLightFlippedNode.setAttribute('x', String(x));
        pointLightFlippedNode.setAttribute('y', String(rect.height - y));
      } else {
        pointLightFlippedNode.setAttribute('x', '-1000');
        pointLightFlippedNode.setAttribute('y', '-1000');
      }
    };

    container.addEventListener('mousemove', updateLight);

    const onTouchStart = () => container.classList.add('is-touch-active');
    const onTouchEnd = () => container.classList.remove('is-touch-active');
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    return {
      root,
      width,
      destroy() {
        container.removeEventListener('mousemove', updateLight);
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('touchcancel', onTouchEnd);
        root.remove();
      },
    };
  }

  function getStickerDragBounds(root, boundsRect, fallbackSize = 0) {
    const width = root.offsetWidth || fallbackSize || 0;
    const height = root.offsetHeight || fallbackSize || 0;

    return {
      top: 0,
      left: 0,
      width: Math.max(0, boundsRect.width - width),
      height: Math.max(0, boundsRect.height - height),
    };
  }

  function bindDraggables(board) {
    if (!canUseDraggable() || !board.boundsEl) return;

    gsap.registerPlugin(Draggable);

    const boundsRect = board.boundsEl.getBoundingClientRect();

    board.instances.forEach((item) => {
      const { root } = item;

      item.draggable = Draggable.create(root, {
        type: 'x,y',
        bounds: getStickerDragBounds(root, boundsRect, item.config?.width),
        inertia: true,
      })[0];
    });
  }

  function applyLayout(board) {
    if (!board.boundsEl || !board.instances.length || typeof board.layout !== 'function') return;

    board.layout(board);

    const boundsRect = board.boundsEl.getBoundingClientRect();
    board.instances.forEach((item) => {
      if (item.draggable) {
        item.draggable.applyBounds?.(getStickerDragBounds(item.root, boundsRect, item.config?.width));
        item.draggable.update();
      }
    });
  }

  function initBoard({ container, stickers, layout, readyAttr = 'data-ready' }) {
    const boundsEl = typeof container === 'string' ? document.getElementById(container) : container;
    if (!boundsEl || boundsEl.getAttribute(readyAttr) === 'true') return null;

    boundsEl.setAttribute(readyAttr, 'true');
    boundsEl.removeAttribute('aria-hidden');

    const board = {
      boundsEl,
      instances: [],
      layout,
      resizeHandler: null,
      readyAttr,
    };

    stickers.forEach((config) => {
      const instance = createStickerPeel(config);
      boundsEl.append(instance.root);
      board.instances.push({
        ...instance,
        config,
        draggable: null,
      });
    });

    try {
      bindDraggables(board);
    } catch (error) {
      console.warn('[sticker-peel] Draggable unavailable', error);
    }

    const relayout = () => {
      if (!board.boundsEl?.offsetWidth || !board.boundsEl?.offsetHeight) {
        requestAnimationFrame(relayout);
        return;
      }
      applyLayout(board);
    };

    relayout();
    requestAnimationFrame(relayout);

    board.instances.forEach((item) => {
      item.root.querySelectorAll('img').forEach((img) => {
        if (!img.complete) {
          img.addEventListener('load', () => applyLayout(board), { once: true });
        }
      });
    });

    board.resizeHandler = () => applyLayout(board);
    window.addEventListener('resize', board.resizeHandler);
    window.addEventListener('orientationchange', board.resizeHandler);

    return board;
  }

  function destroyBoard(board) {
    if (!board) return;

    if (board.resizeHandler) {
      window.removeEventListener('resize', board.resizeHandler);
      window.removeEventListener('orientationchange', board.resizeHandler);
    }

    board.instances.forEach((item) => {
      item.draggable?.kill();
      item.destroy();
    });

    if (board.boundsEl) {
      board.boundsEl.removeAttribute(board.readyAttr);
      board.boundsEl.setAttribute('aria-hidden', 'true');
    }
  }

  window.StickerPeelCore = {
    createStickerPeel,
    getStickerDragBounds,
    initBoard,
    destroyBoard,
    applyLayout,
  };
})();
