// Presses Tab like a keyboard user and checks that each focused element
// looks different from its unfocused self, the way a person would judge it:
// screenshot the area around the element focused, then unfocused, and
// compare the pixels. This catches rings drawn on wrappers, siblings and
// pseudo-elements, and focus styles added by JavaScript.

async function markActive() {
  // Let focus handlers (some sites add a ring class from JS) finish first.
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const r = el.getBoundingClientRect();
  const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 40);
  const id = el.outerHTML.slice(0, 200) + r.x + ',' + (r.y + window.scrollY);
  // Visually hidden elements (1px skip links before focus, off-screen inputs) are not judged.
  if (r.width < 4 || r.height < 4) return { id, skip: true };
  el.setAttribute('data-tastebud-focus', '');
  return { id, label, rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
}

function clipFor(rect, vp) {
  const pad = 8;
  const x = Math.max(0, Math.floor(rect.x - pad));
  const y = Math.max(0, Math.floor(rect.y - pad));
  const width = Math.min(vp.width - x, Math.ceil(rect.w + pad * 2));
  const height = Math.min(vp.height - y, Math.ceil(rect.h + pad * 2));
  return width >= 4 && height >= 4 ? { x, y, width, height } : null;
}

export async function checkFocus(page, maxTabs = 20) {
  // Transitions would make the unfocused screenshot still show the ring.
  const style = await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
  });
  const results = [];
  const seen = new Set();
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(markActive);
    if (!r) break;
    if (seen.has(r.id)) break; // focus wrapped around the page
    seen.add(r.id);
    if (r.skip) continue;

    const clip = clipFor(r.rect, page.viewportSize());
    if (!clip) continue; // cannot see it, so cannot judge it
    // A tight crop first; if nothing changed there, the ring may surround a
    // whole card (focus-within, stretched ::after), so look at the viewport.
    const shoot = (opts) => page.screenshot({ type: 'jpeg', quality: 90, animations: 'disabled', caret: 'hide', ...opts });
    const focusedClip = await shoot({ clip });
    const focusedFull = await shoot({});
    await page.evaluate(async () => {
      document.querySelector('[data-tastebud-focus]')?.blur();
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    const visible = !focusedClip.equals(await shoot({ clip })) || !focusedFull.equals(await shoot({}));
    await page.evaluate(() => {
      const el = document.querySelector('[data-tastebud-focus]');
      el?.focus({ preventScroll: true });
      el?.removeAttribute('data-tastebud-focus');
    });
    results.push({ label: r.label, visible });
  }
  await style.evaluate((s) => s.remove());
  return {
    tested: results.length,
    invisible: results.filter((r) => !r.visible).map((r) => r.label),
  };
}
