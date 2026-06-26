/** Screen 3 hero — sticker nav, intro float entrance, emoji motion. */
const HERO_SCENE_EMOJI_RE = /\p{Extended_Pictographic}/u;

let heroIntroState = null;
let heroIntroTimeline = null;

function isHeroSceneEmoji(char) {
  return HERO_SCENE_EMOJI_RE.test(char);
}

function splitHeroSceneTextElement(el) {
  if (!el) return [];

  if (el.dataset.charsSplit) {
    return [...el.querySelectorAll('.hero-scene__char')];
  }

  const text = el.textContent.replace(/\s+/g, ' ').trim();
  el.textContent = '';
  el.dataset.charsSplit = '1';
  el.classList.add('hero-scene__float-host');

  const chars = [];
  let emojiIndex = 0;

  [...text].forEach((char) => {
    const span = document.createElement('span');
    span.className = 'hero-scene__char';
    if (isHeroSceneEmoji(char)) {
      span.classList.add('hero-scene__emoji');
      span.style.setProperty('--emoji-i', String(emojiIndex));
      emojiIndex += 1;
    }
    span.textContent = char === ' ' ? '\u00A0' : char;
    el.appendChild(span);
    chars.push(span);
  });

  return chars;
}

function prepareHeroSceneIntro(root) {
  const intro = root?.querySelector('.hero-scene__intro');
  if (!intro) return null;

  if (!intro.dataset.introOriginal) {
    intro.dataset.introOriginal = intro.innerHTML;
  }

  if (intro.dataset.introPrepared) {
    return {
      intro,
      chars: [...intro.querySelectorAll('.hero-scene__char')],
    };
  }

  const chars = [];

  intro.querySelectorAll('.hero-scene__line').forEach((line) => {
    const name = line.querySelector('.hero-scene__name');
    if (name) {
      chars.push(...splitHeroSceneTextElement(name));
      return;
    }
    chars.push(...splitHeroSceneTextElement(line));
  });

  const body = intro.querySelector('.hero-scene__body');
  if (body) chars.push(...splitHeroSceneTextElement(body));

  intro.dataset.introPrepared = '1';
  intro.classList.add('hero-scene__intro--prepared');

  heroIntroState = { intro, chars };
  return heroIntroState;
}

function playHeroSceneIntro({ immediate = false } = {}) {
  const root = document.querySelector('.hero-scene');
  const state = heroIntroState || prepareHeroSceneIntro(root);
  if (!state?.chars.length) return;

  const { intro, chars } = state;
  intro.classList.remove('is-intro-live');
  intro.classList.add('is-intro-animating');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (heroIntroTimeline) {
    heroIntroTimeline.kill();
    heroIntroTimeline = null;
  }

  if (reducedMotion || immediate || typeof gsap === 'undefined') {
    if (typeof gsap !== 'undefined') {
      gsap.set(chars, { clearProps: 'all', opacity: 1 });
    } else {
      chars.forEach((char) => {
        char.style.opacity = '1';
      });
    }
    intro.classList.remove('is-intro-animating');
    intro.classList.add('is-intro-live');
    return;
  }

  gsap.set(chars, {
    willChange: 'opacity, transform',
    opacity: 0,
    yPercent: 120,
    scaleY: 2.3,
    scaleX: 0.7,
    transformOrigin: '50% 0%',
  });

  heroIntroTimeline = gsap.to(chars, {
    opacity: 1,
    yPercent: 0,
    scaleY: 1,
    scaleX: 1,
    duration: 0.45,
    ease: 'back.inOut(2)',
    stagger: 0.012,
    onComplete: () => {
      heroIntroTimeline = null;
      intro.classList.remove('is-intro-animating');
      intro.classList.add('is-intro-live');
      gsap.set(chars, { clearProps: 'willChange' });
    },
  });
}

function resetHeroSceneIntro() {
  if (heroIntroTimeline) {
    heroIntroTimeline.kill();
    heroIntroTimeline = null;
  }

  document.querySelectorAll('.hero-scene__intro[data-intro-original]').forEach((intro) => {
    intro.innerHTML = intro.dataset.introOriginal;
    intro.classList.remove('is-intro-live', 'is-intro-animating', 'hero-scene__intro--prepared');
    delete intro.dataset.introPrepared;
  });

  heroIntroState = null;
}

function initHeroScene(root) {
  if (!root || root.dataset.heroSceneReady === '1') return;
  root.dataset.heroSceneReady = '1';

  prepareHeroSceneIntro(root);

  const propTargets = {
    'hero-scene__prop--desk': '#work',
    'hero-scene__prop--counter': '#about',
    'hero-scene__prop--board': '#contact',
  };

  const propTransitionTargets = new Set([
    'hero-scene__prop--desk',
    'hero-scene__prop--counter',
    'hero-scene__prop--board',
  ]);

  root.querySelectorAll('.hero-scene__prop').forEach((btn) => {
    const targetClass = [...btn.classList].find((name) => propTargets[name]);
    const href = targetClass ? propTargets[targetClass] : null;
    if (!href) return;

    btn.addEventListener('click', async () => {
      if (window.isPropTransitionActive?.()) return;

      btn.classList.add('is-lit');
      const viaProp = propTransitionTargets.has(targetClass);
      await window.navigatePortfolioSection?.(href, { viaProp, anchor: btn });
      window.setTimeout(() => btn.classList.remove('is-lit'), 420);
    });
  });
}

window.initHeroScene = initHeroScene;
window.playHeroSceneIntro = playHeroSceneIntro;
window.resetHeroSceneIntro = resetHeroSceneIntro;
