// Finds a Chromium-family browser that is already installed (Chrome, Edge,
// Brave, Chromium), so nobody has to download a 150 MB browser to start.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

function candidates() {
  const env = process.env;
  if (process.platform === 'win32') {
    const roots = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean);
    const rel = [
      'Google\\Chrome\\Application\\chrome.exe',
      'Microsoft\\Edge\\Application\\msedge.exe',
      'BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      'Chromium\\Application\\chrome.exe',
    ];
    return roots.flatMap((root) => rel.map((r) => join(root, r)));
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  }
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge', '/snap/bin/chromium'];
}

export function findBrowser() {
  if (process.env.TASTEBUD_BROWSER) return process.env.TASTEBUD_BROWSER;
  return candidates().find((p) => existsSync(p)) || null;
}

export async function launchBrowser() {
  const executablePath = findBrowser();
  try {
    // Without a path, playwright-core falls back to a browser installed by
    // `npx playwright install chromium`.
    return await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  } catch (err) {
    const hint = executablePath
      ? `Found ${executablePath} but could not start it.`
      : 'No Chrome, Edge, Brave or Chromium was found.';
    throw new Error(`${hint}\nInstall Google Chrome, or run: npx playwright install chromium\nOr point to a browser with TASTEBUD_BROWSER=/path/to/browser\n(${err.message.split('\n')[0]})`);
  }
}
