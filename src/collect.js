// Reads the rendered design of a page: every visible element's computed
// typography, color, spacing and shape, plus structure (headings, landmarks,
// images, interactive targets). Runs inside the page, so it must stay
// self-contained.

const MAX_ELEMENTS = 5000;

function snapshotInPage(maxElements) {
  const INTERACTIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [tabindex]:not([tabindex="-1"])';
  const px = (v) => (v ? parseFloat(v) || 0 : 0);
  const out = [];

  // Ancestors that clip their children (collapsed menus, carousels) hide
  // content that still has a size. Cache each ancestor's clip box.
  const clipCache = new Map();
  const clipBox = (el) => {
    if (clipCache.has(el)) return clipCache.get(el);
    const cs = getComputedStyle(el);
    const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
    const box = clips ? el.getBoundingClientRect() : null;
    const hidden = parseFloat(cs.opacity) <= 0.01 || cs.visibility === 'hidden';
    const v = { box, hidden };
    clipCache.set(el, v);
    return v;
  };
  const clippedAway = (el, r) => {
    for (let a = el.parentElement, depth = 0; a && a !== document.body && depth < 25; a = a.parentElement, depth++) {
      const { box, hidden } = clipBox(a);
      if (hidden) return true;
      if (box && (r.right <= box.left || r.left >= box.right || r.bottom <= box.top || r.top >= box.bottom)) return true;
    }
    return false;
  };

  const visible = (el, cs, r) =>
    r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 &&
    // checkVisibility() also catches closed <details> and content-visibility: hidden.
    (el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true) &&
    !clippedAway(el, r);

  const ownText = (el) => {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent;
    return t.replace(/\s+/g, ' ').trim();
  };

  const all = document.body ? document.body.querySelectorAll('*') : [];
  for (const el of all) {
    if (out.length >= maxElements) break;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK', 'BR'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!visible(el, cs, r)) continue;
    const text = ownText(el);
    out.push({
      tag: el.tagName.toLowerCase(),
      text: text.slice(0, 120),
      textLength: text.length,
      // Footers, legal text and footnotes are meant to be small; size and measure rules skip them.
      finePrint: text.length > 0 && !!el.closest('footer, [role="contentinfo"], small, [class*="footnote" i], [class*="legal" i], [class*="disclaimer" i], [class*="fine-print" i]'),
      // Code is not prose: line-length and line-height rules skip it.
      code: !!el.closest('pre, code, kbd, samp'),
      rect: { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      font: {
        family: cs.fontFamily,
        size: px(cs.fontSize),
        weight: parseInt(cs.fontWeight, 10) || 400,
        lineHeight: cs.lineHeight === 'normal' ? null : px(cs.lineHeight),
      },
      color: cs.color,
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 600) : null,
      borderColor: px(cs.borderTopWidth) > 0 ? cs.borderTopColor : null,
      radius: px(cs.borderTopLeftRadius),
      shadow: cs.boxShadow !== 'none' ? cs.boxShadow : null,
      textAlign: cs.textAlign,
      display: cs.display,
      padding: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
      margin: [px(cs.marginTop), px(cs.marginRight), px(cs.marginBottom), px(cs.marginLeft)],
      gap: [px(cs.rowGap), px(cs.columnGap)],
      backdrop: cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter : null,
    });
  }

  // Interactive targets, for touch-target size checks.
  const interactive = [];
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!visible(el, cs, r)) continue;
    // Links inside running text are exempt from target-size rules (WCAG 2.5.8).
    const inline = cs.display === 'inline' && el.closest('p, li, td, dd, blockquote') !== null;
    // A checkbox or radio inside (or tied to) a label is clicked through the label too,
    // so the real target is the larger of the two.
    let target = r;
    for (const lab of el.labels || []) {
      const lr = lab.getBoundingClientRect();
      if (lr.width * lr.height > target.width * target.height) target = lr;
    }
    interactive.push({
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute('aria-label') || el.innerText || el.labels?.[0]?.innerText || el.value || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      w: Math.round(target.width),
      h: Math.round(target.height),
      inline,
    });
  }

  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')]
    .filter((h) => h.getBoundingClientRect().height > 0)
    .map((h) => ({
      level: h.getAttribute('aria-level') ? Number(h.getAttribute('aria-level')) : Number(h.tagName[1]) || 2,
      text: h.innerText.replace(/\s+/g, ' ').trim().slice(0, 100),
      size: px(getComputedStyle(h).fontSize),
    }));

  const landmark = (sel) => document.querySelectorAll(sel).length;
  const firstLinks = [...document.querySelectorAll('a[href^="#"]')].slice(0, 5);

  // Groups of 3+ near-identical sibling boxes (the "three feature cards" pattern).
  const cardGroups = [];
  for (const parent of document.querySelectorAll('body *')) {
    const kids = [...parent.children].filter((k) => {
      const r = k.getBoundingClientRect();
      return r.width > 120 && r.height > 80;
    });
    if (kids.length < 3 || kids.length > 6) continue;
    const rects = kids.map((k) => k.getBoundingClientRect());
    const sameRow = rects.every((r) => Math.abs(r.top - rects[0].top) < 4);
    const sameSize = rects.every((r) => Math.abs(r.width - rects[0].width) / rects[0].width < 0.04 && Math.abs(r.height - rects[0].height) / rects[0].height < 0.15);
    if (!sameRow || !sameSize) continue;
    const boxed = kids.every((k) => {
      const cs = getComputedStyle(k);
      return parseFloat(cs.borderTopLeftRadius) > 0 || cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) > 0 || cs.backgroundColor !== getComputedStyle(parent).backgroundColor;
    });
    const recipe = kids.every((k) => k.querySelector('h2, h3, h4, strong, b') && k.querySelector('p') && (k.querySelector('svg, img, i, [class*="icon"]') || /\p{Extended_Pictographic}/u.test(k.innerText.slice(0, 4))));
    if (boxed && recipe) {
      cardGroups.push({ count: kids.length, titles: kids.map((k) => (k.querySelector('h2, h3, h4, strong, b')?.innerText || '').trim().slice(0, 40)) });
    }
  }

  return {
    url: location.href,
    title: document.title,
    lang: document.documentElement.getAttribute('lang') || null,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
    scrollWidth: document.documentElement.scrollWidth,
    pageHeight: document.documentElement.scrollHeight,
    elements: out,
    interactive,
    headings,
    landmarks: {
      main: landmark('main, [role="main"]'),
      nav: landmark('nav, [role="navigation"]'),
      header: landmark('body > header, [role="banner"]'),
      footer: landmark('body > footer, [role="contentinfo"]'),
    },
    skipLink: firstLinks.some((a) => /skip|jump to/i.test(a.textContent || '')),
    images: [...document.images].filter((i) => i.getBoundingClientRect().width > 0).map((i) => ({
      src: (i.currentSrc || i.src || '').slice(0, 120),
      alt: i.getAttribute('alt'),
      w: Math.round(i.getBoundingClientRect().width),
    })),
    cardGroups,
    bodyText: (() => {
      // Text inside [data-tastebud-ignore] (quotes, code samples) is not judged as copy.
      let text = document.body?.innerText || '';
      for (const el of document.querySelectorAll('[data-tastebud-ignore]')) {
        const t = el.innerText;
        if (t) text = text.split(t).join(' ');
      }
      return text.slice(0, 30000);
    })(),
  };
}

export async function collectSnapshot(page) {
  return page.evaluate(snapshotInPage, MAX_ELEMENTS);
}
