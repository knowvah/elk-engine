// SPDX-License-Identifier: EPL-2.0
import { createRequire } from 'node:module';
import { defineConfig } from 'vitepress';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { description: string };

// Deployed at https://elk-engine.knowvah.com/ (GitHub Pages custom domain) —
// the site is served from the domain root, so base MUST be '/'. A '/<repo>/'
// base makes every CSS/JS/font asset 404 and the page renders unstyled.

export default defineConfig({
  base: '/',
  title: '@knowvah/elk-engine',
  description: pkg.description,
  lang: 'en-US',
  cleanUrls: true,
  head: [
    // The mark comes from @knowvah/theme, copied into docs-site/public/ by
    // `npm run docs:brand` (docs-site/copy-brand-assets.mjs).
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/knowvah_logo.svg' }],
    ['meta', { name: 'theme-color', content: '#c45d3e' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: '@knowvah/elk-engine' }],
  ],
  themeConfig: {
    // Nav-bar mark, beside the site title.
    logo: '/knowvah_logo.svg',
    // Built-in offline search (MiniSearch); no external service.
    search: { provider: 'local' },
    // English literals for now; T2 replaces them with navFor/sidebarFor from i18n.ts.
    nav: [
      { text: 'Guide', link: '/guide/overview' },
      { text: 'Conformance', link: '/conformance' },
      { text: 'Showcase', link: '/showcase/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Overview', link: '/guide/overview' },
          { text: 'Architecture', link: '/guide/architecture' },
          { text: 'Java foundations', link: '/guide/java-foundations' },
          { text: 'Contributing', link: '/guide/contributing' },
        ],
      },
      {
        text: 'Verification',
        items: [
          { text: 'Conformance', link: '/conformance' },
          { text: 'Parity report', link: '/parity' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/knowvah/elk-engine' }],
  },
});
