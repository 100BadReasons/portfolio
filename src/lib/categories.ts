/**
 * Single source of truth for the filter bar, the Zod enum, and card badges.
 * Adding a category here propagates everywhere; nothing else needs editing.
 */
/**
 * Declaration order is the filter-bar order. Keep it in the intended
 * presentation order rather than sorting it elsewhere.
 */
export const CATEGORIES = {
  software: {
    label: 'Software & Web Applications',
    short: 'Software',
    blurb: 'Shipped applications, tooling, and platform work.',
  },
  'content-creation': {
    label: 'Content Creation',
    short: 'Content',
    blurb: 'Films, concept pieces, and produced video work.',
  },
  'product-3d': {
    label: '3D Product Design & Renders',
    short: '3D',
    blurb: 'CAD, surfacing, lookdev, and production render pipelines.',
  },
  interactive: {
    label: 'Interactive Demos & Motion',
    short: 'Motion',
    blurb: 'Real-time demos, motion systems, and compositing.',
  },
} as const;

export type CategoryId = keyof typeof CATEGORIES;

export const CATEGORY_IDS = Object.keys(CATEGORIES) as [CategoryId, ...CategoryId[]];

export const categoryLabel = (id: CategoryId) => CATEGORIES[id].label;
