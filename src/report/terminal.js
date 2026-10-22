// Plain-language terminal summary. Colors are skipped when NO_COLOR is set
// or the output is not a terminal (CI logs, pipes).
import { CATEGORIES } from '../rules/index.js';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const c = {
  bold: paint('1'),
  dim: paint('2'),
  red: paint('31'),
  yellow: paint('33'),
  blue: paint('34'),
  green: paint('32'),
};

const SEVERITY = {
  error: { tag: 'FIX ', color: c.red },
  warn: { tag: 'WARN', color: c.yellow },
  info: { tag: 'NOTE', color: c.blue },
};

const scoreColor = (n) => (n >= 85 ? c.green : n >= 60 ? c.yellow : c.red);

export function printReport(report, { verbose = false } = {}) {
  const lines = [];
  lines.push('');
  lines.push(`${c.bold('tastebud')} ${c.dim('·')} ${report.title || report.url}`);
  lines.push(c.dim(`${report.url}  (${report.device}, ${report.viewport.w}×${report.viewport.h})`));
  lines.push('');
  lines.push(`  Overall  ${scoreColor(report.score)(c.bold(String(report.score).padStart(3)))}`);
  for (const [key, meta] of Object.entries(CATEGORIES)) {
    const cat = report.categories[key];
    lines.push(`  ${meta.label.padEnd(7)}  ${scoreColor(cat.score)(String(cat.score).padStart(3))}  ${cat.label}`);
  }
  lines.push('');

  if (!report.findings.length) {
    lines.push(c.green('  Nothing flagged. Nice work.'));
  }
  for (const [key, meta] of Object.entries(CATEGORIES)) {
    const items = report.findings.filter((f) => f.category === key);
    if (!items.length) continue;
    lines.push(c.bold(`  ${meta.label}`) + c.dim(`  ${meta.blurb}`));
    for (const f of items) {
      const s = SEVERITY[f.severity];
      lines.push(`  ${s.color(s.tag)}  ${f.message}`);
      if (verbose) {
        if (f.why) lines.push(c.dim(`        Why: ${f.why}`));
        if (f.fix) lines.push(c.dim(`        Fix: ${f.fix}`));
      }
    }
    lines.push('');
  }
  console.log(lines.join('\n'));
}
