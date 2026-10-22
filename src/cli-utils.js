import { basename } from 'node:path';
import { spawn } from 'node:child_process';

/** A safe file name for a report: "https://example.org/a?b" -> "example-org-a-b". */
export function slugFor(target) {
  const clean = target.replace(/^https?:\/\//, '').replace(/^file:\/+/, '');
  const base = /\.html?$/i.test(clean) ? basename(clean).replace(/\.html?$/i, '') : clean;
  return base.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'page';
}

export function openInBrowser(path) {
  const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '""', path] : [path];
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}
