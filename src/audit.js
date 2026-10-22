// Loads a page, collects its design, runs every rule and returns a report.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from './browser.js';
import { collectSnapshot } from './collect.js';
import { analyze } from './analyze.js';
import { checkFocus } from './focus.js';
import { runAxe } from './axe.js';
import { rules } from './rules/index.js';

export const PENALTY = { error: 15, warn: 10, info: 3 };

export const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

export function toUrl(target) {
  if (/^https?:\/\//i.test(target) || /^file:/i.test(target)) return target;
  if (existsSync(target)) return pathToFileURL(resolve(target)).href;
  if (/\.html?$/i.test(target)) throw new Error(`File not found: ${resolve(target)}\nCheck the spelling, or drag the file into the window instead of typing its name.`);
  if (/^(localhost|127\.0\.0\.1)(:\d+)?/.test(target)) return `http://${target}`;
  if (/^[\w-]+(\.[\w-]+)+/.test(target)) return `https://${target}`;
  throw new Error(`Can't find "${target}". Pass a URL (https://...) or a path to an .html file.`);
}

// Taste, system and access are scored separately: a beautiful site can still
// lock people out, and an accessible one can still look like a template.
const LABELS = {
  taste: ['Distinctive', 'Some defaults', 'Template-y'],
  system: ['Systematic', 'Loose', 'Ad hoc'],
  access: ['Inclusive', 'Gaps', 'Barriers'],
};

export function label(category, value) {
  const [good, mid, bad] = LABELS[category];
  return value >= 85 ? good : value >= 60 ? mid : bad;
}

export function score(findings) {
  // Each rule costs its penalty once, however many elements it flags,
  // so one noisy rule cannot sink a score on its own.
  const charged = { taste: new Map(), system: new Map(), access: new Map() };
  for (const f of findings) {
    const map = charged[f.category] || charged.access;
    map.set(f.rule, Math.max(map.get(f.rule) || 0, PENALTY[f.severity] || 0));
  }
  const categories = {};
  for (const [cat, map] of Object.entries(charged)) {
    const value = Math.max(0, 100 - [...map.values()].reduce((s, p) => s + p, 0));
    categories[cat] = { score: value, label: label(cat, value) };
  }
  const overall = Math.round((categories.taste.score + categories.system.score + categories.access.score) / 3);
  return { overall, categories };
}

export function runRules(context, config = { rules: {}, options: {} }) {
  const findings = [];
  for (const rule of rules) {
    const setting = config.rules[rule.id];
    if (setting === 'off') continue;
    const options = { ...(rule.defaults || {}), ...(config.options[rule.id] || {}) };
    let out = [];
    try {
      out = rule.check({ ...context, options }) || [];
    } catch (err) {
      out = [{ severity: 'info', message: `Rule crashed: ${err.message}` }];
    }
    for (const f of out) {
      findings.push({
        rule: rule.id,
        category: rule.category,
        title: rule.title,
        ...f,
        severity: ['error', 'warn', 'info'].includes(setting) ? setting : f.severity || rule.severity,
      });
    }
  }
  return findings;
}

export async function audit(target, { device = 'desktop', config, axe = true, focus = true, screenshot = true, browser: shared } = {}) {
  const url = toUrl(target);
  const browser = shared || (await launchBrowser());
  // bypassCSP lets axe-core run on sites with strict Content Security Policies.
  const context = await browser.newContext({ ...VIEWPORTS[device], reducedMotion: 'reduce', bypassCSP: true });
  const page = await context.newPage();
  const started = Date.now();
  try {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (err) {
      if (!/Timeout/.test(err.message)) throw err;
      // Busy pages (analytics, live widgets) never go idle; audit what loaded.
    }
    await page.waitForTimeout(400);

    const snap = await collectSnapshot(page);
    const stats = analyze(snap);
    const focusResult = focus ? await checkFocus(page).catch(() => null) : null;
    const axeFindings = axe ? await runAxe(page).catch((err) => [{ rule: 'a11y/engine', category: 'access', title: 'axe-core could not run', severity: 'info', message: err.message.split('\n')[0] }]) : [];

    let shot = null;
    if (screenshot) {
      await page.evaluate(() => window.scrollTo(0, 0));
      const height = Math.min(snap.pageHeight, device === 'mobile' ? 5000 : 4000);
      const buf = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: true, clip: { x: 0, y: 0, width: snap.viewport.w, height } });
      shot = `data:image/jpeg;base64,${buf.toString('base64')}`;
    }

    let findings = [...runRules({ snap, stats, focus: focusResult }, config || undefined), ...axeFindings.filter((f) => config?.rules?.[f.rule] !== 'off')];
    // axe's target-size check is spacing-aware and more precise; prefer it over ours.
    if (findings.some((f) => f.rule === 'a11y/target-size')) findings = findings.filter((f) => f.rule !== 'tiny-targets');
    const order = { error: 0, warn: 1, info: 2 };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);
    const { overall, categories } = score(findings);

    return {
      tool: 'tastebud',
      version: '0.1.0',
      url: snap.url,
      title: snap.title,
      device,
      viewport: snap.viewport,
      auditedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      score: overall,
      categories,
      counts: { error: findings.filter((f) => f.severity === 'error').length, warn: findings.filter((f) => f.severity === 'warn').length, info: findings.filter((f) => f.severity === 'info').length },
      findings,
      design: {
        fonts: stats.fonts.slice(0, 5).map((f) => ({ family: f.family, share: +(f.chars / stats.totalChars).toFixed(3) })),
        typeScale: stats.meaningfulSizes,
        bodySize: stats.bodySize,
        palette: stats.palette.slice(0, 16).map((c) => ({ hex: c.hex, share: c.weight, chromatic: c.lab.C > 0.04 })),
        spacing: stats.spacingValues.filter((v) => v.count > 1),
        headings: snap.headings.slice(0, 40),
        focus: focusResult,
      },
      screenshot: shot,
    };
  } finally {
    await context.close();
    if (!shared) await browser.close();
  }
}
