/**
 * Launch flag.
 *
 * While false, every page emits `<meta name="robots" content="noindex, nofollow">`
 * so search engines skip the work-in-progress site. Anyone with the link still
 * sees it — this is not access control, only crawler suppression.
 *
 * NOTE: a robots.txt would NOT work for this site. Crawlers read robots.txt only
 * at the domain root (100badreasons.github.io/robots.txt), which belongs to a
 * user-site repo that does not exist. A file at /portfolio/robots.txt is ignored.
 * The per-page meta tag is the only mechanism available to a project page.
 *
 * TO LAUNCH: flip this to true. That is the whole change.
 */
export const LAUNCHED = false;

export const SITE_NAME = '100BadReasons';
