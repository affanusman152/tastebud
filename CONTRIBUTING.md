# Adding a rule

A rule is one object in `src/rules/taste.js`, `system.js` or `access.js`. Add it to the array and it runs on every audit.

```js
{
  id: 'all-caps-headings',          // kebab-case, unique
  title: 'Shouting headings',       // shown in reports
  severity: 'info',                 // error | warn | info
  defaults: { maxShare: 0.5 },      // optional, overridable in tastebud.config.json
  check({ snap, stats, options }) {
    const headings = snap.headings;
    const caps = headings.filter((h) => h.text.length > 3 && h.text === h.text.toUpperCase());
    if (headings.length < 3 || caps.length / headings.length <= options.maxShare) return [];
    return [{
      message: `${caps.length} of ${headings.length} headings are in capital letters.`,
      why: 'Words in all caps lose their shape, so they are slower to read, and screen readers may spell them out.',
      fix: 'Write headings in sentence case. Use size and weight for emphasis.',
    }];
  },
}
```

## What a rule gets

- **`snap`**: what the browser drew (see `src/collect.js`).
  - `elements`: every visible element, with `tag`, `text`, `textLength`, `rect`, `font` (`family`, `size`, `weight`, `lineHeight`), `color`, `bg`, `bgImage`, `radius`, `shadow`, `padding`, `margin`, `gap`, `textAlign`, and the `finePrint` and `code` flags.
  - Page structure: `headings`, `interactive`, `images`, `landmarks`, `skipLink`, `cardGroups`.
  - `bodyText`: all visible copy, minus `data-tastebud-ignore` regions.
  - Page facts: `viewport`, `scrollWidth`, `hasViewportMeta`.
- **`stats`**: derived numbers (see `src/analyze.js`): `fonts`, `sizes`, `meaningfulSizes`, `bodySize`, `spacingValues`, `palette`, `chromatic`.
- **`focus`**: the keyboard focus check result.
- **`options`**: your `defaults`, merged with the user's config.

## Good rules

- **Explain, don't scold.** Every finding needs a `why` a beginner understands and a `fix` they can act on.
- **Test on good sites first.** Run your rule on GOV.UK and Primer. If it fires there, the threshold is probably wrong. See [docs/RESEARCH.md](docs/RESEARCH.md).
- **Prefer `info` when it's taste.** Use `error` only when people are locked out.
- **Add a test** in `test/unit.test.js` with a small fake snapshot, then run `npm test`.
