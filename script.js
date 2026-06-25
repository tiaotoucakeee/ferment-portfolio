// Always land on the hero when opening the site
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// Reveal-on-scroll for elements marked .reveal
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
);

// Portfolio sections reveal after entering (hidden on home screen)

// Morphing menu: the pill grows into a rounded card
const menu = document.getElementById('menu');
const menuOpenBtn = document.getElementById('menuOpen');
const menuCloseBtn = document.getElementById('menuClose');
const menuBackdrop = document.getElementById('menuBackdrop');

const closeMenu = () => {
  if (!menu || !menuOpenBtn) return;
  menu.classList.remove('open');
  menuOpenBtn.setAttribute('aria-expanded', 'false');
};

if (menu && menuOpenBtn && menuCloseBtn) {
  const openMenu = () => {
    menu.classList.add('open');
    menuOpenBtn.setAttribute('aria-expanded', 'true');
  };

  menuOpenBtn.addEventListener('click', openMenu);
  menuCloseBtn.addEventListener('click', closeMenu);
  if (menuBackdrop) menuBackdrop.addEventListener('click', closeMenu);

  menu.querySelectorAll('.menu__links a').forEach((link) =>
    link.addEventListener('click', closeMenu)
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });
}

// Home gate: scroll wheel primes hero, then enters portfolio
const breadHit = document.getElementById('breadHit');
const breadWrap = document.getElementById('breadWrap');
const heroWords = document.querySelector('.hero-words');
const siteContent = document.getElementById('siteContent');
const breadTransition = document.getElementById('breadTransition');
const breadTransitionOverlay = breadTransition?.querySelector('.bread-transition__overlay');
const breadRevealMaskBg = breadTransition?.querySelector('#breadRevealMaskBg');
const breadRevealVeil = breadTransition?.querySelector('#breadRevealVeil');
const breadRevealGroup = breadTransition?.querySelector('#breadRevealGroup');
const breadRevealCutout = breadTransition?.querySelector('#breadRevealCutout');

const BREAD_CUTOUT_ASPECT = 915 / 878;
const BREAD_REVEAL_START_SCALE = 0.52;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let siteEntered = false;
let breadPrimed = false;
let isHomeTransitioning = false;
let primeTimeline = null;
let primeSnapshot = null;
let fermentPressure = null;
let bgParticles = null;

function stopBgParticles() {
  bgParticles?.destroy();
  bgParticles = null;
}

function startBgParticles() {
  stopBgParticles();
  const canvas = document.getElementById('heroBgParticles');
  if (!canvas || typeof initHeroBgParticles !== 'function') return;
  if (!document.body.classList.contains('home-primed')) return;
  bgParticles = initHeroBgParticles(canvas);
  bgParticles.start();
}

function stopFermentPressure() {
  fermentPressure?.destroy();
  fermentPressure = null;
}

function startFermentPressure(span) {
  stopFermentPressure();
  if (!span || typeof initTextPressure !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap !== 'undefined') {
    gsap.set(span.querySelectorAll('.hero-char'), { clearProps: 'transform' });
  }
  fermentPressure = initTextPressure(span, {
    weight: true,
    width: true,
    italic: true,
    alpha: false,
    minWeight: 620,
    maxWeight: 800,
    minOpsz: 30,
    maxOpsz: 90,
    minScaleX: 0.9,
    maxScaleX: 1.12,
    maxSkew: 7,
  });
  fermentPressure.start();
}

const heroMarquee = document.querySelector('.hero-words__marquee');
const heroTicker = document.querySelector('.hero-home .ticker');
const heroBgDots = document.getElementById('heroBgDots');
const mainTrack = document.querySelector('.hero-words__row--main .hero-words__track');
const subTrack = document.querySelector('.hero-words__row--sub .hero-words__track');

const HERO_DOT_R_MAX = 7.5;

function resetHeroBgDots() {
  if (!heroBgDots) return;
  heroBgDots.style.removeProperty('--dot-r');
  heroBgDots.style.opacity = '';
  if (typeof gsap !== 'undefined') {
    gsap.set(heroBgDots, { clearProps: '--dot-r,opacity' });
  }
}

function setHeroBgDotsRevealed(revealed) {
  if (!heroBgDots) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    heroBgDots.style.opacity = revealed ? '1' : '0';
    heroBgDots.style.removeProperty('--dot-r');
    return;
  }
  heroBgDots.style.setProperty('--dot-r', revealed ? `${HERO_DOT_R_MAX}px` : '0px');
}

function getTrackTranslateX(track) {
  if (!track) return 0;
  return new DOMMatrix(getComputedStyle(track).transform).m41;
}

function freezeMarqueeTrack(track) {
  if (!track) return 0;
  const x = getTrackTranslateX(track);
  track.style.animation = 'none';
  track.style.transform = `translateX(${x}px)`;
  return x;
}

function calcCenterTranslateX(row, span, track) {
  if (!row || !span || !track) return getTrackTranslateX(track);
  const rowRect = row.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  const delta = rowRect.left + rowRect.width / 2 - (spanRect.left + spanRect.width / 2);
  return getTrackTranslateX(track) + delta;
}

function listVisibleScrollSpans(track, matchFn) {
  if (!track) return [];
  return [...track.querySelectorAll('.hero-words__chunk span')]
    .filter(matchFn)
    .map((span) => ({ span, rect: span.getBoundingClientRect() }))
    .filter(({ rect }) => rect.right > 0 && rect.left < window.innerWidth)
    .filter(({ rect }) => {
      const vis = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
      return vis > 6;
    })
    .sort((a, b) => a.rect.left - b.rect.left);
}

function pickKeepScrollSpan(track, matchFn, offsetFromRight = 0) {
  const list = listVisibleScrollSpans(track, matchFn);
  if (!list.length) return null;
  const idx = Math.max(0, list.length - 1 - offsetFromRight);
  return list[idx].span;
}

function resolveKeepSpan(track, matchFn, preferOffsetFromRight = 2) {
  for (let offset = preferOffsetFromRight; offset >= 0; offset -= 1) {
    const span = pickKeepScrollSpan(track, matchFn, offset);
    if (span) return span;
  }
  const list = listVisibleScrollSpans(track, matchFn);
  return list.length ? list[0].span : null;
}

/** Drop middle/right repeats; keep span stays visually pinned on screen. */
function trimMarqueeToKeepSpan(track, keepSpan) {
  if (!track || !keepSpan) return getTrackTranslateX(track);
  const beforeLeft = keepSpan.getBoundingClientRect().left;

  track.querySelectorAll('.hero-words__chunk span').forEach((span) => {
    if (span !== keepSpan) span.style.display = 'none';
  });
  track.querySelectorAll('.hero-words__chunk').forEach((chunk) => {
    if (!chunk.contains(keepSpan)) chunk.style.display = 'none';
  });

  const dx = beforeLeft - keepSpan.getBoundingClientRect().left;
  const x = getTrackTranslateX(track) + dx;
  track.style.transform = `translateX(${x}px)`;
  return x;
}

/** Vertical shift so anchor line lands just above primed bread (arrow end point). */
function calcPrimedWordsShift(anchorSpan) {
  if (!anchorSpan || !breadWrap) return '-12vh';
  const root = document.documentElement;
  const prevY = root.style.getPropertyValue('--hero-prime-y');
  const prevS = root.style.getPropertyValue('--hero-prime-scale');
  root.style.setProperty('--hero-prime-y', '32px');
  root.style.setProperty('--hero-prime-scale', '0.76');
  void breadWrap.offsetHeight;
  const breadTop = breadWrap.getBoundingClientRect().top;
  root.style.setProperty('--hero-prime-y', prevY || '0px');
  root.style.setProperty('--hero-prime-scale', prevS || '1');

  const anchorRect = anchorSpan.getBoundingClientRect();
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const extraLift = Math.max(16, window.innerHeight * 0.022);
  const targetCenterY = breadTop - Math.max(18, window.innerHeight * 0.042) - extraLift;
  const shiftPx = targetCenterY - anchorCenterY;
  /* only ever rise — never dip downward first */
  return `${Math.min(0, shiftPx)}px`;
}

function splitSpanIntoChars(span) {
  if (!span) return [];
  if (span.dataset.split) return [...span.querySelectorAll('.hero-char')];
  span.dataset.original = span.textContent;
  span.dataset.split = '1';
  span.classList.add('hero-words__float-line');
  span.textContent = '';
  [...span.dataset.original].forEach((char) => {
    const el = document.createElement('span');
    el.className = 'hero-char';
    el.textContent = char === ' ' ? '\u00A0' : char;
    span.appendChild(el);
  });
  return [...span.querySelectorAll('.hero-char')];
}

function restoreSplitSpans() {
  document.querySelectorAll('.hero-words__chunk span[data-split]').forEach((span) => {
    if (span.dataset.original) span.textContent = span.dataset.original;
    delete span.dataset.original;
    delete span.dataset.split;
    span.classList.remove('hero-words__float-line', 'hero-words__keep--ferment', 'hero-words__keep--ziqi');
  });
}

function resetMarqueeTracks() {
  restoreSplitSpans();
  [mainTrack, subTrack].forEach((track) => {
    if (!track) return;
    track.style.animation = '';
    track.style.transform = '';
  });
  document.querySelectorAll('.hero-words__chunk span, .hero-words__chunk').forEach((el) => {
    el.style.opacity = '';
    el.style.display = '';
  });
  if (typeof gsap !== 'undefined') {
    gsap.set('.hero-char', { clearProps: 'all' });
  }
  if (heroMarquee && typeof gsap !== 'undefined') {
    gsap.set(heroMarquee, { clearProps: 'transform' });
  }
  if (heroTicker) {
    heroTicker.style.transform = '';
  }
}

function finishUnprime() {
  stopFermentPressure();
  stopBgParticles();
  resetHeroBgDots();
  document.body.classList.remove('home-primed', 'home-unpriming');
  if (typeof gsap !== 'undefined') {
    gsap.killTweensOf([heroMarquee, mainTrack, subTrack, heroTicker, heroBgDots, '.hero-char', document.documentElement]);
    gsap.set([mainTrack, subTrack, heroMarquee, heroTicker].filter(Boolean), { clearProps: 'all' });
    gsap.set(document.documentElement, {
      '--hero-prime-y': '0px',
      '--hero-prime-scale': '1',
      '--hero-words-shift': '0px',
    });
  }
  resetMarqueeTracks();
  breadPixel?.reset();
  primeSnapshot = null;
  primeTimeline = null;
  breadPrimed = false;
  isHomeTransitioning = false;
  if (breadHit) {
    breadHit.disabled = false;
    breadHit.setAttribute('aria-label', '长按切换面包表情');
  }
}

function resetHomePrime() {
  stopFermentPressure();
  stopBgParticles();
  resetHeroBgDots();
  breadPrimed = false;
  isHomeTransitioning = false;
  primeSnapshot = null;
  primeTimeline?.kill();
  primeTimeline = null;
  document.body.classList.remove('home-primed', 'home-unpriming');
  resetMarqueeTracks();
  if (typeof gsap !== 'undefined') {
    gsap.killTweensOf([heroMarquee, mainTrack, subTrack, heroTicker, heroBgDots, '.hero-char', document.documentElement]);
    gsap.set([mainTrack, subTrack, heroMarquee, heroTicker].filter(Boolean), { clearProps: 'all' });
    gsap.set(document.documentElement, {
      '--hero-prime-y': '0px',
      '--hero-prime-scale': '1',
      '--hero-words-shift': '0px',
    });
  }
  if (breadHit) {
    breadHit.disabled = false;
    breadHit.setAttribute('aria-label', '长按切换面包表情');
  }
}

function unprimeHome() {
  if (!breadPrimed || siteEntered || isHomeTransitioning) return false;

  isHomeTransitioning = true;
  if (breadHit) breadHit.disabled = true;
  stopFermentPressure();
  stopBgParticles();
  primeTimeline?.kill();
  primeTimeline = null;
  document.body.classList.add('home-unpriming');

  const snap = primeSnapshot;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!snap || reduced || typeof gsap === 'undefined') {
    finishUnprime();
    return true;
  }

  const {
    keepFerment,
    keepZiqi,
    startMainX,
    startSubX,
    moveDuration,
    riseEase,
    moveEase,
    charPopDuration,
    floatStagger,
  } = snap;

  const root = document.documentElement;
  const currentLift = root.style.getPropertyValue('--hero-words-shift').trim()
    || getComputedStyle(root).getPropertyValue('--hero-words-shift').trim()
    || '0px';
  const currentMainX = getTrackTranslateX(mainTrack);
  const currentSubX = getTrackTranslateX(subTrack);

  gsap.set(mainTrack, { x: currentMainX });
  gsap.set(subTrack, { x: currentSubX });
  gsap.set(root, {
    '--hero-words-shift': currentLift,
    '--hero-prime-y': root.style.getPropertyValue('--hero-prime-y').trim() || '32px',
    '--hero-prime-scale': root.style.getPropertyValue('--hero-prime-scale').trim() || '0.76',
  });
  if (heroTicker) {
    const tickerY = typeof gsap !== 'undefined' ? gsap.getProperty(heroTicker, 'y') : null;
    gsap.set(heroTicker, { y: tickerY ?? '100%' });
  }

  const fermentChars = keepFerment ? [...keepFerment.querySelectorAll('.hero-char')] : [];
  const ziqiChars = keepZiqi ? [...keepZiqi.querySelectorAll('.hero-char')] : [];

  const tl = gsap.timeline({ onComplete: finishUnprime });

  tl.to(
    document.documentElement,
    {
      '--hero-words-shift': '0px',
      '--hero-prime-y': '0px',
      '--hero-prime-scale': '1',
      duration: moveDuration,
      ease: moveEase,
    },
    0
  );

  if (heroBgDots) {
    gsap.set(heroBgDots, { '--dot-r': `${HERO_DOT_R_MAX}px` });
    tl.to(
      heroBgDots,
      { '--dot-r': '0px', duration: moveDuration, ease: moveEase },
      0
    );
  }

  tl.to(mainTrack, { x: startMainX, duration: moveDuration, ease: moveEase }, 0);
  tl.to(subTrack, { x: startSubX, duration: moveDuration, ease: moveEase }, 0);

  if (heroTicker) {
    tl.to(heroTicker, { y: '0%', duration: moveDuration, ease: riseEase }, 0);
  }

  if (ziqiChars.length) {
    tl.to(
      ziqiChars,
      {
        yPercent: 100,
        color: 'rgba(108, 134, 184, 0.62)',
        duration: charPopDuration,
        ease: riseEase,
        stagger: { each: floatStagger, from: 'end' },
      },
      0.08
    );
  }

  if (fermentChars.length) {
    tl.to(
      fermentChars,
      {
        yPercent: 100,
        color: 'rgba(148, 176, 214, 0.52)',
        duration: charPopDuration,
        ease: riseEase,
        stagger: { each: floatStagger, from: 'end' },
      },
      0
    );
  }

  return true;
}

function primeHome() {
  if (breadPrimed || siteEntered || isHomeTransitioning || !heroMarquee) return;
  breadPrimed = true;
  document.body.classList.add('home-primed');
  if (breadHit) breadHit.setAttribute('aria-label', '长按切换面包表情');

  const mainRow = document.querySelector('.hero-words__row--main');
  const subRow = document.querySelector('.hero-words__row--sub');

  freezeMarqueeTrack(mainTrack);
  freezeMarqueeTrack(subTrack);

  const keepFerment = resolveKeepSpan(
    mainTrack,
    (span) => span.textContent.trim().toLowerCase() === 'ferment',
    2
  );
  const keepZiqi = resolveKeepSpan(
    subTrack,
    (span) => /bakery portfolio/i.test(span.textContent),
    2
  );

  if (!keepFerment || !keepZiqi) {
    resetHomePrime();
    return;
  }

  keepFerment?.classList.add('hero-words__keep--ferment');
  keepZiqi?.classList.add('hero-words__keep--ziqi');

  trimMarqueeToKeepSpan(mainTrack, keepFerment);
  trimMarqueeToKeepSpan(subTrack, keepZiqi);

  const targetMainX = calcCenterTranslateX(mainRow, keepFerment, mainTrack);
  const targetSubX = calcCenterTranslateX(subRow, keepZiqi, subTrack);
  const liftShift = calcPrimedWordsShift(keepZiqi);

  const riseEase = 'back.inOut(2)';
  const moveEase = 'power3.inOut';
  const moveDuration = 1.05;
  const floatStagger = 0.03;
  const charPopDuration = 0.55;

  const startMainX = getTrackTranslateX(mainTrack);
  const startSubX = getTrackTranslateX(subTrack);

  primeSnapshot = {
    keepFerment,
    keepZiqi,
    startMainX,
    startSubX,
    targetMainX,
    targetSubX,
    liftShift,
    moveDuration,
    riseEase,
    moveEase,
    charPopDuration,
    floatStagger,
  };

  const scrollFloatFrom = {
    yPercent: 100,
    transformOrigin: '50% 100%',
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced || typeof gsap === 'undefined') {
    splitSpanIntoChars(keepFerment);
    splitSpanIntoChars(keepZiqi);
    if (mainTrack) mainTrack.style.transform = `translateX(${targetMainX}px)`;
    if (subTrack) subTrack.style.transform = `translateX(${targetSubX}px)`;
    document.documentElement.style.setProperty('--hero-prime-y', '32px');
    document.documentElement.style.setProperty('--hero-prime-scale', '0.76');
    document.documentElement.style.setProperty('--hero-words-shift', liftShift);
    if (heroTicker) heroTicker.style.transform = 'translateY(100%)';
    setHeroBgDotsRevealed(true);
    startFermentPressure(keepFerment);
    startBgParticles();
    return;
  }

  gsap.set(mainTrack, { x: getTrackTranslateX(mainTrack) });
  gsap.set(subTrack, { x: getTrackTranslateX(subTrack) });
  if (heroBgDots) gsap.set(heroBgDots, { '--dot-r': '0px' });

  primeTimeline?.kill();
  const tl = gsap.timeline();
  primeTimeline = tl;

  /* one diagonal path: frozen scroll position → up-right → centered */
  tl.to(
    document.documentElement,
    {
      '--hero-words-shift': liftShift,
      '--hero-prime-y': '32px',
      '--hero-prime-scale': '0.76',
      duration: moveDuration,
      ease: moveEase,
    },
    0
  );

  if (heroBgDots) {
    tl.to(
      heroBgDots,
      { '--dot-r': `${HERO_DOT_R_MAX}px`, duration: moveDuration, ease: moveEase },
      0
    );
  }

  tl.to(
    mainTrack,
    {
      x: targetMainX,
      duration: moveDuration,
      ease: moveEase,
      onComplete: () => {
        gsap.set(mainTrack, { x: calcCenterTranslateX(mainRow, keepFerment, mainTrack) });
      },
    },
    0
  );

  tl.to(
    subTrack,
    {
      x: targetSubX,
      duration: moveDuration,
      ease: moveEase,
      onComplete: () => {
        gsap.set(subTrack, { x: calcCenterTranslateX(subRow, keepZiqi, subTrack) });
      },
    },
    0
  );

  tl.call(() => {
    const fermentChars = splitSpanIntoChars(keepFerment);
    gsap.fromTo(
      fermentChars,
      { ...scrollFloatFrom, color: 'rgba(148, 176, 214, 0.52)' },
      {
        yPercent: 0,
        color: '#5a82b8',
        duration: charPopDuration,
        ease: riseEase,
        stagger: floatStagger,
      }
    );
  }, null, 0.14);

  tl.call(() => {
    const ziqiChars = splitSpanIntoChars(keepZiqi);
    gsap.fromTo(
      ziqiChars,
      { ...scrollFloatFrom, color: 'rgba(108, 134, 184, 0.62)' },
      {
        yPercent: 0,
        color: '#2a211c',
        duration: charPopDuration,
        ease: riseEase,
        stagger: floatStagger,
      }
    );
  }, null, 0.22);

  if (heroTicker) {
    tl.to(
      heroTicker,
      { y: '100%', duration: moveDuration, ease: riseEase },
      0.12
    );
  }

  tl.call(() => {
    startFermentPressure(keepFerment);
    startBgParticles();
  }, null, moveDuration + 0.08);
}

function advanceHomeScene() {
  if (siteEntered || isHomeTransitioning) return;
  if (!breadPrimed) {
    primeHome();
    return;
  }
  enterSite();
}

let homeWheelLocked = false;

function handleHomeWheel(event) {
  if (siteEntered || isHomeTransitioning) return;
  if (!document.body.classList.contains('is-home-only')) return;
  if (event.deltaY === 0) return;

  event.preventDefault();

  if (homeWheelLocked) return;
  homeWheelLocked = true;
  window.setTimeout(() => {
    homeWheelLocked = false;
  }, 900);

  if (event.deltaY > 0) {
    advanceHomeScene();
    return;
  }

  if (breadPrimed) {
    unprimeHome();
  }
}

const SITE_VIEWS = {
  '#work': 'work',
  '#about': 'about',
  '#contact': 'implement',
};

const PROP_TRANSITION_VIDEOS = {
  '#about': './assets/about_transition.mp4',
};

const ABOUT_TEXT_LEAD = 2;
const ABOUT_DECO_LEAD = 1;

const propTransition = document.getElementById('propTransition');
const propTransitionVideo = document.getElementById('propTransitionVideo');

const ABOUT_BREAD_SPRING_MS = 380;
const ABOUT_BREAD_SPRING_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

let aboutBreadDragState = null;

function resetAboutBreadDrag() {
  if (!aboutBreadDragState) return;
  aboutBreadDragState.reset();
}

function initAboutBreadDrag() {
  const bread = document.querySelector('.pf-about__polaroid-bread');
  if (!bread || aboutBreadDragState) return;

  const homeParent = bread.parentElement;
  const homeNextSibling = bread.nextElementSibling;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dragging = false;
  let pointerId = null;
  let offsetX = 0;
  let offsetY = 0;
  let homeRect = null;
  let snapTimer = null;

  const clearListeners = () => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
  };

  const restoreToHome = () => {
    if (bread.parentElement !== document.body || !homeParent) return;
    if (homeNextSibling && homeNextSibling.parentElement === homeParent) {
      homeParent.insertBefore(bread, homeNextSibling);
    } else {
      homeParent.appendChild(bread);
    }
  };

  const setDragTransform = (x, y, transition = 'none') => {
    bread.style.transition = transition;
    bread.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const clearInlineStyles = () => {
    if (snapTimer) {
      clearTimeout(snapTimer);
      snapTimer = null;
    }
    restoreToHome();
    bread.classList.remove('is-floating', 'is-dragging', 'is-snapping');
    bread.style.position = '';
    bread.style.left = '';
    bread.style.top = '';
    bread.style.width = '';
    bread.style.height = '';
    bread.style.margin = '';
    bread.style.zIndex = '';
    bread.style.transition = '';
    bread.style.transform = '';
    bread.style.transformOrigin = '';
    dragging = false;
    pointerId = null;
    homeRect = null;
    clearListeners();
  };

  const finishSnap = (event) => {
    if (event && event.propertyName !== 'transform') return;
    if (!bread.classList.contains('is-snapping')) return;
    bread.removeEventListener('transitionend', finishSnap);
    if (snapTimer) {
      clearTimeout(snapTimer);
      snapTimer = null;
    }
    clearInlineStyles();
  };

  const onPointerMove = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    event.preventDefault();
    setDragTransform(event.clientX - offsetX, event.clientY - offsetY);
  };

  const onPointerUp = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;

    dragging = false;
    pointerId = null;
    bread.classList.remove('is-dragging');
    clearListeners();

    if (bread.hasPointerCapture(event.pointerId)) {
      bread.releasePointerCapture(event.pointerId);
    }

    if (!homeRect) {
      clearInlineStyles();
      return;
    }

    if (reducedMotion) {
      clearInlineStyles();
      return;
    }

    bread.classList.add('is-snapping');
    setDragTransform(homeRect.left, homeRect.top, `transform ${ABOUT_BREAD_SPRING_MS}ms ${ABOUT_BREAD_SPRING_EASE}`);
    bread.addEventListener('transitionend', finishSnap);
    snapTimer = window.setTimeout(() => finishSnap({ propertyName: 'transform' }), ABOUT_BREAD_SPRING_MS + 60);
  };

  bread.addEventListener('pointerdown', (event) => {
    if (bread.classList.contains('is-snapping')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    homeRect = bread.getBoundingClientRect();
    offsetX = event.clientX - homeRect.left;
    offsetY = event.clientY - homeRect.top;
    dragging = true;
    pointerId = event.pointerId;

    document.body.appendChild(bread);
    bread.classList.add('is-floating', 'is-dragging');
    bread.style.position = 'fixed';
    bread.style.left = '0';
    bread.style.top = '0';
    bread.style.width = `${homeRect.width}px`;
    bread.style.height = `${homeRect.height}px`;
    bread.style.margin = '0';
    bread.style.zIndex = '60';
    bread.style.transformOrigin = 'top left';
    setDragTransform(event.clientX - offsetX, event.clientY - offsetY);

    bread.setPointerCapture(event.pointerId);
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    event.preventDefault();
  });

  aboutBreadDragState = { reset: clearInlineStyles };
}

function initAboutInfoPanel() {
  const panelRoot = document.getElementById('aboutInfoPanel');
  const trigger = document.querySelector('.pf-about__info-trigger');
  const backdrop = document.getElementById('aboutInfoBackdrop');
  const closeBtn = panelRoot?.querySelector('.pf-about-info__close');
  const panel = panelRoot?.querySelector('.pf-about-info__panel');
  if (!panelRoot || !trigger || !panel) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const closeDurationMs = reducedMotion ? 0 : 620;

  const finishClose = () => {
    panelRoot.classList.remove('is-closing');
    panelRoot.hidden = true;
    panelRoot.setAttribute('aria-hidden', 'true');
  };

  const openPanel = () => {
    panelRoot.classList.remove('is-closing');
    panelRoot.hidden = false;
    panelRoot.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      panelRoot.classList.add('is-open');
      document.body.classList.add('is-about-info-open');
    });
  };

  const closePanel = () => {
    if (!panelRoot.classList.contains('is-open')) return;

    panelRoot.classList.remove('is-open');
    panelRoot.classList.add('is-closing');
    document.body.classList.remove('is-about-info-open');
    trigger.setAttribute('aria-expanded', 'false');

    if (reducedMotion) {
      finishClose();
      return;
    }

    let closed = false;
    const onClosed = (event) => {
      if (event.target !== panel || event.propertyName !== 'transform') return;
      panel.removeEventListener('transitionend', onClosed);
      if (closed) return;
      closed = true;
      finishClose();
    };

    panel.addEventListener('transitionend', onClosed);
    window.setTimeout(() => {
      if (closed) return;
      closed = true;
      panel.removeEventListener('transitionend', onClosed);
      finishClose();
    }, closeDurationMs);
  };

  trigger.addEventListener('click', () => {
    if (panelRoot.classList.contains('is-open')) {
      closePanel();
    } else {
      openPanel();
    }
  });

  closeBtn?.addEventListener('click', closePanel);
  backdrop?.addEventListener('click', closePanel);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panelRoot.classList.contains('is-open')) {
      closePanel();
    }
  });

  aboutInfoPanelState = { close: closePanel };
}

let aboutInfoPanelState = null;

function closeAboutInfoPanel() {
  if (aboutInfoPanelState) aboutInfoPanelState.close();
}

let propTransitionActive = false;
let aboutTextTimeline = null;
let aboutDecoTimeline = null;

function prepareAboutCopyWords() {
  const copy = document.querySelector('.pf-about__copy');
  if (!copy || copy.dataset.wordsWrapped) return;

  copy.querySelectorAll('.pf-about__lede').forEach((paragraph) => {
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      if (!node.textContent.trim()) return;

      const parts = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();

      parts.forEach((part) => {
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else if (part) {
          const span = document.createElement('span');
          span.className = 'about-word';
          span.textContent = part;
          frag.appendChild(span);
        }
      });

      node.parentNode.replaceChild(frag, node);
    });
  });

  copy.dataset.wordsWrapped = 'true';
}

function resetAboutEntrance() {
  document.body.classList.remove('is-about-entrance', 'is-about-text-entrance', 'is-about-revealed');

  if (aboutTextTimeline) {
    aboutTextTimeline.kill();
    aboutTextTimeline = null;
  }
  if (aboutDecoTimeline) {
    aboutDecoTimeline.kill();
    aboutDecoTimeline = null;
  }

  resetAboutBreadDrag();
  closeAboutInfoPanel();

  const copy = document.querySelector('.pf-about__copy');
  const deco = document.querySelector('.pf-about__deco');
  const info = document.querySelector('.pf-about__info');
  const words = copy?.querySelectorAll('.about-word');

  if (typeof gsap !== 'undefined') {
    if (propTransition) gsap.set(propTransition, { clearProps: 'opacity' });
    if (copy) gsap.set(copy, { clearProps: 'all' });
    if (deco) gsap.set(deco, { clearProps: 'all' });
    if (info) gsap.set(info, { clearProps: 'all' });
    if (words?.length) gsap.set(words, { clearProps: 'all' });
  }
}

function playAboutTextEntrance({ immediate = false } = {}) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  prepareAboutCopyWords();

  const copy = document.querySelector('.pf-about__copy');
  const info = document.querySelector('.pf-about__info');
  const words = copy?.querySelectorAll('.about-word');

  if (!copy) return;

  document.body.classList.add('is-about-text-entrance');

  if (reducedMotion || immediate || typeof gsap === 'undefined') {
    if (typeof gsap !== 'undefined') {
      gsap.set(copy, { rotate: 0, y: 0, opacity: 1 });
      if (words?.length) gsap.set(words, { opacity: 1, filter: 'blur(0px)' });
      if (info) gsap.set(info, { opacity: 1, y: 0 });
    }
    return;
  }

  if (aboutTextTimeline) aboutTextTimeline.kill();

  gsap.set(copy, { rotate: 5, y: 36, transformOrigin: '0% 50%', opacity: 1 });
  if (words?.length) gsap.set(words, { opacity: 0, filter: 'blur(10px)' });
  if (info) gsap.set(info, { opacity: 0, y: 16 });

  aboutTextTimeline = gsap.timeline({
    onComplete: () => {
      aboutTextTimeline = null;
    },
  });

  aboutTextTimeline.to(copy, {
    rotate: 0,
    y: 0,
    duration: 0.95,
    ease: 'power3.out',
  }, 0);

  if (words?.length) {
    aboutTextTimeline.to(words, {
      opacity: 1,
      filter: 'blur(0px)',
      duration: 0.55,
      stagger: 0.04,
      ease: 'power2.out',
    }, 0.1);
  }

  if (info) {
    aboutTextTimeline.to(info, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      ease: 'power2.out',
    }, 0.56);
  }
}

function playAboutDecoEntrance({ immediate = false } = {}) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deco = document.querySelector('.pf-about__deco');

  if (!deco) return;

  document.body.classList.add('is-about-entrance');

  if (reducedMotion || immediate || typeof gsap === 'undefined') {
    if (typeof gsap !== 'undefined') gsap.set(deco, { y: 0 });
    return;
  }

  if (aboutDecoTimeline) aboutDecoTimeline.kill();

  gsap.set(deco, { y: '100%' });

  aboutDecoTimeline = gsap.timeline({
    onComplete: () => {
      aboutDecoTimeline = null;
    },
  });

  aboutDecoTimeline.to(deco, {
    y: '0%',
    duration: 0.9,
    ease: 'power3.out',
  }, 0);
}

function playAboutEntranceAnimation({ immediate = false } = {}) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const markRevealed = () => {
    document.body.classList.add('is-about-revealed');
    document.body.classList.remove('is-about-entrance', 'is-about-text-entrance');
  };

  if (reducedMotion || immediate || typeof gsap === 'undefined') {
    playAboutTextEntrance({ immediate: true });
    playAboutDecoEntrance({ immediate: true });
    markRevealed();
    return;
  }

  playAboutTextEntrance();
  playAboutDecoEntrance();
  gsap.delayedCall(1.15, markRevealed);
}

function layoutPropTransitionVideo() {
  if (!propTransition) return;

  propTransition.style.left = '0';
  propTransition.style.top = '0';
  propTransition.style.width = '100%';
  propTransition.style.height = '100%';
}

function preloadPropTransitionVideo() {
  if (!propTransitionVideo || propTransitionVideo.readyState >= HTMLMediaElement.HAVE_METADATA) return;
  propTransitionVideo.load();
}

function playPropTransitionVideo(src) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !propTransition || !propTransitionVideo || !src) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    propTransitionActive = true;
    document.body.classList.add('is-prop-transition');
    setSiteView('#about');
    let aboutTextStarted = false;
    let aboutDecoStarted = false;

    const triggerAboutText = () => {
      if (aboutTextStarted) return;
      aboutTextStarted = true;
      playAboutTextEntrance();
    };

    const triggerAboutDeco = () => {
      if (aboutDecoStarted) return;
      aboutDecoStarted = true;
      playAboutDecoEntrance();
    };

    const maybeTriggerAboutEntrance = () => {
      const duration = propTransitionVideo.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const remaining = duration - propTransitionVideo.currentTime;
      if (remaining <= ABOUT_TEXT_LEAD) triggerAboutText();
      if (remaining <= ABOUT_DECO_LEAD) triggerAboutDeco();
    };

    const finish = () => {
      propTransitionVideo.removeEventListener('timeupdate', maybeTriggerAboutEntrance);
      propTransitionVideo.pause();
      propTransitionVideo.onloadeddata = null;
      propTransitionVideo.onended = null;
      propTransitionVideo.onerror = null;
      propTransition.classList.remove('is-active');
      propTransition.hidden = true;
      propTransition.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-prop-transition');
      propTransitionActive = false;

      if (!aboutTextStarted) {
        playAboutTextEntrance({ immediate: true });
        aboutTextStarted = true;
      }
      if (!aboutDecoStarted) {
        playAboutDecoEntrance({ immediate: true });
        aboutDecoStarted = true;
      }

      document.body.classList.add('is-about-revealed');
      document.body.classList.remove('is-about-entrance', 'is-about-text-entrance');

      if (typeof gsap !== 'undefined' && propTransition) {
        gsap.set(propTransition, { clearProps: 'opacity' });
      }

      resolve();
    };

    const startPlayback = () => {
      layoutPropTransitionVideo();
      propTransition.hidden = false;
      propTransition.removeAttribute('aria-hidden');
      propTransition.classList.add('is-active');
      if (typeof gsap !== 'undefined') {
        gsap.set(propTransition, { opacity: 1 });
      }
      propTransitionVideo.onended = finish;
      propTransitionVideo.onerror = finish;
      propTransitionVideo.addEventListener('timeupdate', maybeTriggerAboutEntrance);
      propTransitionVideo.play().catch(finish);
    };

    const waitForFrame = () => {
      layoutPropTransitionVideo();
      startPlayback();
    };

    if (propTransitionVideo.src !== src) {
      propTransitionVideo.src = src;
    }

    if (propTransitionVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      propTransitionVideo.currentTime = 0;
      waitForFrame();
      return;
    }

    propTransitionVideo.onloadeddata = () => {
      propTransitionVideo.currentTime = 0;
      waitForFrame();
    };

    propTransitionVideo.onerror = finish;
    propTransitionVideo.load();
  });
}

function isPropTransitionActive() {
  return propTransitionActive;
}

function jumpNavLetters(href) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navItem = document.querySelector(`.site-header__nav a.nav-item[href="${href}"]`);
  if (!navItem || reducedMotion) return;

  navItem.classList.remove('nav-item--jump');
  void navItem.offsetWidth;
  navItem.classList.add('nav-item--jump');
  window.setTimeout(() => navItem.classList.remove('nav-item--jump'), 560);
}

function setSiteView(href) {
  const view = SITE_VIEWS[href];
  if (!view || !document.body.classList.contains('site-entered')) return;

  document.body.classList.remove('site-view-hero', 'site-view-work', 'site-view-about', 'site-view-implement');
  document.body.classList.add(`site-view-${view}`);
  document.body.classList.add('site-scrolled');

  const panel = document.querySelector(href);
  if (panel) panel.scrollTop = 0;
  window.scrollTo(0, 0);
}

function returnToHeroScene() {
  if (!document.body.classList.contains('site-entered')) return;

  closeMenu();
  resetAboutEntrance();
  document.body.classList.remove('is-prop-transition', 'site-view-work', 'site-view-about', 'site-view-implement', 'site-scrolled');
  document.body.classList.add('site-view-hero');
  window.scrollTo(0, 0);
  window.playHeroSceneIntro?.();
}

async function navigatePortfolioSection(href, { viaProp = false, anchor = null } = {}) {
  if (!SITE_VIEWS[href] || propTransitionActive) return;
  jumpNavLetters(href);

  if (href !== '#about') {
    resetAboutEntrance();
  }

  if (viaProp && PROP_TRANSITION_VIDEOS[href]) {
    await playPropTransitionVideo(PROP_TRANSITION_VIDEOS[href]);
    if (href === '#about') {
      if (!document.body.classList.contains('site-view-about')) {
        setSiteView(href);
        playAboutEntranceAnimation({ immediate: true });
      }
    } else {
      setSiteView(href);
    }
    return;
  }

  setSiteView(href);

  if (href === '#about') {
    playAboutEntranceAnimation();
  }
}

window.navigatePortfolioSection = navigatePortfolioSection;
window.setSiteView = setSiteView;
window.returnToHeroScene = returnToHeroScene;
window.isPropTransitionActive = isPropTransitionActive;

function bindPortfolioNav() {
  document.querySelectorAll('.site-header__nav a[href^="#"], .menu__links a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!document.body.classList.contains('site-entered')) return;

      const href = link.getAttribute('href');
      if (!href || href === '#top' || !SITE_VIEWS[href]) return;

      event.preventDefault();
      closeMenu();
      navigatePortfolioSection(href);
    });
  });
}

function updateSiteScrollState() {
  if (!document.body.classList.contains('site-entered')) {
    document.body.classList.remove('site-scrolled');
  }
}

function revealPortfolioContent() {
  stopFermentPressure();
  stopBgParticles();
  document.body.classList.remove(
    'home-primed',
    'home-unpriming',
    'site-scrolled',
    'site-view-work',
    'site-view-about',
    'site-view-implement'
  );
  document.body.classList.remove('is-home-only');
  document.body.classList.add('site-entered', 'site-view-hero');
  if (siteContent) siteContent.hidden = false;
  const heroPlaceholder = document.getElementById('heroPlaceholder');
  if (heroPlaceholder) heroPlaceholder.removeAttribute('aria-hidden');
  initHeroScene?.(heroPlaceholder);
  preloadPropTransitionVideo();
  document.querySelectorAll('.site-content .reveal').forEach((el) => observer.observe(el));
  updateSiteScrollState();
  window.scrollTo(0, 0);
}

window.addEventListener('scroll', updateSiteScrollState, { passive: true });

function layoutBreadTransitionOverlay() {
  if (!breadTransitionOverlay || !breadRevealMaskBg || !breadRevealVeil) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  breadTransitionOverlay.setAttribute('width', String(w));
  breadTransitionOverlay.setAttribute('height', String(h));
  breadTransitionOverlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
  breadRevealMaskBg.setAttribute('width', String(w));
  breadRevealMaskBg.setAttribute('height', String(h));
  breadRevealVeil.setAttribute('width', String(w));
  breadRevealVeil.setAttribute('height', String(h));
}

function animateBreadRevealCutout(cx, cy, startW, coverScale) {
  if (!breadRevealGroup || !breadRevealCutout) return Promise.resolve();

  const startH = startW * BREAD_CUTOUT_ASPECT;
  breadRevealCutout.setAttribute('width', String(startW));
  breadRevealCutout.setAttribute('height', String(startH));
  breadRevealCutout.setAttribute('x', String(-startW / 2));
  breadRevealCutout.setAttribute('y', String(-startH / 2));
  breadRevealGroup.setAttribute('transform', `translate(${cx} ${cy}) scale(${BREAD_REVEAL_START_SCALE})`);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || typeof gsap === 'undefined') {
    breadRevealGroup.setAttribute('transform', `translate(${cx} ${cy}) scale(${coverScale})`);
    return wait(40);
  }

  const state = { scale: BREAD_REVEAL_START_SCALE };
  return new Promise((resolve) => {
    gsap.to(state, {
      scale: coverScale,
      duration: 0.92,
      ease: 'power3.inOut',
      onUpdate() {
        breadRevealGroup.setAttribute('transform', `translate(${cx} ${cy}) scale(${state.scale})`);
      },
      onComplete: resolve,
    });
  });
}

async function enterSite() {
  if (siteEntered || !breadHit || !breadTransition || !breadRevealGroup) return;
  siteEntered = true;
  breadHit.disabled = true;
  stopFermentPressure();
  stopBgParticles();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealPortfolioContent();
    window.playHeroSceneIntro?.({ immediate: true });
    return;
  }

  const rect = breadWrap.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const startW = rect.width;
  const startH = startW * BREAD_CUTOUT_ASPECT;
  const coverScale = Math.max(
    (window.innerWidth * 1.28) / startW,
    (window.innerHeight * 1.28) / startH
  );

  layoutBreadTransitionOverlay();
  document.body.classList.add('is-entering');
  breadTransition.hidden = false;
  breadTransition.removeAttribute('aria-hidden');
  breadTransition.classList.remove('is-out');

  revealPortfolioContent();

  await animateBreadRevealCutout(cx, cy, startW, coverScale);
  await wait(80);

  breadTransition.classList.add('is-out');
  await wait(460);

  breadTransition.classList.remove('is-out');
  breadTransition.hidden = true;
  breadTransition.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-entering');
  breadRevealGroup.setAttribute('transform', 'translate(0 0) scale(1)');
  window.playHeroSceneIntro?.();
}

document.addEventListener('wheel', handleHomeWheel, { passive: false });
bindPortfolioNav();

const breadPixel = breadHit ? initBreadPixel(breadHit) : null;
initAboutBreadDrag();
initAboutInfoPanel();

function returnToHome() {
  if (!document.body.classList.contains('site-entered')) return;

  closeMenu();
  stopFermentPressure();
  stopBgParticles();
  breadPixel?.reset();
  window.resetHeroSceneIntro?.();
  resetHomePrime();
  siteEntered = false;
  document.body.classList.remove(
    'site-entered',
    'site-scrolled',
    'site-view-hero',
    'site-view-work',
    'site-view-about',
    'site-view-implement'
  );
  document.body.classList.add('is-home-only');
  if (siteContent) siteContent.hidden = true;
  const heroPlaceholder = document.getElementById('heroPlaceholder');
  if (heroPlaceholder) heroPlaceholder.setAttribute('aria-hidden', 'true');
  if (breadHit) breadHit.disabled = false;
  window.scrollTo(0, 0);
}

const brand = document.querySelector('.brand');
if (brand) {
  brand.addEventListener('click', (event) => {
    if (isHomeTransitioning) {
      event.preventDefault();
      return;
    }
    if (document.body.classList.contains('site-entered')) {
      event.preventDefault();
      if (document.body.classList.contains('site-view-hero')) {
        returnToHome();
      } else {
        returnToHeroScene();
      }
      return;
    }
    if (breadPrimed) {
      event.preventDefault();
      unprimeHome();
    }
  });
}
