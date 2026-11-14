import type { EventTheme } from '@/types/database';

/**
 * Pictures for event themes, picked by name.
 *
 * A theme whose name contains one of the keywords below uses that
 * photo set from public/images. To add photos for a theme, drop the files in
 * public/images and list them here; the first one is the cover photo.
 */
const THEME_GALLERIES: { keywords: string[]; images: string[] }[] = [
  { keywords: ['wedding', 'bridal'], images: ['/images/wedding.jpg', '/images/2 PIC.jpg'] },
  {
    keywords: ['birthday', 'bday', 'kiddie'],
    images: ['/images/bday-girl.jpg', '/images/bday-girl-2.jpg', '/images/1 PIC.jpg', '/images/5.jpg'],
  },
  { keywords: ['debut'], images: ['/images/debut.jpg'] },
  { keywords: ['corporate', 'corpo', 'company', 'office'], images: ['/images/corpo.jpg', '/images/3 PIC.jpg'] },
  { keywords: ['fiesta', 'filipino'], images: ['/images/fiesta.jpg'] },
  { keywords: ['christening', 'dedication', 'baptism'], images: ['/images/christening.jpg'] },
];

export const DEFAULT_THEME_IMAGE = '/images/2 PIC.jpg';

/** "Christening & Dedication" -> "christening-dedication" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function matchGallery(name: string): string[] | null {
  const n = name.toLowerCase();
  const hit = THEME_GALLERIES.find(g => g.keywords.some(k => n.includes(k)));
  return hit ? hit.images : null;
}

/** All photos for a theme, cover first. */
export function getThemeImages(theme: Pick<EventTheme, 'name' | 'image_url'>): string[] {
  const gallery = matchGallery(theme.name);
  if (gallery) return gallery;
  return [theme.image_url || DEFAULT_THEME_IMAGE];
}

/** Cover photo for a theme. */
export function getThemeImage(theme: Pick<EventTheme, 'name' | 'image_url'>): string {
  return getThemeImages(theme)[0];
}

/** URL of a theme's detail page, e.g. /customer/menu/birthday-celebration */
export function themePath(theme: Pick<EventTheme, 'name'>): string {
  return `/customer/menu/${slugify(theme.name)}`;
}

/** Finds a theme from a URL segment. Old numeric links (/customer/menu/2) still work. */
export function findThemeBySlug(themes: EventTheme[], slug: string | undefined): EventTheme | undefined {
  if (!slug) return undefined;
  const bySlug = themes.find(t => slugify(t.name) === slug.toLowerCase());
  if (bySlug) return bySlug;
  return /^\d+$/.test(slug) ? themes.find(t => t.id === Number(slug)) : undefined;
}
