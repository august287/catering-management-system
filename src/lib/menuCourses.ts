// Menu customization: how many dishes of each course a package lets the
// customer choose, and which menu dishes belong to which course.
// Only type imports, so the test runner can load this file.
import type { MenuCategory, MenuItem, MenuSelectionItem, Package } from '@/types/database';

export type CourseKey = 'appetizer' | 'soup' | 'main' | 'noodle' | 'rice' | 'dessert' | 'drink';

/** Courses in serving order. */
export const COURSES: { key: CourseKey; label: string; one: string; many: string }[] = [
  { key: 'appetizer', label: 'Appetizers', one: 'appetizer', many: 'appetizers' },
  { key: 'soup', label: 'Soup or Salad', one: 'soup or salad', many: 'soups or salads' },
  { key: 'main', label: 'Main Courses', one: 'main course', many: 'main courses' },
  { key: 'noodle', label: 'Noodles / Pasta', one: 'noodle or pasta dish', many: 'noodle or pasta dishes' },
  { key: 'rice', label: 'Rice', one: 'rice', many: 'rice varieties' },
  { key: 'dessert', label: 'Desserts', one: 'dessert', many: 'desserts' },
  { key: 'drink', label: 'Drinks', one: 'drink', many: 'drinks' },
];

export const COURSE_LABELS = Object.fromEntries(COURSES.map(c => [c.key, c.label])) as Record<CourseKey, string>;

export const MAX_PER_COURSE = 10;

export interface MenuRules {
  /** How many dishes the customer picks per course. Missing or 0 = not offered. */
  counts: Partial<Record<CourseKey, number>>;
  /** Fixed inclusions shown to the customer, e.g. "Bottomless Iced Tea". */
  included?: string[];
}

/** Built-in allowances for the standard tiers (from each package's description). */
const DEFAULT_RULES: { keywords: string[]; rules: MenuRules }[] = [
  {
    keywords: ['debut'],
    rules: { counts: { appetizer: 2, main: 4, noodle: 1, rice: 1, dessert: 2 }, included: ['Mocktail Fountain'] },
  },
  {
    keywords: ['corporate'],
    rules: { counts: { soup: 1, main: 3, rice: 1, dessert: 1 }, included: ['Fresh Brewed Coffee & Iced Tea Station'] },
  },
  {
    keywords: ['platinum', 'royal'],
    rules: {
      counts: { soup: 2, appetizer: 3, main: 5, noodle: 2, rice: 1, dessert: 3 },
      included: ['Champagne Toast', 'VIP Table Service'],
    },
  },
  {
    keywords: ['gold'],
    rules: {
      counts: { soup: 1, appetizer: 2, main: 4, noodle: 1, rice: 2, dessert: 2 },
      included: ['Bottomless Specialty Cooler'],
    },
  },
  {
    keywords: ['silver'],
    rules: {
      counts: { soup: 1, appetizer: 1, main: 3, noodle: 1, rice: 1, dessert: 1 },
      included: ['Bottomless Iced Tea'],
    },
  },
];

/** Used for packages with no saved allowance and no matching tier name. */
export const GENERIC_RULES: MenuRules = {
  counts: { soup: 1, appetizer: 1, main: 3, noodle: 1, rice: 1, dessert: 1 },
  included: ['Bottomless Iced Tea'],
};

/** Cleans saved rules; returns null if they are missing or unusable. */
export function normalizeMenuRules(raw: unknown): MenuRules | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as { counts?: Record<string, unknown>; included?: unknown };
  if (!src.counts || typeof src.counts !== 'object') return null;
  const counts: Partial<Record<CourseKey, number>> = {};
  for (const { key } of COURSES) {
    const n = Number(src.counts[key]);
    if (Number.isInteger(n) && n > 0) counts[key] = Math.min(n, MAX_PER_COURSE);
  }
  const included = Array.isArray(src.included)
    ? src.included.map(s => String(s).trim()).filter(Boolean).slice(0, 10)
    : [];
  return { counts, included };
}

/** The allowance for a package: saved rules, else its tier's default, else the generic one. */
export function getPackageMenuRules(pkg: Pick<Package, 'name'> & { menu_rules?: unknown } | null | undefined): MenuRules {
  const saved = normalizeMenuRules(pkg?.menu_rules);
  if (saved) return saved;
  const name = (pkg?.name || '').toLowerCase();
  const hit = DEFAULT_RULES.find(d => d.keywords.some(k => name.includes(k)));
  return hit ? hit.rules : GENERIC_RULES;
}

/** Courses this package offers, in serving order, with how many to pick. */
export function offeredCourses(
  rules: MenuRules
): { key: CourseKey; label: string; one: string; many: string; count: number }[] {
  return COURSES.filter(c => (rules.counts[c.key] || 0) > 0).map(c => ({ ...c, count: rules.counts[c.key]! }));
}

/** "3 main courses · 1 appetizer · ..." */
export function describeAllowance(rules: MenuRules): string {
  return offeredCourses(rules)
    .map(c => `${c.count} ${c.count === 1 ? c.one : c.many}`)
    .join(' · ');
}

const DRINK_WORDS = /cooler|gulaman|juice|tea\b|coffee|drink|lemonade|shake|soda|punch|mocktail|smoothie/i;

/**
 * Which course a dish belongs to, from its menu category and name.
 * Categories that hold two courses are split by name (rice vs. noodles, drinks vs. desserts).
 */
export function courseOfItem(item: Pick<MenuItem, 'name'>, categoryName: string | undefined): CourseKey | null {
  const cat = (categoryName || '').toLowerCase();
  const name = item.name.toLowerCase();
  if (/appetizer|starter|hors/.test(cat)) return 'appetizer';
  if (/soup|salad/.test(cat)) return 'soup';
  if (/main|seafood|entr[eé]e|meat|poultry/.test(cat)) return 'main';
  if (/rice|noodle|pasta|pancit/.test(cat)) return /rice/.test(name) ? 'rice' : 'noodle';
  if (/dessert|drink|beverage|sweet/.test(cat)) return DRINK_WORDS.test(name) ? 'drink' : 'dessert';
  return null;
}

/** Available dishes grouped by course. */
export function groupMenuByCourse(
  menuItems: MenuItem[],
  categories: MenuCategory[]
): Record<CourseKey, MenuItem[]> {
  const catName = new Map(categories.map(c => [c.id, c.name]));
  const groups = Object.fromEntries(COURSES.map(c => [c.key, [] as MenuItem[]])) as Record<CourseKey, MenuItem[]>;
  for (const item of menuItems) {
    if (!item.is_available) continue;
    const course = courseOfItem(item, catName.get(item.category_id));
    if (course) groups[course].push(item);
  }
  return groups;
}

export type MenuSelection = Partial<Record<CourseKey, number[]>>;

/** How many dishes the customer must pick for a course (fewer if the menu has fewer). */
export function requiredCount(rules: MenuRules, course: CourseKey, available: number): number {
  return Math.min(rules.counts[course] || 0, available);
}

/** Returns why the selection is incomplete or invalid, or null if it is complete. */
export function menuSelectionError(
  rules: MenuRules,
  selection: MenuSelection,
  groups: Record<CourseKey, MenuItem[]>
): string | null {
  for (const c of offeredCourses(rules)) {
    const allowedIds = new Set(groups[c.key].map(i => i.id));
    const picked = (selection[c.key] || []).filter(id => allowedIds.has(id));
    const need = requiredCount(rules, c.key, allowedIds.size);
    if (picked.length !== need) {
      return `Please choose ${need} ${need === 1 ? c.one : c.many} (${picked.length} of ${need} selected).`;
    }
  }
  return null;
}

/** The first course that still needs dishes (for jumping to it), or null if all are done. */
export function firstIncompleteCourse(
  rules: MenuRules,
  selection: MenuSelection,
  groups: Record<CourseKey, MenuItem[]>
): CourseKey | null {
  for (const c of offeredCourses(rules)) {
    const allowedIds = new Set(groups[c.key].map(i => i.id));
    const picked = (selection[c.key] || []).filter(id => allowedIds.has(id)).length;
    if (picked !== requiredCount(rules, c.key, allowedIds.size)) return c.key;
  }
  return null;
}

/** Snapshot of the chosen dishes, saved with the reservation (names kept in case dishes change later). */
export function toMenuSelectionItems(
  rules: MenuRules,
  selection: MenuSelection,
  menuItems: MenuItem[]
): MenuSelectionItem[] {
  const byId = new Map(menuItems.map(i => [i.id, i]));
  const out: MenuSelectionItem[] = [];
  for (const c of offeredCourses(rules)) {
    for (const id of selection[c.key] || []) {
      const item = byId.get(id);
      if (item) out.push({ course: c.key, item_id: item.id, name: item.name });
    }
  }
  return out;
}

/** Chosen dishes grouped by course, in serving order, for display. */
export function groupSelectionForDisplay(items: MenuSelectionItem[] | null | undefined): { label: string; names: string[] }[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  return COURSES.map(c => ({
    label: c.label,
    names: items.filter(i => i.course === c.key).map(i => i.name),
  })).filter(g => g.names.length > 0);
}

/** Plain-text version, e.g. for notes when the menu can't be saved separately. */
export function menuSelectionText(items: MenuSelectionItem[]): string {
  return groupSelectionForDisplay(items)
    .map(g => `${g.label}: ${g.names.join(', ')}`)
    .join('\n');
}
