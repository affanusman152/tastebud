# tastebud

A spell-checker for design. Point it at a web page and it tells you, in plain words, where the page looks generic, where it has no system, and where people get locked out, plus why each one matters and how to fix it.

It gives every page three scores:

| Score | The question it answers | Example of what it catches |
|---|---|---|
| **Taste** | Does it look like every other template? | The purple-blue gradient, three identical feature cards, "seamless" and "supercharge", emoji as icons |
| **System** | Do type, spacing and color follow a plan? | 14 different font sizes, random spacing values, lines too long to read |
| **Access** | Can everyone read, reach and use it? | Faint text, buttons too small to tap, no visible keyboard focus, images without descriptions |

Scores are prompts for a design conversation, not a verdict. Every rule can be wrong for your page: if you broke it on purpose and can say why, that's a decision, not a mistake.

## Start here (no coding needed, Windows)

1. Install **Node.js** (the LTS version) from [nodejs.org](https://nodejs.org/). You only do this once.
2. Download this project and unzip it.
3. Double-click **`tastebud.bat`**.
   - The first time, it downloads a few parts. That needs internet once and takes about a minute.
4. Paste a website link (or drag an `.html` file into the window) and press Enter.
5. Your report opens in the browser.

You can also drag an `.html` file straight onto `tastebud.bat`.

tastebud uses the Edge or Chrome that's already on your computer, so there's no big browser download.

## Try the workshop example

In the `examples` folder there are two versions of the same page for a made-up pottery studio app called Kiln:

- `generic-landing.html`: built with every default and cliché. It scores **39**.
- `good-landing.html`: the same product, designed with care, with comments explaining each choice. It scores **100**.

Check the generic one, fix what the report finds, and check it again to watch the scores move.

## For coders

```bash
npm install
node bin/tastebud.js audit examples/generic-landing.html --open
```

To get a `tastebud` command you can use anywhere, run `npm install --global .` inside this folder. Then:

```bash
tastebud audit https://your-site.dev --why        # explanations in the terminal
tastebud audit index.html --mobile                # check at phone size (390×844)
tastebud compare tastebud-report/before.json tastebud-report/after.json
tastebud rules                                    # every rule and what it checks
tastebud frames                                   # open the gallery of well-made UI pieces
```

Reports are saved to `tastebud-report/` as an HTML page you can share and a JSON file for scripts.

| Option | What it does |
|---|---|
| `--mobile` | Check at phone size instead of desktop |
| `--open` | Open the HTML report when done |
| `--why` | Show why each finding matters and how to fix it |
| `--out <folder>` | Save reports somewhere else |
| `--json` | Print the full result as JSON |
| `--strict` | Exit with code 1 if anything is marked FIX (for CI) |
| `--config <file>` | Use a config file |
| `--no-axe` / `--no-screenshot` | Skip the accessibility engine / the screenshot |

### Checking a local dev server

```bash
tastebud audit localhost:5173
```

### In CI

```yaml
- run: npm install --global ./tools/tastebud
- run: tastebud audit http://localhost:4173 --strict --no-screenshot
```

### Config

Put a `tastebud.config.json` next to where you run it:

```json
{
  "rules": { "default-font": "off", "card-grid-cliche": "error" },
  "options": { "type-scale-sprawl": { "maxSizes": 10 } }
}
```

Each rule can be `"off"`, `"info"`, `"warn"` or `"error"`. See [docs/RULES.md](docs/RULES.md) for every rule and its options.

### Quoting bad copy on purpose

If your page shows bad examples on purpose (a style guide, a lesson), add `data-tastebud-ignore` to that element and the copy rules will skip its text:

```html
<ul data-tastebud-ignore><li>"Click here"</li><li>"Lorem ipsum"</li></ul>
```

## The frames gallery

`frames/index.html` is a set of common interface moments done properly: buttons with every state, a form field with a helpful error, empty, loading and error states, navigation, a data table, ranked features and a confirmation message. Each one shows why it works, the generic version to avoid, and code you can copy. They all read from `frames/tokens.css`, so changing one color restyles every frame.

## Works offline

Checking a local `.html` file needs no internet. The browser is already on your computer, the accessibility engine (axe-core) is bundled, and the report is a single file with no web fonts or online parts. Checking a live website needs internet, of course.

## How it works

tastebud opens the page in a real browser and reads what was actually drawn: every element's font, size, color and spacing, plus the page structure. It presses Tab like a keyboard user and compares screenshots to see if focus is visible. It runs [axe-core](https://github.com/dequelabs/axe-core), the industry-standard accessibility engine, then applies its own rules.

The thresholds were calibrated by measuring real design systems (GOV.UK, GitHub Primer, IBM Carbon, Material 3) and well-known sites, so the rules don't flag good work. See [docs/RESEARCH.md](docs/RESEARCH.md).

## What it can't do

- It can't tell whether a design was made by AI. It spots common defaults, and people use those too.
- It can't judge whether a design fits its audience, brand or purpose. That's your job.
- It checks one page at one size per run. It doesn't click through flows or log in.
- A clean report doesn't guarantee a page is fully accessible. Test with real people and real assistive technology too.

## More

- [docs/WORKSHOP.md](docs/WORKSHOP.md): the workshop exercise, step by step
- [docs/ETHICS.md](docs/ETHICS.md): study other people's work without copying it
- [docs/RULES.md](docs/RULES.md): every rule, what it checks, and its options
- [CONTRIBUTING.md](CONTRIBUTING.md): add your own rule

MIT licensed. See [LICENSE](LICENSE).
