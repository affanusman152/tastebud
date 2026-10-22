import taste from './taste.js';
import system from './system.js';
import access from './access.js';

const withCategory = (rules, category) => rules.map((r) => ({ category, ...r }));

export const rules = [...withCategory(taste, 'taste'), ...withCategory(system, 'system'), ...withCategory(access, 'access')];

export const CATEGORIES = {
  taste: { label: 'Taste', blurb: 'Defaults and clichés that make a UI look like every template.' },
  system: { label: 'System', blurb: 'Whether type, spacing and color follow a scale.' },
  access: { label: 'Access', blurb: 'Whether everyone can read, reach and operate it.' },
};
