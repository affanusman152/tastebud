// Turns a raw page snapshot into design statistics: palette, type scale,
// spacing system and font usage. Rules and the report both read these.

export function parseColor(str) {
  if (!str) return null;
  const m = str.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/);
  if (!m) return null;
  let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { r: +m[1], g: +m[2], b: +m[3], a };
}

export function colorsIn(str) {
  return [...(str || '').matchAll(/rgba?\([^)]*\)/g)].map((m) => parseColor(m[0])).filter(Boolean);
}

export function toHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

// sRGB -> OKLab (Björn Ottosson). Perceptual distance for clustering.
export function toOklab({ r, g, b }) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, Bb);
  let h = (Math.atan2(Bb, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, a: A, b: Bb, C, h };
}

const dist = (p, q) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);

/** Groups perceptually similar colors; returns clusters sorted by usage. */
export function clusterColors(weighted, threshold = 0.035) {
  const clusters = [];
  for (const { color, weight } of weighted) {
    const lab = toOklab(color);
    const hit = clusters.find((c) => dist(c.lab, lab) < threshold);
    if (hit) hit.weight += weight;
    else clusters.push({ lab, hex: toHex(color), weight });
  }
  return clusters.sort((x, y) => y.weight - x.weight);
}

export function primaryFamily(stack) {
  return (stack || '').split(',')[0].replace(/["']/g, '').trim();
}

export function analyze(snap) {
  const els = snap.elements;
  const textEls = els.filter((e) => e.textLength > 0);

  // Fonts, weighted by characters actually rendered in them.
  const fontChars = {};
  for (const e of textEls) {
    const f = primaryFamily(e.font.family);
    fontChars[f] = (fontChars[f] || 0) + e.textLength;
  }
  const fonts = Object.entries(fontChars).sort((a, b) => b[1] - a[1]).map(([family, chars]) => ({ family, chars }));
  const totalChars = fonts.reduce((s, f) => s + f.chars, 0) || 1;

  // Type scale, from main content (fine print is meant to be small).
  const sizeChars = {};
  const mainText = textEls.filter((e) => !e.finePrint);
  const mainChars = mainText.reduce((s, e) => s + e.textLength, 0) || 1;
  for (const e of mainText.length ? mainText : textEls) {
    const s = Math.round(e.font.size * 2) / 2;
    sizeChars[s] = (sizeChars[s] || 0) + e.textLength;
  }
  const sizes = Object.entries(sizeChars).map(([size, chars]) => ({ size: +size, chars })).sort((a, b) => a.size - b.size);
  const bodySize = [...sizes].sort((a, b) => b.chars - a.chars)[0]?.size || 16;
  // Ignore sizes used for a handful of characters (icons, badges).
  const meaningfulSizes = sizes.filter((s) => s.chars / mainChars > 0.003);

  // Spacing system: every non-zero padding, margin and gap.
  const spacing = {};
  for (const e of els) {
    for (const v of [...e.padding, ...e.margin, ...e.gap]) {
      if (v > 0 && v < 400) {
        const k = Math.round(v * 10) / 10;
        spacing[k] = (spacing[k] || 0) + 1;
      }
    }
  }
  const spacingValues = Object.entries(spacing).map(([value, count]) => ({ value: +value, count })).sort((a, b) => a.value - b.value);
  const spacingTotal = spacingValues.reduce((s, v) => s + v.count, 0) || 1;
  const onGrid = spacingValues.filter((v) => Number.isInteger(v.value) && v.value % 4 === 0).reduce((s, v) => s + v.count, 0);

  // Palette: text, backgrounds and borders, weighted by visual area.
  const weighted = [];
  for (const e of els) {
    const area = e.rect.w * e.rect.h;
    const bg = parseColor(e.bg);
    if (bg && bg.a > 0.5) weighted.push({ color: bg, weight: area / 1000 });
    const fg = parseColor(e.color);
    if (fg && fg.a > 0.5 && e.textLength) weighted.push({ color: fg, weight: e.textLength * 4 });
    const bc = parseColor(e.borderColor);
    if (bc && bc.a > 0.5) weighted.push({ color: bc, weight: (e.rect.w + e.rect.h) / 50 });
    for (const gc of colorsIn(e.bgImage)) if (gc.a > 0.3) weighted.push({ color: gc, weight: area / 1000 });
  }
  const palette = clusterColors(weighted);
  const paletteWeight = palette.reduce((s, c) => s + c.weight, 0) || 1;
  const chromatic = palette.filter((c) => c.lab.C > 0.04 && c.weight / paletteWeight > 0.002);

  return {
    fonts,
    totalChars,
    mainChars,
    sizes,
    meaningfulSizes,
    bodySize,
    spacingValues,
    spacingOnGridRatio: onGrid / spacingTotal,
    distinctSpacing: spacingValues.filter((v) => v.count / spacingTotal > 0.005).length,
    palette,
    chromatic,
  };
}
