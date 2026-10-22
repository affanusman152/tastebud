// Fast tests: no browser needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, toOklab, clusterColors, analyze } from '../src/analyze.js';
import { score, runRules, toUrl } from '../src/audit.js';
import { verdict } from '../src/report/html.js';
import { diffReports } from '../src/compare.js';
import { slugFor } from '../src/cli-utils.js';

// A tiny fake snapshot: build only what a rule reads.
function snap(overrides = {}) {
  return {
    url: 'file:///x.html', title: 'x', lang: 'en', viewport: { w: 1440, h: 900 }, hasViewportMeta: true,
    scrollWidth: 1440, pageHeight: 900, elements: [], interactive: [], headings: [],
    landmarks: { main: 1, nav: 0, header: 0, footer: 0 }, skipLink: true, images: [], cardGroups: [], bodyText: '',
    ...overrides,
  };
}
const el = (o = {}) => ({
  tag: 'p', text: '', textLength: 0, finePrint: false, code: false, rect: { x: 0, y: 0, w: 600, h: 24 },
  font: { family: 'Charter, serif', size: 16, weight: 400, lineHeight: 24 }, color: 'rgb(20, 20, 20)', bg: 'rgba(0, 0, 0, 0)',
  bgImage: null, borderColor: null, radius: 0, shadow: null, textAlign: 'left', display: 'block',
  padding: [0, 0, 0, 0], margin: [0, 0, 0, 0], gap: [0, 0], backdrop: null, ...o,
});
const run = (s) => runRules({ snap: s, stats: analyze(s), focus: null });
const ids = (findings) => findings.map((f) => f.rule);

test('parseColor reads rgb and rgba', () => {
  assert.deepEqual(parseColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30, a: 1 });
  assert.equal(parseColor('rgba(0, 0, 0, 0.5)').a, 0.5);
  assert.equal(parseColor('transparent'), null);
});

test('OKLab hue puts blue and violet in the gradient band, orange outside it', () => {
  const hue = (r, g, b) => toOklab({ r, g, b }).h;
  assert.ok(hue(99, 102, 241) > 250 && hue(99, 102, 241) < 345, 'indigo');
  assert.ok(hue(139, 92, 246) > 250 && hue(139, 92, 246) < 345, 'violet');
  assert.ok(hue(234, 88, 12) < 250, 'orange');
});

test('clusterColors merges near-identical shades', () => {
  const c = clusterColors([
    { color: { r: 44, g: 102, b: 82 }, weight: 1 },
    { color: { r: 45, g: 103, b: 83 }, weight: 1 },
    { color: { r: 200, g: 30, b: 30 }, weight: 1 },
  ]);
  assert.equal(c.length, 2);
});

test('spacing rule accepts a 5px system (GOV.UK) and flags random values', () => {
  const govuk = snap({ elements: [5, 10, 15, 20, 25, 30, 40, 50].flatMap((v) => Array.from({ length: 4 }, () => el({ padding: [v, v, v, v] }))) });
  assert.ok(!ids(run(govuk)).includes('spacing-no-system'));
  const random = snap({ elements: [7, 11, 13, 19, 23, 27, 31, 37].flatMap((v) => Array.from({ length: 4 }, () => el({ padding: [v, v, v, v] }))) });
  assert.ok(ids(run(random)).includes('spacing-no-system'));
});

test('flat-hierarchy fires when the biggest heading is barely bigger than body text', () => {
  const body = el({ text: 'x'.repeat(300), textLength: 300 });
  assert.ok(ids(run(snap({ elements: [body], headings: [{ level: 1, text: 'Hi', size: 20 }] }))).includes('flat-hierarchy'));
  assert.ok(!ids(run(snap({ elements: [body], headings: [{ level: 1, text: 'Hi', size: 40 }] }))).includes('flat-hierarchy'));
});

test('heading-skip and one-h1 read the outline', () => {
  const f = ids(run(snap({ headings: [{ level: 2, text: 'a', size: 30 }, { level: 4, text: 'b', size: 20 }] })));
  assert.ok(f.includes('heading-skip'));
  assert.ok(f.includes('one-h1'));
});

test('cliche-copy ignores nothing it should not, and placeholder catches lorem ipsum', () => {
  const f = run(snap({ bodyText: 'Unlock the power of seamless, blazing fast pottery. Lorem ipsum dolor sit amet.' }));
  assert.ok(ids(f).includes('cliche-copy'));
  assert.ok(ids(f).includes('placeholder-content'));
  assert.ok(!ids(run(snap({ bodyText: 'Book a wheel without the group chat.' }))).includes('cliche-copy'));
});

test('config can turn a rule off or change its severity', () => {
  const s = snap({ bodyText: 'Lorem ipsum' });
  const ctx = { snap: s, stats: analyze(s), focus: null };
  assert.ok(!ids(runRules(ctx, { rules: { 'placeholder-content': 'off' }, options: {} })).includes('placeholder-content'));
  const f = runRules(ctx, { rules: { 'placeholder-content': 'error' }, options: {} }).find((x) => x.rule === 'placeholder-content');
  assert.equal(f.severity, 'error');
});

test('score charges each rule once and keeps categories separate', () => {
  const findings = [
    { rule: 'a', category: 'taste', severity: 'warn' },
    { rule: 'a', category: 'taste', severity: 'warn' },
    { rule: 'b', category: 'access', severity: 'error' },
  ];
  const { overall, categories } = score(findings);
  assert.equal(categories.taste.score, 90);
  assert.equal(categories.system.score, 100);
  assert.equal(categories.access.score, 85);
  assert.equal(overall, Math.round((90 + 100 + 85) / 3));
});

test('verdict reads as a sentence', () => {
  const v = verdict({ taste: { label: 'Template-y' }, system: { label: 'Loose' }, access: { label: 'Barriers' } });
  assert.equal(v.text, 'Template-y, loose, and full of barriers.');
  assert.equal(v.allGood, false);
});

test('compare sorts findings into fixed, new and remaining', () => {
  const d = diffReports({ findings: [{ rule: 'a' }, { rule: 'b' }] }, { findings: [{ rule: 'b' }, { rule: 'c' }] });
  assert.deepEqual(d.fixed.map((f) => f.rule), ['a']);
  assert.deepEqual(d.added.map((f) => f.rule), ['c']);
  assert.deepEqual(d.remaining.map((f) => f.rule), ['b']);
});

test('targets become URLs; report names are file-safe', () => {
  assert.equal(toUrl('https://example.org'), 'https://example.org');
  assert.equal(toUrl('example.org'), 'https://example.org');
  assert.equal(toUrl('localhost:3000'), 'http://localhost:3000');
  assert.throws(() => toUrl('no-such-file.html'));
  assert.equal(slugFor('https://example.org/a?b=1&c=2'), 'example-org-a-b-1-c-2');
  assert.equal(slugFor('examples/generic-landing.html'), 'generic-landing');
});
