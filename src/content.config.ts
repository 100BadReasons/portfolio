import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';
import { CATEGORY_IDS } from './lib/categories';

/**
 * Treat empty string and null as "absent".
 *
 * Sveltia writes `''` for untouched optional strings and `null` for untouched
 * optional objects and numbers, rather than omitting the key. Plain `.optional()`
 * rejects both, so a project saved from the CMS failed validation on fields the
 * author had deliberately left blank. Wrap every optional field in this.
 */
const blankable = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    schema.optional(),
  );

/** Same idea for list fields, where the CMS may write null instead of []. */
const listOf = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === null || v === undefined ? [] : v), z.array(schema));

/* ------------------------------------------------------------------ *
 * Draft vs. published
 *
 * The schema is deliberately permissive for drafts and strict for anything
 * with `published: true`. That is what makes "upload from my phone now, write
 * the case study later" safe: an incomplete draft builds and is visible in
 * `astro dev`, but is excluded from the production build, and flipping it to
 * published fails CI until every required field is real.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Sub-schemas
 * ------------------------------------------------------------------ */

/**
 * TIER 2 — Deep-dive media. Never in git. Streamed from R2 / Vimeo / YouTube.
 */
const deepDiveMedia = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('r2'),
    src: z.url(),
    poster: z.url().optional(),
    caption: z.string(),
    bytes: z.number().int().positive().optional(),
  }),
  z.object({ kind: z.literal('vimeo'), id: z.string(), caption: z.string(), hash: z.string().optional() }),
  z.object({ kind: z.literal('youtube'), id: z.string(), caption: z.string() }),
  z.object({
    kind: z.literal('image-sequence'),
    src: z.url(),
    frames: z.number().int().positive(),
    caption: z.string(),
  }),
]);

/** Tech stack, categorised by function. */
const techStack = z
  .object({
    // Storyboarding, wireframing, look development -- the thinking that happens
    // before anything is built. Figma belongs here on a film, not in
    // Frontend/Logic, because the deliverable is a video, not an interface.
    design_preproduction: listOf(z.string()),
    cad_3d: listOf(z.string()),
    frontend_logic: listOf(z.string()),
    motion_compositing: listOf(z.string()),
    ai_orchestration: listOf(z.string()),
    infrastructure: listOf(z.string()),
  })
  .strict();

/** How LLMs / agents actually did work here — not "AI-powered" hand-waving. */
const llmOrchestration = z
  .object({
    summary: z.string().min(20).max(320),
    models: z.array(z.string()).default([]),
    patterns: z
      .array(
        z.enum([
          'mcp-server',
          'agent-workflow',
          'api-pipeline',
          'script-generation',
          'structured-extraction',
          'eval-harness',
          'rag',
          'batch-inference',
        ]),
      )
      .min(1),
    autonomy: z.enum(['assistive', 'semi-autonomous', 'autonomous']),
    human_in_the_loop: z.string().optional(),
  })
  .strict();

/**
 * The Mermaid SOURCE lives in the MDX body as a ```mermaid fence — the only
 * place rehype-mermaid can reach it. Frontmatter carries the framing.
 */
const pipelineDiagram = z
  .object({
    title: z.string(),
    kind: z.enum(['system-architecture', 'production-pipeline', 'data-flow', 'state-machine']),
    caption: z.string().min(20),
  })
  .strict();

const engineeringChallenge = z
  .object({
    constraint: z.string().min(40).max(320),
    resolution: z.string().min(40).max(480),
  })
  .strict();

/** Concrete, checkable numbers. `method` is what separates this from marketing. */
const metric = z
  .object({
    label: z.string(),
    value: z.string(),
    baseline: z.string().optional(),
    delta: z.string().optional(),
    method: z.string().optional(),
  })
  .strict();

/* ------------------------------------------------------------------ *
 * Collection
 * ------------------------------------------------------------------ */

const work = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/work' }),

  // `image()` is only available inside the function form of `schema`.
  schema: ({ image }) => {
    /**
     * TIER 1 — Preview media, in git.
     *
     * A discriminated union, because the three categories produce genuinely
     * different artefacts: web apps have screen recordings, 3D work is often a
     * single hero still, motion work is a loop. Forcing every project through a
     * video shape would mean fabricating encodes for still renders.
     */
    const previewVideo = z
      .object({
        kind: z.literal('video'),
        // Video is never processed by Astro, so tier-1 clips live in /public.
        poster: z.string().startsWith('/media/'),
        webm: z.string().startsWith('/media/').endsWith('.webm'),
        mp4: z.string().startsWith('/media/').endsWith('.mp4'),
        /** Loop length. The brief calls for 3-6s; 2-8 is the hard fail band. */
        duration_s: z.number().min(2).max(8),
        /** Largest of the two encodes, in bytes. Hard ceiling 5 MB. */
        bytes: z.number().int().positive().max(5 * 1024 * 1024),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        alt: z.string().min(10),
      })
      .strict();

    const previewImage = z
      .object({
        kind: z.literal('image'),
        /**
         * Routed through Astro's asset pipeline: AVIF/WebP derivatives and a
         * responsive srcset are generated at build, and width/height come from
         * the file itself, so the source PNG never reaches a browser.
         */
        src: image(),
        alt: z.string().min(10),
        /** Optional: a still that animates on hover, without a video encode. */
        hover_src: blankable(image()),
      })
      .strict();

    return z
      .object({
        title: z.string().max(60),
        tagline: z.string().min(20).max(120),
        category: z.enum(CATEGORY_IDS),
        /** Precise ownership. "Contributor" is not a role; say what you did. */
        role: z.string().min(10),
        date: z.coerce.date(),
        /** false = draft: visible in `astro dev`, excluded from production. */
        published: z.boolean().default(false),
        order: blankable(z.number().int()),

        live_url: blankable(z.url()),
        repo_url: blankable(z.url()),

        featured_preview: z.discriminatedUnion('kind', [previewVideo, previewImage]),
        /** Additional stills — contact sheets, alternate angles, detail crops. */
        gallery: z
          .array(z.object({ src: image(), caption: z.string() }).strict())
          .default([]),
        deep_dive_media: listOf(deepDiveMedia),

        tech_stack: techStack,
        llm_orchestration: blankable(llmOrchestration),
        pipeline_diagram: blankable(pipelineDiagram),
        engineering_challenge: blankable(engineeringChallenge),
        metrics: listOf(metric),

        og_image: blankable(z.string().startsWith('/og/')),
      })
      .strict()
      /**
       * Publication gate. Drafts may be skeletal; published entries may not.
       * This is the rule that keeps a half-finished phone upload from ever
       * reaching production looking unfinished.
       */
      .superRefine((p, ctx) => {
        if (!p.published) return;

        const require = (cond: boolean, path: string, message: string) => {
          if (!cond) ctx.addIssue({ code: 'custom', path: [path], message });
        };

        // A film or motion piece legitimately has no live site and no repo --
        // the deliverable IS the video, which lives in deep_dive_media. The
        // rule is "the work must be reachable somehow", not "must ship code".
        require(
          !!(p.live_url || p.repo_url || p.deep_dive_media.length > 0),
          'live_url',
          'Published projects need a live_url, a repo_url, or at least one deep_dive_media entry.',
        );
        require(p.metrics.length > 0, 'metrics', 'Published projects need at least one metric.');
        require(!!p.pipeline_diagram, 'pipeline_diagram', 'Published projects need a pipeline diagram.');
        require(!!p.engineering_challenge, 'engineering_challenge', 'Published projects need an engineering_challenge.');
        require(
          Object.values(p.tech_stack).some((bucket) => bucket.length > 0),
          'tech_stack',
          'Published projects must name at least one tool.',
        );

        // Catches template text that survived an edit.
        const leftovers = JSON.stringify(p).match(/TODO|Placeholder|placeholder/g);
        require(!leftovers, 'title', `Published entry still contains ${leftovers?.length ?? 0} TODO/placeholder marker(s).`);
      });
  },
});

export const collections = { work };
