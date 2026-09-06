import { getCollection } from 'astro:content';

/**
 * Drafts (`published: false`) render in `astro dev` so you can review an upload
 * immediately, and are stripped from `astro build` so they never deploy.
 * Every page must query through here — calling getCollection('work') directly
 * would leak drafts into production.
 */
export async function getWork() {
  const entries = await getCollection('work', ({ data }) =>
    import.meta.env.PROD ? data.published : true,
  );

  return entries.sort(
    (a, b) =>
      (a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
      b.data.date.valueOf() - a.data.date.valueOf(),
  );
}
