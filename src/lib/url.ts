const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Prefix an app-absolute path with the configured `base` ('/portfolio').
 *
 * Astro rewrites `base` into bundled asset URLs but NOT into href/src you author
 * yourself, so every internal link and every /public asset must pass through here.
 * Getting this wrong is the #1 way project-repo Pages deploys break: it works on
 * localhost (where base is applied by the dev server) and 404s in production.
 */
export function withBase(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('#') || path.startsWith('mailto:')) {
    return path;
  }
  return `${BASE}/${path.replace(/^\//, '')}`;
}

/** Canonical absolute URL, for <link rel=canonical> and OG tags. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  return new URL(withBase(path), site ?? 'https://100badreasons.github.io').href;
}

export const workPath = (slug: string) => withBase(`/work/${slug}`);
