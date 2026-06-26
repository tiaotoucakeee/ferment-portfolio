/** BlurText-style word entrance (vanilla + GSAP port of React Bits). */
const blurTextStates = new WeakMap();

function parseBlurTextOptions(el) {
  return {
    animateBy: el.dataset.blurAnimateBy || 'words',
    direction: el.dataset.blurDirection || 'top',
    delay: Number(el.dataset.blurDelay || 150),
    stepDuration: Number(el.dataset.blurStepDuration || 0.35),
    threshold: Number(el.dataset.blurThreshold || 0.1),
    rootMargin: el.dataset.blurRootMargin || '0px',
  };
}

function getBlurTextFromState(direction) {
  return direction === 'top'
    ? { filter: 'blur(10px)', opacity: 0, y: -50 }
    : { filter: 'blur(10px)', opacity: 0, y: 50 };
}

function getBlurTextMidState(direction) {
  return direction === 'top'
    ? { filter: 'blur(5px)', opacity: 0.5, y: 5 }
    : { filter: 'blur(5px)', opacity: 0.5, y: -5 };
}

function getBlurTextToState() {
  return { filter: 'blur(0px)', opacity: 1, y: 0 };
}

function wrapBlurTextContent(el, animateBy) {
  if (el.dataset.blurPrepared) {
    return blurTextStates.get(el)?.segments || [];
  }

  if (!el.dataset.blurOriginal) {
    el.dataset.blurOriginal = el.innerHTML;
  }

  const segments = [];
  const frag = document.createDocumentFragment();

  const appendWord = (word) => {
    const span = document.createElement('span');
    span.className = 'blur-text__segment';
    span.textContent = word;
    frag.appendChild(span);
    segments.push(span);
  };

  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;

      if (animateBy === 'letters') {
        [...text].forEach((char) => appendWord(char === ' ' ? '\u00A0' : char));
        return;
      }

      text.split(' ').forEach((word, index, parts) => {
        appendWord(word);
        if (index < parts.length - 1) frag.appendChild(document.createTextNode(' '));
      });
      return;
    }

    if (node.nodeName === 'BR') {
      frag.appendChild(document.createElement('br'));
      return;
    }

    if (
      node.nodeType === Node.ELEMENT_NODE
      && node.nodeName === 'SPAN'
      && node.classList.contains('pf-work__title-hungry')
    ) {
      node.classList.add('blur-text__segment');
      frag.appendChild(node);
      segments.push(node);
    }
  });

  el.innerHTML = '';
  el.appendChild(frag);
  el.classList.add('blur-text--prepared');
  el.dataset.blurPrepared = '1';

  const state = { ...parseBlurTextOptions(el), segments, observer: null, timeline: null };
  blurTextStates.set(el, state);
  return segments;
}

function setBlurTextImmediate(el, state) {
  const { segments, direction } = state;
  if (typeof gsap === 'undefined') {
    segments.forEach((segment) => {
      segment.style.opacity = '1';
      segment.style.transform = 'none';
      segment.style.filter = 'none';
    });
    return;
  }

  gsap.set(segments, { ...getBlurTextToState(), clearProps: 'willChange' });
  el.classList.add('blur-text--live');
  el.classList.remove('blur-text--animating');
}

function playBlurText(el, { immediate = false } = {}) {
  if (!el) return;

  let state = blurTextStates.get(el);
  if (!state?.segments?.length) {
    wrapBlurTextContent(el, parseBlurTextOptions(el).animateBy);
    state = blurTextStates.get(el);
  }
  if (!state?.segments?.length) return;

  const { segments, direction, delay, stepDuration } = state;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.classList.remove('blur-text--live');
  el.classList.add('blur-text--animating');

  if (state.timeline) {
    state.timeline.kill();
    state.timeline = null;
  }

  if (reducedMotion || immediate || typeof gsap === 'undefined') {
    setBlurTextImmediate(el, state);
    return;
  }

  const from = getBlurTextFromState(direction);
  const mid = getBlurTextMidState(direction);
  const to = getBlurTextToState();

  gsap.set(segments, { ...from, willChange: 'transform, filter, opacity' });

  state.timeline = gsap.timeline({
    onComplete: () => {
      state.timeline = null;
      el.classList.remove('blur-text--animating');
      el.classList.add('blur-text--live');
      gsap.set(segments, { clearProps: 'willChange' });
    },
  });

  segments.forEach((segment, index) => {
    state.timeline.to(segment, {
      ...mid,
      duration: stepDuration,
      ease: 'power2.out',
    }, (index * delay) / 1000);

    state.timeline.to(segment, {
      ...to,
      duration: stepDuration,
      ease: 'power2.out',
    }, (index * delay) / 1000 + stepDuration);
  });
}

function resetBlurText(el) {
  if (!el || !el.dataset.blurOriginal) return;

  const state = blurTextStates.get(el);
  if (state?.timeline) {
    state.timeline.kill();
    state.timeline = null;
  }
  if (state?.observer) {
    state.observer.disconnect();
    state.observer = null;
  }

  el.innerHTML = el.dataset.blurOriginal;
  el.classList.remove('blur-text--prepared', 'blur-text--animating', 'blur-text--live');
  delete el.dataset.blurPrepared;
  blurTextStates.delete(el);
}

function initBlurText(el, { autoplay = true } = {}) {
  if (!el) return;

  const options = parseBlurTextOptions(el);
  wrapBlurTextContent(el, options.animateBy);

  if (!autoplay) return;

  const state = blurTextStates.get(el);
  if (!state || state.observer) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    playBlurText(el, { immediate: true });
    return;
  }

  state.observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      state.observer.disconnect();
      state.observer = null;
      playBlurText(el);
    },
    { threshold: options.threshold, rootMargin: options.rootMargin },
  );

  state.observer.observe(el);
}

window.initBlurText = initBlurText;
window.playBlurText = playBlurText;
window.resetBlurText = resetBlurText;
