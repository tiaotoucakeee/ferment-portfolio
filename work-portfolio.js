const WORK_PORTFOLIO = [
  { file: 'pf-01.png', title: '亚瑟街的小tutu', grad: 1, size: 'hero' },
  { file: 'pf-02.png', title: '静帧展示', grad: 2, size: 'tall' },
  { file: 'pf-03.png', title: '由祝心澜', grad: 3, size: 'sm' },
  { file: 'pf-04.png', title: '游戏简介', grad: 4, size: 'sm' },
  { file: 'pf-05.png', title: '关卡设计', grad: 5, size: 'wide' },
  { file: 'pf-06.png', title: '剧情设计', grad: 6, size: 'md' },
  { file: 'pf-07.png', title: '技术运用', grad: 1, size: 'md' },
  { file: 'pf-08.png', title: '美术风格', grad: 2, size: 'wide' },
  { file: 'pf-09.png', title: '主人公设定', grad: 3, size: 'tall' },
  { file: 'pf-10.png', title: '问卷设计', grad: 4, size: 'sm' },
  { file: 'pf-11.png', title: '制作过程', grad: 5, size: 'hero' },
  { file: 'pf-12.png', title: '青蛇', grad: 6, size: 'sm' },
  { file: 'pf-13.png', title: 'TouchDesigner 海报', grad: 1, size: 'wide' },
  { file: 'pf-14.png', title: '面包要被吃掉了', grad: 2, size: 'md' },
  { file: 'pf-15.png', title: '造型基础 · 写生', grad: 3, size: 'tall' },
  { file: 'pf-16.png', title: '漫画游戏绘画', grad: 4, size: 'wide' },
  { file: 'pf-17.png', title: '视觉设计探索', grad: 5, size: 'sm' },
  { file: 'pf-18.png', title: '交互界面设计', grad: 6, size: 'md' },
  { file: 'pf-19.png', title: '角色场景设定', grad: 1, size: 'sm' },
  { file: 'pf-20.png', title: '项目过程记录', grad: 2, size: 'wide' },
  { file: 'pf-21.png', title: '综合作品展示', grad: 3, size: 'tall' },
];

const PORTFOLIO_BASE = './assets/work/portfolio/';
const SIZE_TO_RATIO = {
  hero: 'hero',
  tall: 'tall',
  wide: 'wide',
  md: 'md',
  sm: 'sm',
};

let portfolioScrollRaf = 0;
let portfolioScrollBound = false;
let portfolioRevealBound = false;

const SIZE_WEIGHT = {
  hero: 5,
  tall: 4,
  wide: 3,
  md: 2,
  sm: 1,
};

function assignPortfolioColumns(items) {
  const colA = [];
  const colB = [];
  let weightA = 0;
  let weightB = 0;

  items.forEach((item, index) => {
    const weight = SIZE_WEIGHT[item.size] || 2;
    let target;

    if (weightA < weightB) target = colA;
    else if (weightB < weightA) target = colB;
    else target = colA.length <= colB.length ? colA : colB;

    target.push({ item, index, columnIndex: target.length });
    if (target === colA) weightA += weight;
    else weightB += weight;
  });

  return rebalancePortfolioTail(colA, colB);
}

function rebalancePortfolioTail(colA, colB) {
  if (colA.length <= colB.length) {
    return { colA, colB };
  }

  const moved = colA.pop();
  moved.columnIndex = colB.length;
  colB.push(moved);

  colA.forEach((entry, index) => {
    entry.columnIndex = index;
  });
  colB.forEach((entry, index) => {
    entry.columnIndex = index;
  });

  return { colA, colB };
}

function buildWorkPortfolioTile(item, index, columnIndex) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pf-tile pf-tile--preview';
  btn.classList.add(`pf-tile--ratio-${SIZE_TO_RATIO[item.size] || 'md'}`);
  btn.classList.add(`grad-${item.grad}`);
  btn.dataset.previewSrc = `${PORTFOLIO_BASE}${item.file}`;
  btn.dataset.previewTitle = item.title;
  btn.style.setProperty('--reveal-delay', `${(columnIndex % 6) * 70}ms`);
  btn.setAttribute('aria-label', `Preview ${item.title}`);

  const img = document.createElement('img');
  img.className = 'pf-tile__img';
  img.src = `${PORTFOLIO_BASE}${item.file}`;
  img.alt = item.title;
  img.loading = index < 8 ? 'eager' : 'lazy';
  img.decoding = 'async';

  const cap = document.createElement('span');
  cap.className = 'pf-tile__cap';
  cap.textContent = item.title;

  btn.append(img, cap);
  return btn;
}

function openPortfolioLightbox(src, title) {
  const lightbox = document.getElementById('pfLightbox');
  const img = document.getElementById('pfLightboxImg');
  const cap = document.getElementById('pfLightboxCap');
  if (!lightbox || !img) return;

  img.src = src;
  img.alt = title || '';
  if (cap) cap.textContent = title || '';

  lightbox.hidden = false;
  lightbox.removeAttribute('aria-hidden');
  document.body.classList.add('is-lightbox-open');
  document.getElementById('pfLightboxClose')?.focus();
}

function closePortfolioLightbox() {
  const lightbox = document.getElementById('pfLightbox');
  const img = document.getElementById('pfLightboxImg');
  if (!lightbox) return;

  lightbox.hidden = true;
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-lightbox-open');
  if (img) {
    img.removeAttribute('src');
    img.alt = '';
  }
}

function getWorkScrollRoot() {
  return document.getElementById('work');
}

function syncWorkPortfolioReveal() {
  const scroller = getWorkScrollRoot();
  const tiles = document.querySelectorAll('.pf-work__gallery .pf-tile--preview');
  if (!scroller || !tiles.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    tiles.forEach((tile) => tile.classList.add('is-visible'));
    return;
  }

  const rootRect = scroller.getBoundingClientRect();
  const edge = Math.min(96, scroller.clientHeight * 0.12);

  tiles.forEach((tile) => {
    if (tile.classList.contains('is-visible')) return;
    const rect = tile.getBoundingClientRect();
    if (rect.bottom > rootRect.top + edge && rect.top < rootRect.bottom - edge) {
      tile.classList.add('is-visible');
    }
  });
}

function updateWorkPortfolioParallax() {
  portfolioScrollRaf = 0;

  const scroller = getWorkScrollRoot();
  const gallery = document.getElementById('workPortfolioGrid');
  const colA = document.querySelector('.pf-work__col--a');
  const colB = document.querySelector('.pf-work__col--b');
  if (!scroller || !gallery || !colA || !colB) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    colA.style.transform = '';
    colB.style.transform = '';
    return;
  }

  if (window.matchMedia('(max-width: 720px)').matches) {
    colA.style.transform = '';
    colB.style.transform = '';
    return;
  }

  const scrollTop = scroller.scrollTop;
  const start = gallery.offsetTop - scroller.clientHeight * 0.18;
  const delta = Math.max(0, scrollTop - start);

  colA.style.transform = `translate3d(0, ${delta * 0.055}px, 0)`;
  colB.style.transform = `translate3d(0, ${-delta * 0.038}px, 0)`;
}

function onWorkPortfolioScroll() {
  syncWorkPortfolioReveal();
  if (portfolioScrollRaf) return;
  portfolioScrollRaf = window.requestAnimationFrame(updateWorkPortfolioParallax);
}

function initWorkPortfolioScrollFX() {
  const scroller = getWorkScrollRoot();
  if (!scroller || portfolioScrollBound) return;
  portfolioScrollBound = true;

  scroller.addEventListener('scroll', onWorkPortfolioScroll, { passive: true });
  window.addEventListener('resize', onWorkPortfolioScroll, { passive: true });
  onWorkPortfolioScroll();
}

function initWorkPortfolioTileReveal() {
  const scroller = getWorkScrollRoot();
  if (!scroller || portfolioRevealBound) return;
  portfolioRevealBound = true;

  syncWorkPortfolioReveal();
  window.requestAnimationFrame(syncWorkPortfolioReveal);
  window.setTimeout(syncWorkPortfolioReveal, 120);
}

function refreshWorkPortfolioReveal() {
  syncWorkPortfolioReveal();
  updateWorkPortfolioParallax();
  window.requestAnimationFrame(syncWorkPortfolioReveal);
}

function initWorkPortfolio() {
  const grid = document.getElementById('workPortfolioGrid');
  const colA = document.getElementById('workPortfolioColA');
  const colB = document.getElementById('workPortfolioColB');
  if (!grid || !colA || !colB || grid.dataset.ready === '1') return;
  grid.dataset.ready = '1';

  colA.replaceChildren();
  colB.replaceChildren();

  const { colA: leftItems, colB: rightItems } = assignPortfolioColumns(WORK_PORTFOLIO);

  leftItems.forEach(({ item, index, columnIndex }) => {
    colA.appendChild(buildWorkPortfolioTile(item, index, columnIndex));
  });

  rightItems.forEach(({ item, index, columnIndex }) => {
    colB.appendChild(buildWorkPortfolioTile(item, index, columnIndex));
  });

  grid.addEventListener('click', (event) => {
    const tile = event.target.closest('.pf-tile--preview');
    if (!tile) return;
    openPortfolioLightbox(tile.dataset.previewSrc, tile.dataset.previewTitle);
  });

  const lightbox = document.getElementById('pfLightbox');
  const backdrop = document.getElementById('pfLightboxBackdrop');
  const closeBtn = document.getElementById('pfLightboxClose');

  backdrop?.addEventListener('click', closePortfolioLightbox);
  closeBtn?.addEventListener('click', closePortfolioLightbox);

  if (!document.body.dataset.portfolioLightboxKeybound) {
    document.body.dataset.portfolioLightboxKeybound = '1';
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !lightbox?.hidden) {
        closePortfolioLightbox();
      }
    });
  }

  initWorkPortfolioTileReveal();
  initWorkPortfolioScrollFX();
  refreshWorkPortfolioReveal();
}

window.initWorkPortfolio = initWorkPortfolio;
window.refreshWorkPortfolioReveal = refreshWorkPortfolioReveal;
window.closePortfolioLightbox = closePortfolioLightbox;
