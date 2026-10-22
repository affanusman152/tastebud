// Renders an audit as one self-contained HTML file: no web fonts, no CDN,
// screenshot embedded, works offline and prints cleanly. The report is held
// to its own rules: `tastebud audit` on a report should come back clean.
import { CATEGORIES } from '../rules/index.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const SEVERITY = { error: 'Fix', warn: 'Warn', info: 'Note' };

// "Template-y, loose, and full of barriers." The verdict, as a sentence.
const PHRASE = {
  taste: { Distinctive: 'distinctive', 'Some defaults': 'a little default', 'Template-y': 'template-y' },
  system: { Systematic: 'systematic', Loose: 'loose', 'Ad hoc': 'ad hoc' },
  access: { Inclusive: 'open to everyone', Gaps: 'missing some people', Barriers: 'full of barriers' },
};

export function verdict(categories) {
  const words = ['taste', 'system', 'access'].map((k) => PHRASE[k][categories[k].label]);
  const allGood = categories.taste.label === 'Distinctive' && categories.system.label === 'Systematic' && categories.access.label === 'Inclusive';
  const sentence = `${words[0]}, ${words[1]}, and ${words[2]}.`;
  return { text: sentence[0].toUpperCase() + sentence.slice(1), allGood };
}

function findingRow(f, i) {
  const examples = (f.examples || []).map((e) => `<li><code>${esc(e.target)}</code></li>`).join('');
  return `
      <li class="finding sev-${f.severity}">
        <span class="sev">${SEVERITY[f.severity]}</span>
        <div class="body">
          <h3>${esc(f.title)}</h3>
          <p class="msg" data-tastebud-ignore>${esc(f.message)}</p>
          <details id="f-${i}" data-tastebud-ignore>
            <summary>Why it matters and how to fix it</summary>
            ${f.why ? `<p><strong>Why.</strong> ${esc(f.why)}</p>` : ''}
            ${f.fix ? `<p><strong>Fix.</strong> ${esc(f.fix)}</p>` : ''}
            ${examples ? `<p>Where:</p><ul class="where">${examples}</ul>` : ''}
            ${f.learnMore ? `<p><a href="${esc(f.learnMore)}">Read the full guidance</a></p>` : ''}
            <p class="rule-id">Rule: <code>${esc(f.rule)}</code></p>
          </details>
        </div>
      </li>`;
}

function readout(design) {
  const fonts = design.fonts
    .map((f) => `<li><span class="font-name">${esc(f.family)}</span><span class="bar"><span style="width:${Math.max(2, Math.round(f.share * 100))}%"></span></span><span class="num">${Math.round(f.share * 100)}%</span></li>`)
    .join('');
  const palette = design.palette
    .map((c) => `<li><span class="swatch" style="background:${esc(c.hex)}"></span><code>${esc(c.hex)}</code></li>`)
    .join('');
  const sizes = design.typeScale
    .map((s) => `<li><span class="sample" style="font-size:${Math.min(s.size, 64)}px">Aa</span><span class="num">${s.size}px${s.size === design.bodySize ? ' (body)' : ''}</span></li>`)
    .join('');
  const maxCount = Math.max(1, ...design.spacing.map((v) => v.count));
  const spacing = design.spacing
    .slice(0, 24)
    .map((v) => `<li><span class="num">${v.value}</span><span class="bar"><span style="width:${Math.max(2, Math.round((v.count / maxCount) * 100))}%"></span></span></li>`)
    .join('');
  const headings = design.headings
    .map((h) => `<li style="margin-left:${(Math.min(h.level, 6) - 1) * 16}px"><span class="num">h${h.level}</span> ${esc(h.text) || '<em>(empty)</em>'}</li>`)
    .join('');
  return `
    <section class="readout" aria-labelledby="readout-title">
      <h2 id="readout-title">What the page is made of</h2>
      <p class="lead">Measured from what the browser actually drew, not from the source code.</p>
      <div class="readout-grid">
        <div><h3>Typefaces</h3><ul class="fonts">${fonts || '<li>No text found.</li>'}</ul></div>
        <div><h3>Colors in use</h3><ul class="palette">${palette}</ul></div>
        <div><h3>Text sizes</h3><ul class="sizes">${sizes}</ul></div>
        <div><h3>Spacing values <span class="hint">(px, longer bar = used more)</span></h3><ul class="spacing">${spacing}</ul></div>
        <div class="outline"><h3>Heading outline</h3><ul data-tastebud-ignore>${headings || '<li>No headings found.</li>'}</ul></div>
      </div>
    </section>`;
}

const CSS = `
:root {
  --page: #f1eff3; --surface: #ffffff; --ink: #1e1a24; --muted: #5d5566; --line: #ddd8e2;
  --accent: #c0265e; --fix: #a1201c; --warn: #855000; --note: #405670; --focus: #1b5fbf;
  --display: Bahnschrift, "DIN Alternate", "Barlow", "D-DIN", "Roboto Condensed", sans-serif;
  --text: "Sitka Text", Charter, "Bitstream Charter", Cambria, Georgia, serif;
  --mono: Consolas, "SF Mono", Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root { --page: #17141b; --surface: #211d27; --ink: #f1edf4; --muted: #b3aabd; --line: #3a3443;
    --accent: #ff7aa8; --fix: #ff8a80; --warn: #f2b84b; --note: #9cb7d6; --focus: #8ab4ff; }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--page); color: var(--ink); font: 17px/1.6 var(--text); }
a { color: var(--accent); }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; border-radius: 2px; }
.skip { position: absolute; left: 16px; top: -100px; background: var(--ink); color: var(--page); padding: 8px 16px; font-family: var(--display); }
.skip:focus { top: 16px; }
h1, h2, h3, h4, .sev, .num, .brand, summary, .score b { font-family: var(--display); }
code { font-family: var(--mono); font-size: 0.85em; }
.wrap { max-width: 1240px; margin: 0 auto; padding: 0 24px; }

header.top { padding: 24px 0 0; }
.brand { margin: 0; font-size: 20px; font-weight: 700; color: var(--accent); letter-spacing: 0.01em; }
.checked { margin: 4px 0 0; color: var(--muted); font-size: 15px; overflow-wrap: anywhere; }

.verdict { padding-block: 40px 32px; }
.verdict h1 { font-size: clamp(36px, 6vw, 72px); line-height: 1.02; font-weight: 600; font-stretch: condensed; margin: 0; max-width: 18ch; letter-spacing: -0.01em; }
.verdict p { color: var(--muted); max-width: 60ch; margin: 16px 0 0; }
.scores { display: flex; flex-wrap: wrap; gap: 8px 40px; margin: 32px 0 0; padding: 0; list-style: none; }
.score { display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: baseline; }
.score b { font-size: 48px; line-height: 1; font-weight: 600; font-variant-numeric: tabular-nums; }
.score span { font-family: var(--display); font-size: 16px; }
.score small { grid-column: 2; color: var(--muted); font-size: 14px; font-family: var(--text); }
.score.overall b { color: var(--accent); }

.layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 48px; align-items: start; padding-block: 24px 64px; border-top: 2px solid var(--ink); }
.cat { margin: 0 0 40px; }
.cat h2 { font-size: 28px; margin: 24px 0 4px; font-weight: 600; }
.cat > p { margin: 0 0 16px; color: var(--muted); }
.findings { list-style: none; margin: 0; padding: 0; }
.finding { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 16px; padding: 16px 0; border-top: 1px solid var(--line); }
.sev { font-size: 15px; font-weight: 700; padding-top: 2px; }
.sev-error .sev { color: var(--fix); }
.sev-warn .sev { color: var(--warn); }
.sev-info .sev { color: var(--note); }
.finding h3 { margin: 0; font-size: 19px; font-weight: 600; }
.msg { margin: 4px 0 8px; max-width: 70ch; overflow-wrap: anywhere; }
details { max-width: 70ch; }
summary { cursor: pointer; color: var(--accent); font-size: 16px; min-height: 32px; display: inline-flex; align-items: center; }
details p { margin: 8px 0; }
.where { margin: 4px 0 8px; padding-left: 20px; overflow-wrap: anywhere; }
.rule-id { color: var(--muted); font-size: 14px; }
.clean { padding: 16px 0; border-top: 1px solid var(--line); color: var(--muted); }

.specimen { position: sticky; top: 24px; }
.specimen h2 { font-size: 20px; margin: 24px 0 8px; font-weight: 600; }
.specimen figure { margin: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 8px; max-height: calc(100vh - 120px); overflow: auto; }
.specimen img { display: block; width: 100%; height: auto; border-radius: 2px; }
.specimen figcaption { font-size: 14px; color: var(--muted); padding: 8px 4px 0; }

.readout { padding-block: 40px 64px; border-top: 2px solid var(--ink); }
.readout h2 { font-size: 28px; margin: 0; font-weight: 600; }
.readout .lead { color: var(--muted); margin: 4px 0 24px; }
.readout-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 32px 48px; }
.readout h3 { font-size: 18px; margin: 0 0 12px; font-weight: 600; }
.hint { font-weight: 400; color: var(--muted); font-size: 14px; }
.readout ul { list-style: none; margin: 0; padding: 0; }
.fonts li, .spacing li { display: grid; grid-template-columns: 140px 1fr 48px; gap: 12px; align-items: center; margin-bottom: 8px; font-size: 15px; }
.spacing li { grid-template-columns: 48px 1fr; }
.font-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar { height: 8px; background: var(--line); border-radius: 4px; overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--ink); }
.num { font-size: 14px; color: var(--muted); font-variant-numeric: tabular-nums; }
.palette { display: flex; flex-wrap: wrap; gap: 12px; }
.palette li { display: grid; gap: 4px; justify-items: start; font-size: 13px; }
.swatch { width: 56px; height: 40px; border-radius: 4px; border: 1px solid var(--line); }
.sizes li { display: flex; align-items: baseline; gap: 16px; border-bottom: 1px solid var(--line); padding: 4px 0; }
.sample { font-family: var(--display); line-height: 1.1; min-width: 64px; }
.outline li { margin-bottom: 4px; font-size: 15px; }

footer.bottom { padding: 24px 0 48px; color: var(--muted); font-size: 15px; border-top: 1px solid var(--line); }
footer.bottom p { margin: 0 0 8px; max-width: 70ch; }

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .specimen { position: static; order: -1; }
  .specimen figure { max-height: 420px; }
}
@media print {
  body { background: #fff; color: #000; }
  .specimen { position: static; }
  .specimen figure { max-height: none; }
  .skip, summary { display: none; }
  details > *:not(summary) { display: block; }
}
`;

export function renderHtml(report) {
  const v = verdict(report.categories);
  const total = report.findings.length;
  const cats = Object.entries(CATEGORIES)
    .map(([key, meta]) => {
      const items = report.findings.filter((f) => f.category === key);
      const start = report.findings.indexOf(items[0]);
      return `
    <section class="cat" aria-labelledby="cat-${key}">
      <h2 id="cat-${key}">${meta.label}: ${report.categories[key].score}</h2>
      <p>${esc(meta.blurb)}</p>
      ${items.length ? `<ol class="findings">${items.map((f, i) => findingRow(f, start + i)).join('')}</ol>` : '<p class="clean">Nothing flagged here.</p>'}
    </section>`;
    })
    .join('');

  const when = new Date(report.auditedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const intro = v.allGood
    ? 'Nothing in this audit needs attention. Look at the readout below to see the system the page is built on.'
    : `${total} thing${total === 1 ? '' : 's'} to look at. Start with anything marked Fix: those stop some people from using the page. Then work through Warn. Notes are worth a conversation, not always a change.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>tastebud report: ${esc(report.title || report.url)}</title>
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to the findings</a>
<header class="top">
  <div class="wrap">
    <p class="brand">tastebud</p>
    <p class="checked" data-tastebud-ignore>Checked <a href="${esc(report.url)}">${esc(report.title || report.url)}</a> at ${report.device === 'mobile' ? 'phone' : 'desktop'} size (${report.viewport.w}×${report.viewport.h}) on ${esc(when)}.</p>
  </div>
</header>
<main id="main">
  <section class="verdict wrap" aria-labelledby="verdict">
    <h1 id="verdict">${esc(v.text)}</h1>
    <p>${esc(intro)}</p>
    <ul class="scores" aria-label="Scores out of 100">
      <li class="score overall"><b>${report.score}</b><span>Overall</span><small>average of the three</small></li>
      ${Object.entries(CATEGORIES).map(([k, meta]) => `<li class="score"><b>${report.categories[k].score}</b><span>${meta.label}</span><small>${esc(report.categories[k].label)}</small></li>`).join('')}
    </ul>
  </section>
  <div class="wrap layout">
    <div class="findings-col">${cats}</div>
    ${report.screenshot ? `
    <aside class="specimen" aria-labelledby="specimen-title">
      <h2 id="specimen-title">The page as tastebud saw it</h2>
      <figure>
        <img src="${report.screenshot}" alt="Screenshot of ${esc(report.title || report.url)} as rendered during the audit">
        <figcaption>Scroll inside the frame to see more of the page.</figcaption>
      </figure>
    </aside>` : ''}
  </div>
  <div class="wrap">${readout(report.design)}</div>
</main>
<footer class="bottom">
  <div class="wrap">
    <p>Made by tastebud ${esc(report.version)} in ${(report.durationMs / 1000).toFixed(1)} seconds. Accessibility checks use axe-core.</p>
    <p>Scores are prompts for a design conversation, not a verdict on anyone's talent. A rule can be wrong for your page: if you broke it on purpose and can say why, that is a decision, not a mistake.</p>
  </div>
</footer>
</body>
</html>`;
}
