# How the rules were calibrated

A design linter is only useful if it stays quiet on good work. Before setting any threshold, we measured real, respected design systems and well-known sites, then ran every rule against them and fixed the false alarms.

Measured in October 2026 at 1440×900 in Microsoft Edge (Chromium).

## Sites measured

| Site | Why it's here |
|---|---|
| [GOV.UK Design System](https://design-system.service.gov.uk/) | Famous for accessibility and plain design |
| [GitHub Primer](https://primer.style/) | A mature product design system |
| [IBM Carbon](https://carbondesignsystem.com/) | A large enterprise design system |
| [Material 3](https://m3.material.io/) | Google's design system |
| Apple, Stripe, Linear | Widely admired marketing sites with strong visual identities |

## Structure and accessibility

We captured the accessibility tree (the version of the page that screen readers use) of GOV.UK and Primer with an inspection tool. Both had:

- **Zero** buttons or links without an accessible name.
- A **"Skip to main content"** link as the first focusable element.
- Exactly **one `h1`**.
- A **`main` landmark**.
- **No skipped heading levels** (no `h2` followed straight by `h4`).

These became the `skip-link`, `one-h1`, `main-landmark` and `heading-skip` rules. Carbon redirected before loading during capture, so it isn't part of this set.

## Visual measurements

| Measure | Design systems | Marketing sites | Rule decision |
|---|---|---|---|
| Distinct text sizes in use | 3–9 | 11–13 (Stripe, Linear) | `type-scale-sprawl` warns above **12** |
| Largest heading ÷ body text | always ≥ 2.5× | ≥ 3.5× | `flat-hierarchy` warns below **1.6×** |
| Spacing on a common base | GOV.UK: multiples of **5px**; Primer, Carbon: 4px/8px | Mixed | `spacing-no-system` finds the best base among 4, 5, 6 and 8px instead of assuming 4px |
| Brand colors (non-gray) | 2–4 | Up to 19 (Stripe) | `palette-sprawl` notes above **10** |
| Rows of 3 identical icon + title + text cards | 0 | 0 | `card-grid-cliche` warns when found |

A plain "is it on a 4px grid?" check would have flagged GOV.UK, which uses a 5px system on purpose. That's why the spacing rule detects the base unit.

## False alarms found and fixed

| What went wrong | Fix |
|---|---|
| The focus check flagged GOV.UK and Primer, which have excellent focus styles drawn on wrappers or added by JavaScript | The check now compares **screenshots** before and after focus (tight crop, then the whole viewport), after turning off transitions and waiting for scripts |
| Text inside collapsed menus counted as visible | Content clipped by a parent, or inside a closed `<details>`, is ignored |
| Apple's 12px legal footnotes triggered "text too small" | Footers, `<small>` and footnote/legal sections are excluded from size and line-length rules |
| "example.com" in code samples counted as placeholder content | Removed from the placeholder list |
| Code samples triggered "lines too long" | `pre` and `code` are excluded from prose rules |
| A radio button inside a 44px label counted as a 13px target | The label counts as part of the target |
| Strict security headers blocked the accessibility engine | Pages are loaded with CSP bypass, for auditing only |

## Results after calibration

| Page | Overall | Taste | System | Access |
|---|---|---|---|---|
| GOV.UK Design System | 100 | 100 | 100 | 100 |
| GitHub Primer | 100 | 100 | 100 | 100 |
| Apple | 77 | 97 | 97 | 37 |
| Linear | 72 | 80 | 100 | 35 |
| Stripe | 71 | 80 | 77 | 57 |
| `examples/good-landing.html` | 100 | 100 | 100 | 100 |
| `examples/generic-landing.html` | 39 | 51 | 67 | 0 |

The low Access scores for Apple, Linear and Stripe come from real failures reported by axe-core (mostly color contrast and target size). They're a good discussion point: a page can be beautiful and still shut people out.

Sites change. These numbers describe the pages on the day they were measured.
