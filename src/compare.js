// Before/after comparison of two saved audits (the .json files).
import { CATEGORIES } from './rules/index.js';
import { c } from './report/terminal.js';

const key = (f) => `${f.rule}`;

export function diffReports(before, after) {
  const beforeRules = new Map(before.findings.map((f) => [key(f), f]));
  const afterRules = new Map(after.findings.map((f) => [key(f), f]));
  return {
    fixed: [...beforeRules.values()].filter((f) => !afterRules.has(key(f))),
    added: [...afterRules.values()].filter((f) => !beforeRules.has(key(f))),
    remaining: [...afterRules.values()].filter((f) => beforeRules.has(key(f))),
  };
}

export function compareReports(before, after) {
  const { fixed, added, remaining } = diffReports(before, after);
  const delta = (a, b) => {
    const d = b - a;
    return d > 0 ? c.green(`+${d}`) : d < 0 ? c.red(String(d)) : c.dim('±0');
  };
  const lines = ['', c.bold('tastebud compare'), c.dim(`before: ${before.url}`), c.dim(`after:  ${after.url}`), ''];
  lines.push(`  Overall  ${String(before.score).padStart(3)} → ${String(after.score).padStart(3)}  ${delta(before.score, after.score)}`);
  for (const [k, meta] of Object.entries(CATEGORIES)) {
    const b = before.categories[k];
    const a = after.categories[k];
    lines.push(`  ${meta.label.padEnd(7)}  ${String(b.score).padStart(3)} → ${String(a.score).padStart(3)}  ${delta(b.score, a.score)}  ${c.dim(`${b.label} → ${a.label}`)}`);
  }
  lines.push('');
  if (fixed.length) {
    lines.push(c.green(`  Fixed (${fixed.length})`));
    for (const f of fixed) lines.push(`    ✓ ${f.title}`);
  }
  if (added.length) {
    lines.push(c.red(`  New (${added.length})`));
    for (const f of added) lines.push(`    ✗ ${f.title}: ${f.message}`);
  }
  if (remaining.length) {
    lines.push(c.yellow(`  Still there (${remaining.length})`));
    for (const f of remaining) lines.push(`    • ${f.title}`);
  }
  lines.push('');
  return lines.join('\n');
}
