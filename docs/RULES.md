# Rules

Severity: **error** (shown as FIX) stops some people from using the page. **warn** is worth fixing. **info** (shown as NOTE) is worth a conversation.

Each rule lowers its category score once, however many elements it flags: error −15, warn −10, info −3. The overall score is the average of the three categories.

Change any rule in `tastebud.config.json`:

```json
{ "rules": { "rule-id": "off" }, "options": { "rule-id": { "option": 0 } } }
```

## Taste

| Rule | Default | What it checks |
|---|---|---|
| `default-font` | info | Most text is in one of the most common default typefaces (Inter, Roboto, Arial, system UI…). Warns if the text is in the browser's unstyled fallback (Times New Roman). |
| `ai-gradient` | warn | A large element or text sits on a gradient whose colors all fall in the indigo–violet–pink band. |
| `card-grid-cliche` | warn | A row of 3–6 same-size boxes, each with an icon, a heading and a paragraph. |
| `cliche-copy` | warn | Phrases such as "seamless", "supercharge", "unlock the power", "cutting-edge". Info if only one is found. |
| `placeholder-content` | warn | Lorem ipsum, "Feature two", "Your company name", "John Doe", "Click here". |
| `emoji-icons` | info | Three or more headings or buttons start with an emoji. |
| `glass-overuse` | info | Four or more elements use a backdrop blur. |
| `centered-everything` | info | At least 70% of text blocks (6 or more) are center-aligned. |
| `unstyled-family-mix` | warn | More than three typefaces each set over 3% of the text (code and icon fonts excluded). |

## System

| Rule | Default | Options | What it checks |
|---|---|---|---|
| `type-scale-sprawl` | warn | `maxSizes` (12) | Number of distinct font sizes used for meaningful amounts of text. |
| `flat-hierarchy` | warn | `minRatio` (1.6) | Largest heading size divided by body text size. |
| `spacing-no-system` | info | `minFit` (0.5), `minSamples` (20) | Share of margins, paddings and gaps that fit the best base unit (4, 5, 6 or 8px). |
| `palette-sprawl` | info | `maxChromatic` (10) | Number of distinct non-gray colors. |
| `long-lines` | warn | `maxChars` (95) | Paragraphs wider than about 95 characters per line (code and fine print excluded). |
| `tight-line-height` | warn | `minRatio` (1.3) | Multi-line paragraphs with line height below 1.3× the font size. |
| `tiny-text` | warn | `minSize` (13), `maxShare` (0.25) | Share of main text smaller than 13px (fine print excluded). |

## Access

| Rule | Default | What it checks |
|---|---|---|
| `focus-visible` | error | Presses Tab up to 20 times and compares screenshots of each element focused and unfocused. |
| `horizontal-scroll` | error | The page is wider than the screen. |
| `viewport-meta` | warn | No `<meta name="viewport">`, so phones show a zoomed-out desktop page. |
| `tiny-targets` | warn | Buttons and links under 24×24px (inline text links excluded; labels count as part of a checkbox's target). Replaced by axe's `target-size` when axe reports it. |
| `one-h1` | warn | The page has no `h1`, or more than one. |
| `heading-skip` | warn | Heading levels jump, like `h2` to `h4`. |
| `main-landmark` | warn | No `<main>` element. |
| `skip-link` | info | A page with navigation and 10+ interactive elements has no "Skip to main content" link. |
| `a11y/*` | by impact | Every axe-core WCAG 2.0, 2.1 and 2.2 A/AA check. Critical and serious become errors, moderate a warning, minor a note. |

## Fine print, code and quotes

- Text in `footer`, `small`, or elements whose class mentions footnote, legal, disclaimer or fine-print is skipped by the size and line-length rules.
- Text in `pre`, `code`, `kbd` and `samp` is skipped by the line rules.
- Text inside any element with `data-tastebud-ignore` is skipped by the copy rules.
