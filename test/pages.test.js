// End-to-end tests against the example pages in a real browser.
// Skipped automatically when no Chromium-family browser is installed.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { audit } from '../src/audit.js';
import { findBrowser, launchBrowser } from '../src/browser.js';
import { renderHtml } from '../src/report/html.js';

const skip = findBrowser() ? false : 'no Chrome, Edge, Brave or Chromium installed';
let browser;
let tmp;

before(async () => {
  if (skip) return;
  browser = await launchBrowser();
  tmp = mkdtempSync(join(tmpdir(), 'tastebud-test-'));
});
after(async () => {
  await browser?.close();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

const rulesIn = (r) => new Set(r.findings.map((f) => f.rule));

test('the generic example trips the rules it was built to show', { skip }, async () => {
  const r = await audit('examples/generic-landing.html', { browser, screenshot: false });
  const got = rulesIn(r);
  for (const rule of ['ai-gradient', 'card-grid-cliche', 'cliche-copy', 'placeholder-content', 'default-font', 'centered-everything',
    'type-scale-sprawl', 'long-lines', 'tight-line-height', 'spacing-no-system',
    'focus-visible', 'a11y/color-contrast', 'a11y/image-alt', 'a11y/html-has-lang', 'heading-skip', 'main-landmark', 'viewport-meta']) {
    assert.ok(got.has(rule), `expected ${rule}`);
  }
  assert.ok(r.score < 50, `score ${r.score} should be low`);
});

test('the considered example is clean at desktop and phone size', { skip }, async () => {
  for (const device of ['desktop', 'mobile']) {
    const r = await audit('examples/good-landing.html', { browser, device, screenshot: false });
    assert.deepEqual([...rulesIn(r)], [], `${device}: ${[...rulesIn(r)].join(', ')}`);
  }
});

test('the frames gallery is clean', { skip }, async () => {
  const r = await audit('frames/index.html', { browser, screenshot: false });
  assert.deepEqual([...rulesIn(r)], []);
});

test('a tastebud report passes its own audit', { skip }, async () => {
  const r = await audit('examples/generic-landing.html', { browser });
  const file = join(tmp, 'report.html');
  writeFileSync(file, renderHtml(r));
  for (const device of ['desktop', 'mobile']) {
    const self = await audit(file, { browser, device, screenshot: false });
    assert.deepEqual([...rulesIn(self)], [], `${device}: ${[...rulesIn(self)].join(', ')}`);
  }
});
