// System rules: is there a type scale, a spacing scale and a palette, or
// were values picked one at a time? Thresholds are calibrated against
// GOV.UK, Primer, Carbon, Material 3, Apple, Stripe and Linear (docs/RESEARCH.md).

const SPACING_BASES = [4, 5, 6, 8];

export default [
  {
    id: 'type-scale-sprawl',
    title: 'No type scale',
    severity: 'warn',
    defaults: { maxSizes: 12 },
    check({ stats, options }) {
      const n = stats.meaningfulSizes.length;
      if (n <= options.maxSizes) return [];
      return [{
        message: `${n} different font sizes are in use: ${stats.meaningfulSizes.map((s) => `${s.size}px`).join(', ')}.`,
        why: 'Well-built design systems use 4–9 text sizes. When every element gets its own size, nothing feels related and hierarchy disappears.',
        fix: 'Choose a scale (for example 14 / 16 / 20 / 25 / 31 / 39, a 1.25 ratio) and snap every text size to it.',
      }];
    },
  },
  {
    id: 'flat-hierarchy',
    title: 'Flat hierarchy',
    severity: 'warn',
    defaults: { minRatio: 1.6 },
    check({ snap, stats, options }) {
      if (!snap.headings.length) return [];
      const biggest = Math.max(...snap.headings.map((h) => h.size));
      const ratio = biggest / stats.bodySize;
      if (ratio >= options.minRatio) return [];
      return [{
        message: `The largest heading (${biggest}px) is only ${ratio.toFixed(2)}× the body text (${stats.bodySize}px).`,
        why: 'Every design system we measured makes its main heading at least 2.5× the body size. Without contrast in size, readers cannot tell what to read first.',
        fix: 'Make the page title at least 2× the body size, and separate heading levels by size and weight, not color alone.',
      }];
    },
  },
  {
    id: 'spacing-no-system',
    title: 'No spacing scale',
    severity: 'info',
    defaults: { minFit: 0.5, minSamples: 20 },
    check({ stats, options }) {
      const values = stats.spacingValues;
      const total = values.reduce((s, v) => s + v.count, 0);
      if (total < options.minSamples) return [];
      let best = { base: 4, fit: 0 };
      for (const base of SPACING_BASES) {
        const fit = values.filter((v) => Number.isInteger(v.value) && v.value % base === 0).reduce((s, v) => s + v.count, 0) / total;
        if (fit > best.fit) best = { base, fit };
      }
      if (best.fit >= options.minFit) return [];
      const odd = values.filter((v) => !(Number.isInteger(v.value) && v.value % best.base === 0)).sort((a, b) => b.count - a.count).slice(0, 8);
      return [{
        message: `Only ${Math.round(best.fit * 100)}% of margins, paddings and gaps fit any common base unit (best: ${best.base}px). Off-scale values: ${odd.map((v) => `${v.value}px`).join(', ')}.`,
        why: 'A spacing scale makes layouts feel calm and aligned, and makes decisions faster. GOV.UK uses multiples of 5px; Primer and Carbon use multiples of 4 or 8.',
        fix: 'Pick a base (4px or 8px is most common) and a short scale (4, 8, 12, 16, 24, 32, 48, 64). Replace one-off values with the nearest step.',
      }];
    },
  },
  {
    id: 'palette-sprawl',
    title: 'Too many colors',
    severity: 'info',
    defaults: { maxChromatic: 10 },
    check({ stats, options }) {
      const n = stats.chromatic.length;
      if (n <= options.maxChromatic) return [];
      return [{
        message: `${n} distinct non-gray colors are in use.`,
        why: 'Design systems we measured use 2–4 brand colors on a page. When every element has its own hue, color stops signalling meaning (action, error, success).',
        fix: 'Define roles: one accent for actions, plus status colors (error, success, warning) and neutrals. Map every color to a role.',
      }];
    },
  },
  {
    id: 'long-lines',
    title: 'Lines too long to read',
    severity: 'warn',
    defaults: { maxChars: 95 },
    check({ snap, options }) {
      const long = snap.elements.filter((e) => !e.finePrint && !e.code && e.textLength > 200 && e.rect.w / (e.font.size * 0.5) > options.maxChars);
      if (long.length < 2) return [];
      const worst = Math.max(...long.map((e) => Math.round(e.rect.w / (e.font.size * 0.5))));
      return [{
        message: `${long.length} paragraphs run to about ${worst} characters per line.`,
        why: 'Readers lose their place when lines exceed roughly 75–90 characters; the eye struggles to find the start of the next line.',
        fix: 'Cap text width with max-width: 65ch to 75ch on paragraphs.',
      }];
    },
  },
  {
    id: 'tight-line-height',
    title: 'Cramped line height',
    severity: 'warn',
    defaults: { minRatio: 1.3 },
    check({ snap, options }) {
      const lineHeight = (e) => e.font.lineHeight ?? e.font.size * 1.2;
      // At least two rendered lines.
      const paras = snap.elements.filter((e) => !e.code && e.textLength > 120 && e.rect.h >= lineHeight(e) * 1.8);
      const tight = paras.filter((e) => lineHeight(e) / e.font.size < options.minRatio);
      if (tight.length < 2 || tight.length / paras.length < 0.3) return [];
      return [{
        message: `${tight.length} multi-line paragraphs have a line height under ${options.minRatio}×.`,
        why: 'Paragraph text needs room between lines to be readable. WCAG 1.4.12 tests readability at 1.5× line height.',
        fix: 'Use line-height: 1.5 for body text and around 1.1–1.25 for large headings.',
      }];
    },
  },
  {
    id: 'tiny-text',
    title: 'Text too small',
    severity: 'warn',
    defaults: { minSize: 13, maxShare: 0.25 },
    check({ stats, options }) {
      const small = stats.sizes.filter((s) => s.size < options.minSize).reduce((s, x) => s + x.chars, 0);
      const share = small / stats.mainChars;
      if (share <= options.maxShare) return [];
      return [{
        message: `${Math.round(share * 100)}% of the text is smaller than ${options.minSize}px.`,
        why: 'Small text is hard to read on phones and for anyone with low vision. Body text is usually 16px or more.',
        fix: 'Set body text to at least 16px. Keep 12–13px for captions and legal text only.',
      }];
    },
  },
];
