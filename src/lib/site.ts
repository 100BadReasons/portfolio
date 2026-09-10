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
export const LAUNCHED = true;

/**
 * GoatCounter site code — the subdomain from your dashboard URL, so for
 * `https://100badreasons.goatcounter.com` this is `100badreasons`.
 *
 * Analytics load only when this is set AND LAUNCHED is true, so the flag that
 * governs indexing also governs tracking: a pre-launch site is neither crawled
 * nor counted. Leave it empty and no script is emitted at all.
 *
 * count.js ignores localhost and file:// on its own, so `npm run dev` never
 * pollutes the numbers. /admin is not counted either — the CMS page is its own
 * standalone document and does not use BaseLayout.
 */
export const GOATCOUNTER_CODE = '100badreasons';

export const SITE_NAME = '100BadReasons';

/**
 * Contact details, in one place so the footer, structured data, and any future
 * about page can never disagree. The brand is the headline; the legal name
 * lives here so a case study can still be traced back to a person.
 */
export const CONTACT = {
  name: 'Kendall Willis',
  email: 'kendall.willis@gmail.com',
  linkedin: 'https://www.linkedin.com/in/kendall-willis/',
  cta: 'Let\u2019s Work',
} as const;
