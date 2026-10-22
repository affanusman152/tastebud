// Runs axe-core (the industry-standard accessibility engine) in the page and
// turns its violations into tastebud findings.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const SEVERITY = { critical: 'error', serious: 'error', moderate: 'warn', minor: 'info' };

export async function runAxe(page) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      resultTypes: ['violations'],
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags.filter((t) => /^wcag\d/.test(t)),
      count: v.nodes.length,
      examples: v.nodes.slice(0, 3).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 160), summary: (n.failureSummary || '').split('\n').slice(1, 2).join(' ').trim() })),
    }));
  });
  return result.map((v) => ({
    rule: `a11y/${v.id}`,
    category: 'access',
    title: v.help,
    severity: SEVERITY[v.impact] || 'warn',
    message: `${v.count} element${v.count > 1 ? 's fail' : ' fails'}: ${v.help}.`,
    why: v.examples[0]?.summary || 'See the linked guidance for details.',
    fix: `Example: ${v.examples[0]?.html || ''}`,
    learnMore: v.helpUrl,
    examples: v.examples,
  }));
}
