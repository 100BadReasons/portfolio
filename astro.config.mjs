// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeMermaid from 'rehype-mermaid';
import { unified } from '@astrojs/markdown-remark';
import rehypeWrapMermaid from './src/lib/rehype-wrap-mermaid.mjs';

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
    // Keep the CMS out of the sitemap. It carries a noindex meta tag, but
    // listing it here actively advertises the admin URL to crawlers -- a
    // regression from moving it out of public/ into a page route.
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
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
              // Mermaid's built-in dark theme rather than 'base'. Both can be made
              // to work, but 'base' derives a dozen colours from primaryColor and
              // needs each one overridden by hand; 'dark' is internally coherent
              // and needs only the few below to match the site palette.
              theme: 'dark',
              darkMode: true,
              fontFamily: 'Helvetica Neue, Helvetica, Arial, Liberation Sans, sans-serif',
              flowchart: { curve: 'linear', htmlLabels: true },
              themeVariables: {
                background: '#000000',
                mainBkg: '#1a1a1a',
                nodeBorder: '#404040',
                lineColor: '#a8a8a8',
                textColor: '#f5f5f5',
                nodeTextColor: '#f5f5f5',
                clusterBkg: '#121212',
                clusterBorder: '#262626',
                edgeLabelBackground: '#000000',
                fontSize: '13px',
              },
            },
          },
        ],
        // Must run after rehype-mermaid: it wraps that plugin's output.
        rehypeWrapMermaid,
      ],
    }),
  },

  build: {
    // One directory per route -> /work/pptx-studio/index.html
    format: 'directory',
    inlineStylesheets: 'auto',
  },
});
