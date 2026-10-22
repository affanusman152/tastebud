// Taste rules: patterns that make a UI look like every other template.
// None of these are "wrong". They are defaults, and defaults should be choices.
import { colorsIn, toOklab, primaryFamily } from '../analyze.js';

const DEFAULT_FONTS = ['inter', 'roboto', 'arial', 'helvetica', 'helvetica neue', 'open sans', 'poppins', 'montserrat', 'lato', 'segoe ui', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'sans-serif'];
const UNSTYLED_FONTS = ['times new roman', 'times', 'serif'];

export const CLICHE_PHRASES = [
  'unlock the power', 'unleash', 'supercharge', 'revolutionize', 'revolutionise', 'elevate your', 'take your .{1,20} to the next level',
  'seamless', 'seamlessly', 'game[- ]changer', 'cutting[- ]edge', 'next[- ]gen', 'state[- ]of[- ]the[- ]art', 'all[- ]in[- ]one platform',
  'empower', 'harness the power', 'transform the way you', 'built for the future', 'designed for the modern', 'effortless(ly)?',
  'blazing(ly)? fast', 'lightning[- ]fast', 'world[- ]class', 'best[- ]in[- ]class', 'robust solution', 'leverage', 'synergy',
  'in today.s fast[- ]paced', 'look no further', 'join thousands of', 'trusted by (thousands|millions)',
];

const PLACEHOLDERS = [/lorem ipsum/i, /dolor sit amet/i, /\bfeature (one|two|three|[123])\b/i, /\byour (company|brand|logo) (name|here)\b/i, /\bcompany name\b/i, /\b(john|jane) doe\b/i, /\btitle goes here\b/i, /\bplaceholder text\b/i, /\bTODO\b/, /\bclick here\b/i];

export default [
  {
    id: 'default-font',
    title: 'Default typeface',
    severity: 'info',
    check({ stats }) {
      const top = stats.fonts[0];
      if (!top) return [];
      const fam = top.family.toLowerCase();
      if (UNSTYLED_FONTS.includes(fam)) {
        return [{
          severity: 'warn',
          message: `Most text is in "${top.family}", the browser's fallback font. The page looks unstyled.`,
          fix: 'Set a font-family on body. Pick one typeface with real personality for headings and a calm one for body text.',
        }];
      }
      if (!DEFAULT_FONTS.includes(fam)) return [];
      const share = Math.round((100 * top.chars) / stats.totalChars);
      const second = stats.fonts[1] && stats.fonts[1].chars / stats.totalChars > 0.05 ? stats.fonts[1].family : null;
      return [{
        message: `${share}% of text is set in ${top.family}${second ? ` (with ${second})` : ''}, one of the most common default typefaces.`,
        why: 'Defaults are not wrong, but when every product uses the same font, yours reads as a template before anyone sees the content.',
        fix: 'Keep it if it was a deliberate choice. Otherwise try a pairing: a characterful display face for headings (e.g. Fraunces, Space Grotesk, Instrument Serif) and a readable text face for body.',
      }];
    },
  },
  {
    id: 'ai-gradient',
    title: 'The purple-blue gradient',
    severity: 'warn',
    check({ snap }) {
      const hits = [];
      for (const e of snap.elements) {
        if (!e.bgImage || !/gradient/.test(e.bgImage)) continue;
        const stops = colorsIn(e.bgImage).filter((c) => c.a > 0.3).map(toOklab).filter((c) => c.C > 0.05);
        if (stops.length < 2) continue;
        const inBand = stops.every((c) => c.h >= 250 && c.h <= 345);
        const hues = stops.map((c) => c.h);
        const spread = Math.max(...hues) - Math.min(...hues);
        const big = e.rect.w * e.rect.h > 20000 || e.textLength > 0;
        if (inBand && spread >= 12 && big) hits.push(e);
      }
      if (!hits.length) return [];
      return [{
        message: `${hits.length} element${hits.length > 1 ? 's use' : ' uses'} an indigo/violet/pink gradient${hits[0].text ? ` (e.g. behind "${hits[0].text.slice(0, 40)}")` : ''}.`,
        why: 'Blue-to-purple gradients became the signature of generated and template UIs. Users have seen it a thousand times, so it reads as "no design decision was made here".',
        fix: 'Derive color from your brand or subject instead. If you want a gradient, try one hue shifting in lightness, or a hue pair that is not violet-indigo.',
      }];
    },
  },
  {
    id: 'card-grid-cliche',
    title: 'Three identical feature cards',
    severity: 'warn',
    check({ snap }) {
      if (!snap.cardGroups.length) return [];
      const g = snap.cardGroups[0];
      return [{
        message: `Found ${snap.cardGroups.length} row${snap.cardGroups.length > 1 ? 's' : ''} of ${g.count} same-size cards with icon + heading + text${g.titles.some(Boolean) ? `: ${g.titles.filter(Boolean).map((t) => `"${t}"`).join(', ')}` : ''}.`,
        why: 'Icon-title-blurb ×3 is the most reused layout on the web. Equal weight for every item also means nothing stands out, so readers skim past all of them.',
        fix: 'Rank the items. Give the most important one more space, use a real screenshot or example instead of an icon, or turn the list into a short narrative.',
      }];
    },
  },
  {
    id: 'cliche-copy',
    title: 'Marketing cliché copy',
    severity: 'warn',
    check({ snap }) {
      const text = snap.bodyText;
      const found = [];
      for (const p of CLICHE_PHRASES) {
        const m = text.match(new RegExp(`\\b${p}`, 'i'));
        if (m) found.push(m[0]);
      }
      if (!found.length) return [];
      return [{
        severity: found.length >= 2 ? 'warn' : 'info',
        message: `Generic phrases: ${found.slice(0, 6).map((f) => `"${f}"`).join(', ')}${found.length > 6 ? ` and ${found.length - 6} more` : ''}.`,
        why: 'Words like "seamless" and "supercharge" could describe any product, so they tell the reader nothing about yours. UX writing is part of the design.',
        fix: 'Replace each with a concrete claim: what it does, for whom, with a number if you have one. "Exports a 40-page report in 2 seconds" beats "blazing fast".',
      }];
    },
  },
  {
    id: 'placeholder-content',
    title: 'Placeholder content',
    severity: 'warn',
    check({ snap }) {
      const found = PLACEHOLDERS.map((re) => snap.bodyText.match(re)?.[0]).filter(Boolean);
      if (!found.length) return [];
      return [{
        message: `Placeholder text is still on the page: ${[...new Set(found)].slice(0, 5).map((f) => `"${f}"`).join(', ')}.`,
        why: 'Designing with fake content hides real problems: long names, empty fields, awkward line breaks. "Click here" also tells screen-reader users nothing.',
        fix: 'Use realistic content, including the awkward cases (a 40-character name, a missing photo). Write link text that says where it goes.',
      }];
    },
  },
  {
    id: 'emoji-icons',
    title: 'Emoji as icons',
    severity: 'info',
    check({ snap }) {
      const re = /^\p{Extended_Pictographic}/u;
      const hits = snap.headings.filter((h) => re.test(h.text)).length + snap.interactive.filter((t) => re.test(t.label)).length;
      if (hits < 3) return [];
      return [{
        message: `${hits} headings or buttons start with an emoji.`,
        why: 'Emoji render differently on every OS, cannot be styled to your palette, and are read aloud by screen readers ("rocket, Fast deploys").',
        fix: 'Use one consistent icon set (Lucide, Phosphor, Heroicons) with aria-hidden="true", or no icon at all.',
      }];
    },
  },
  {
    id: 'glass-overuse',
    title: 'Glassmorphism everywhere',
    severity: 'info',
    check({ snap }) {
      const n = snap.elements.filter((e) => e.backdrop && /blur/.test(e.backdrop)).length;
      if (n < 4) return [];
      return [{
        message: `${n} elements use a backdrop blur.`,
        why: 'Frosted glass is a strong effect. Used everywhere it lowers text contrast, costs GPU time on cheap phones, and stops meaning "this layer floats above".',
        fix: 'Keep blur for one floating layer (a nav bar or a modal). Use solid surfaces elsewhere.',
      }];
    },
  },
  {
    id: 'centered-everything',
    title: 'Everything centered',
    severity: 'info',
    check({ snap }) {
      const paras = snap.elements.filter((e) => e.textLength > 60);
      if (paras.length < 6) return [];
      const centered = paras.filter((e) => e.textAlign === 'center').length;
      if (centered / paras.length < 0.7) return [];
      return [{
        message: `${centered} of ${paras.length} text blocks are center-aligned.`,
        why: 'Centered text has a ragged left edge, so the eye has to hunt for the start of every line. It works for a short headline, not for paragraphs.',
        fix: 'Left-align body text. Keep centering for short headings, and use a strong left edge to make the layout feel deliberate.',
      }];
    },
  },
  {
    id: 'unstyled-family-mix',
    title: 'Too many typefaces',
    severity: 'warn',
    check({ stats }) {
      const used = stats.fonts.filter((f) => f.chars / stats.totalChars > 0.03 && !/mono|code|symbol|icon/i.test(f.family));
      if (used.length <= 3) return [];
      return [{
        message: `${used.length} typefaces each set more than 3% of the text: ${used.map((f) => primaryFamily(f.family)).join(', ')}.`,
        why: 'Each extra typeface is another voice. Past two or three, the page stops having one personality.',
        fix: 'Pick one family for headings and one for body. Use weight and size for variety instead of new fonts.',
      }];
    },
  },
];
