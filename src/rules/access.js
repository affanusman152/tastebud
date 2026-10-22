// Access rules: structure and interaction basics that the best-built sites
// all get right. The structural benchmarks (skip link, one h1, main landmark,
// no skipped heading levels) come from accessibility trees captured with an
// inspection tool on GOV.UK and Primer (docs/RESEARCH.md). Deeper checks come from axe-core.

export default [
  {
    id: 'focus-visible',
    title: 'No visible keyboard focus',
    severity: 'error',
    check({ focus }) {
      if (!focus || !focus.tested) return [];
      if (!focus.invisible.length) return [];
      return [{
        message: `${focus.invisible.length} of ${focus.tested} elements reached with Tab show no visible focus: ${focus.invisible.slice(0, 4).map((t) => `"${t}"`).join(', ')}.`,
        why: 'Keyboard users (and many power users) navigate with Tab. Without a focus ring they cannot see where they are. This fails WCAG 2.4.7.',
        fix: 'Never remove outlines without a replacement. Add :focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }.',
      }];
    },
  },
  {
    id: 'horizontal-scroll',
    title: 'Page scrolls sideways',
    severity: 'error',
    check({ snap }) {
      if (snap.scrollWidth <= snap.viewport.w + 2) return [];
      return [{
        message: `Content is ${snap.scrollWidth}px wide in a ${snap.viewport.w}px viewport.`,
        why: 'Sideways scrolling on a phone hides content and feels broken. WCAG 1.4.10 requires content to reflow at 320px width.',
        fix: 'Find the widest element (often an image, table or fixed width). Use max-width: 100% on media and let flex/grid items wrap.',
      }];
    },
  },
  {
    id: 'viewport-meta',
    title: 'Missing mobile viewport',
    severity: 'warn',
    check({ snap }) {
      if (snap.hasViewportMeta) return [];
      return [{
        message: 'There is no <meta name="viewport"> tag.',
        why: 'Without it, phones render the page as a zoomed-out desktop site.',
        fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
      }];
    },
  },
  {
    id: 'tiny-targets',
    title: 'Tap targets too small',
    severity: 'warn',
    check({ snap }) {
      const tiny = snap.interactive.filter((t) => !t.inline && t.w < 24 && t.h < 24 && t.w > 4 && t.h > 4);
      if (!tiny.length) return [];
      return [{
        message: `${tiny.length} buttons or links are smaller than 24×24px: ${tiny.slice(0, 4).map((t) => `"${t.label || t.tag}" ${t.w}×${t.h}`).join(', ')}.`,
        why: 'Small targets are hard to hit with a finger or a shaky hand. WCAG 2.5.8 sets 24×24px as the minimum; Apple and Google recommend 44–48px.',
        fix: 'Give icon buttons padding so the clickable area is at least 24px (44px on touch screens), even if the icon stays small.',
      }];
    },
  },
  {
    id: 'one-h1',
    title: 'Page title heading',
    severity: 'warn',
    check({ snap }) {
      const n = snap.headings.filter((h) => h.level === 1).length;
      if (n === 1) return [];
      return [{
        message: n === 0 ? 'The page has no h1.' : `The page has ${n} h1 headings.`,
        why: 'Screen-reader users jump straight to the h1 to learn what a page is about. Every benchmark site has exactly one.',
        fix: n === 0 ? 'Mark the main page title as <h1>.' : 'Keep one h1 for the page title and demote the others to h2.',
      }];
    },
  },
  {
    id: 'heading-skip',
    title: 'Skipped heading levels',
    severity: 'warn',
    check({ snap }) {
      const jumps = [];
      for (let i = 1; i < snap.headings.length; i++) {
        const prev = snap.headings[i - 1].level;
        const cur = snap.headings[i].level;
        if (cur > prev + 1) jumps.push(`h${prev} → h${cur} ("${snap.headings[i].text.slice(0, 30)}")`);
      }
      if (!jumps.length) return [];
      return [{
        message: `Heading levels skip: ${jumps.slice(0, 3).join('; ')}.`,
        why: 'Headings are the table of contents for screen-reader users. Skipping levels makes the outline look broken. Usually it means a heading was picked for its size.',
        fix: 'Choose the heading level by structure, then style it with CSS to any size you like.',
      }];
    },
  },
  {
    id: 'main-landmark',
    title: 'No main landmark',
    severity: 'warn',
    check({ snap }) {
      if (snap.landmarks.main > 0) return [];
      return [{
        message: 'The page has no <main> element.',
        why: 'Assistive tech uses landmarks to jump between header, navigation, main content and footer.',
        fix: 'Wrap the primary content in <main>, navigation in <nav>, and use <header> and <footer>.',
      }];
    },
  },
  {
    id: 'skip-link',
    title: 'No skip link',
    severity: 'info',
    check({ snap }) {
      if (snap.skipLink || snap.landmarks.nav === 0 || snap.interactive.length < 10) return [];
      return [{
        message: 'There is no "Skip to main content" link.',
        why: 'Keyboard users must Tab through every navigation link on every page. All the benchmark design systems provide a skip link.',
        fix: 'Add <a href="#main" class="skip-link">Skip to main content</a> as the first element, visible on focus.',
      }];
    },
  },
];
