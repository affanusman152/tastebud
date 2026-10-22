# Workshop: from template to taste

About 60–90 minutes. Works alone or in pairs. No coding experience needed for parts 1–3.

## Before you start

- Node.js is installed ([nodejs.org](https://nodejs.org/), LTS version).
- You've double-clicked `tastebud.bat` once, so its parts are downloaded.
- A code editor helps for part 3. Notepad works; [VS Code](https://code.visualstudio.com/) is nicer.

## Part 1: Read a report (10 minutes)

1. Double-click `tastebud.bat`.
2. Drag `examples/generic-landing.html` into the window and press Enter.
3. Read the headline at the top of the report. It's the verdict in one sentence.

Discuss:
- Which finding surprised you most?
- Which would a real user notice first? Which would they never notice but still feel?
- Pick one **Note**. Do you agree it's a problem? When might it be the right choice?

## Part 2: Spot it yourself (15 minutes)

Open `examples/generic-landing.html` in your browser. Before looking at the report again, write down:

- Three things that make it look like a template.
- One thing that would stop someone using it with a keyboard only. Hint: press Tab a few times.
- One sentence of copy that could describe any product in the world.

Then open `examples/good-landing.html`. It's the same product. For each item on your list, find how the good version handles it differently. The comments in its source code explain each choice.

## Part 3: Fix it (30–45 minutes)

Make a copy of `generic-landing.html` called `my-landing.html` and improve it. Re-run tastebud after each change.

Suggested order, from biggest effect to smallest:

1. **Fix the FIX items first.** These lock people out. Start with focus (remove `outline: none`), contrast and the missing `lang`.
2. **Rewrite the copy.** Replace every cliché with something specific to a pottery studio. What does the product actually do? For whom?
3. **Choose a type scale and a spacing scale.** Copy the variables from `frames/tokens.css` and replace every one-off size.
4. **Replace the three cards.** Look at the "Ranked features" frame in the gallery: open `frames/index.html` in your browser.
5. **Make one bold choice.** Pick a color from the subject (glaze, clay, kiln fire) instead of the purple gradient.

When you're done, put the two reports side by side in your browser. If you use the command line, tastebud can list exactly what changed:

```
node bin/tastebud.js compare tastebud-report/generic-landing.json tastebud-report/my-landing.json
```

## Part 4: Share (10 minutes)

Show your page next to the original. Explain one change you made because of a finding, and one finding you decided to ignore, and why.

## Going further

- Check a site you use every day. Does a famous site score better than you expected, or worse?
- Run the same page with `--mobile`. What breaks at phone size?
- Write your own rule. See [CONTRIBUTING.md](../CONTRIBUTING.md).
- Read [ETHICS.md](ETHICS.md) before you study someone else's site.
