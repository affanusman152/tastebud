#!/usr/bin/env node
// tastebud: a design linter for the web.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from '../src/audit.js';
import { loadConfig } from '../src/config.js';
import { rules, CATEGORIES } from '../src/rules/index.js';
import { printReport, c } from '../src/report/terminal.js';
import { renderHtml } from '../src/report/html.js';
import { compareReports } from '../src/compare.js';
import { slugFor, openInBrowser } from '../src/cli-utils.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `
${c.bold('tastebud')}: a spell-checker for design

${c.bold('Usage')}
  tastebud audit <url or file.html> [options]   Check a page and write a report
  tastebud compare <before.json> <after.json>   See what changed between two audits
  tastebud rules                                List every rule and what it checks
  tastebud frames                               Open the gallery of well-made UI frames

${c.bold('Audit options')}
  --mobile           Check at phone size (390×844) instead of desktop
  --out <folder>     Where to save the report (default: tastebud-report)
  --open             Open the HTML report in your browser when done
  --why              Show why each finding matters and how to fix it
  --json             Print the full result as JSON (for scripts and CI)
  --strict           Exit with code 1 if anything is flagged as FIX (for CI)
  --config <file>    Use a config file (default: tastebud.config.json if present)
  --no-axe           Skip the axe-core accessibility checks
  --no-screenshot    Leave the screenshot out of the report

${c.bold('Examples')}
  tastebud audit examples/generic-landing.html --open
  tastebud audit https://example.org --mobile --why
`;

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (['out', 'config'].includes(key)) args.flags[key] = argv[++i];
      else args.flags[key] = true;
    } else if (a === '-h') args.flags.help = true;
    else args._.push(a);
  }
  return args;
}

async function runAudit(target, flags) {
  if (!target) {
    console.error('Tell tastebud what to check, e.g.  tastebud audit examples/generic-landing.html');
    return 2;
  }
  const config = loadConfig(flags.config);
  const device = flags.mobile ? 'mobile' : 'desktop';
  if (!flags.json) console.log(c.dim(`Checking ${target} (${device})...`));
  const report = await audit(target, { device, config, axe: !flags['no-axe'], screenshot: !flags['no-screenshot'] });

  const outDir = resolve(flags.out || 'tastebud-report');
  mkdirSync(outDir, { recursive: true });
  const name = `${slugFor(target)}${device === 'mobile' ? '-mobile' : ''}`;
  const htmlPath = join(outDir, `${name}.html`);
  const jsonPath = join(outDir, `${name}.json`);
  writeFileSync(htmlPath, renderHtml(report));
  writeFileSync(jsonPath, JSON.stringify({ ...report, screenshot: undefined }, null, 2));

  if (flags.json) {
    console.log(JSON.stringify({ ...report, screenshot: undefined }, null, 2));
  } else {
    printReport(report, { verbose: flags.why });
    console.log(`  Report: ${c.bold(htmlPath)}`);
    console.log(c.dim(`  Data:   ${jsonPath}`));
    if (!flags.why) console.log(c.dim('  Tip: add --why to see why each finding matters and how to fix it.'));
    console.log('');
  }
  if (flags.open) openInBrowser(htmlPath);
  return flags.strict && report.counts.error > 0 ? 1 : 0;
}

function listRules() {
  for (const [key, meta] of Object.entries(CATEGORIES)) {
    console.log(`\n${c.bold(meta.label)}  ${c.dim(meta.blurb)}`);
    for (const r of rules.filter((x) => x.category === key)) {
      console.log(`  ${r.id.padEnd(22)} ${c.dim(r.severity.padEnd(5))} ${r.title}`);
    }
  }
  console.log(`\n${c.dim('Plus every axe-core WCAG 2.2 AA check, reported as a11y/<rule-id>.')}\n`);
  return 0;
}

function runCompare(before, after) {
  if (!before || !after) {
    console.error('Usage: tastebud compare <before.json> <after.json>');
    return 2;
  }
  const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
  console.log(compareReports(read(before), read(after)));
  return 0;
}

async function main() {
  const { _, flags } = parseArgs(process.argv.slice(2));
  const [cmd, ...rest] = _;
  if (flags.help || !cmd || cmd === 'help') {
    console.log(HELP);
    return 0;
  }
  if (flags.version || cmd === 'version') {
    console.log(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version);
    return 0;
  }
  switch (cmd) {
    case 'audit':
      return runAudit(rest[0], flags);
    case 'compare':
      return runCompare(rest[0], rest[1]);
    case 'rules':
      return listRules();
    case 'frames': {
      const path = join(ROOT, 'frames', 'index.html');
      console.log(`Opening ${path}`);
      openInBrowser(path);
      return 0;
    }
    default:
      // Let people skip the word "audit": tastebud page.html
      return runAudit(cmd, flags);
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`\n${c.red('tastebud could not finish:')} ${err.message}\n`);
    process.exit(2);
  });
