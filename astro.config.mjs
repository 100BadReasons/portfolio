// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeMermaid from 'rehype-mermaid';
import { unified } from '@astrojs/markdown-remark';

/**
 * Deploy target: GitHub Pages *project* repo.
 *   site + base  ->  https://100badreasons.github.io/portfolio/
 *
 * IMPORTANT: Astro does NOT auto-prefix `href`/`src` you write by hand.
 * Always route internal links through `withBase()` in src/lib/url.ts.
 */
export default defineConfig({
  site: 'https://100badreasons.github.io',
  base: '/portfolio',
  trailingSlash: 'ignore',

  integrations: [
    // The markdown config below applies to .mdx too.
    mdx(),
    sitemap(),
  ],

  markdown: {
    // Shiki would otherwise convert ```mermaid fences into highlighted markup
    // before rehype-mermaid ever sees them. Excluding the lang leaves a plain
    // <pre><code class="language-mermaid"> for rehype-mermaid to consume.
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },

    /**
     * Astro 7 defaults to Satteri, a Rust Markdown/MDX processor. Passing an
     * explicit `processor` opts this project back onto the unified/remark
     * pipeline, which is what rehype-mermaid plugs into.
     *
     * Why not Satteri: its Mermaid plugin is pre-1.0 with ~240 weekly downloads,
     * against rehype-mermaid's ~110k. Satteri's win scales with Markdown volume
     * and is negligible at ~10 case studies. Revisit when that plugin matures.
     *
     * NOTE: the deprecated form is top-level `markdown.rehypePlugins`, which is
     * scheduled for removal in Astro 8. This `processor: unified()` form is the
     * supported way to keep remark/rehype plugins.
     */
    processor: unified({
      rehypePlugins: [
        [
          rehypeMermaid,
          {
            // Renders each diagram to SVG at build time via headless Chromium
            // and inlines it. Ships 0 KB of Mermaid runtime; no FOUC, no layout
            // shift, diagram text is selectable and crawlable.
            strategy: 'inline-svg',
            mermaidConfig: {
              theme: 'base',
              // Must be a concrete stack, not a CSS variable: Mermaid measures
              // label widths in headless Chromium at build time, where var()
              // cannot resolve. A variable silently produces clipped nodes.
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              flowchart: { curve: 'linear', htmlLabels: true },
              themeVariables: {
                primaryColor: '#ffffff',
                primaryTextColor: '#0a0a0a',
                primaryBorderColor: '#0a0a0a',
                lineColor: '#0a0a0a',
                secondaryColor: '#f4f4f4',
                tertiaryColor: '#ffffff',
                fontSize: '13px',
              },
            },
          },
        ],
      ],
    }),
  },

  build: {
    // One directory per route -> /work/pptx-studio/index.html
    format: 'directory',
    inlineStylesheets: 'auto',
  },
});
