// Optional tastebud.config.json in the current folder:
// {
//   "rules": { "default-font": "off", "card-grid-cliche": "error" },
//   "options": { "type-scale-sprawl": { "maxSizes": 10 } }
// }
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadConfig(path) {
  const file = resolve(path || 'tastebud.config.json');
  if (!existsSync(file)) {
    if (path) throw new Error(`Config file not found: ${file}`);
    return { rules: {}, options: {} };
  }
  const cfg = JSON.parse(readFileSync(file, 'utf8'));
  return { rules: cfg.rules || {}, options: cfg.options || {}, file };
}
