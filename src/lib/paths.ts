// Every link is relative, so the built site works from any folder on any static host
// (Netlify, GitHub Pages, a USB stick in clinic) without a base-URL setting.
export function rootFor(pathname: string): string {
  const parts = pathname.replace(/^\/+/, '').split('/');
  const depth = Math.max(0, parts.length - 1);
  return depth === 0 ? './' : '../'.repeat(depth);
}
export const PAGES = {
  home: 'index.html',
  guides: 'guides.html',
  library: 'library.html',
  ufeProject: 'projects/ufe.html',
  ufe: 'ufe.html',
  visit: 'ufe/your-visit.html',
  text: 'ufe/as-text.html',
  clinicians: 'clinicians.html',
  about: 'about.html',
} as const;
