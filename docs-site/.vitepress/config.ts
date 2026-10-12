// SPDX-License-Identifier: EPL-2.0
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfigWithTheme, type DefaultTheme, type MarkdownRenderer } from 'vitepress';
import type { ComponentStrings } from './theme/strings.js';
import {
  assertLocaleComplete,
  COMPONENTS_BY_LANG,
  EN,
  LOCALES,
  navFor,
  sidebarFor,
  TRANSLATABLE_EXCLUDES,
} from './i18n.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { description: string };

/** The default theme's config plus this site's component-strings table. */
export interface SiteThemeConfig extends DefaultTheme.Config {
  componentsByLang?: Readonly<Record<string, ComponentStrings>>;
}

const DOCS_ROOT = path.resolve(import.meta.dirname, '..');
for (const prefix of Object.keys(LOCALES)) {
  assertLocaleComplete(DOCS_ROOT, prefix, TRANSLATABLE_EXCLUDES);
}

/**
 * The `locales:` block — root English plus every registered translation.
 * Only complete languages appear; see `i18n.ts` on why a half-translated
 * locale is worse than an absent one.
 */
function localesConfig() {
  return {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: { nav: navFor('', EN), sidebar: sidebarFor('', EN) },
    },
    ...Object.fromEntries(
      Object.entries(LOCALES).map(([prefix, loc]) => [
        prefix,
        {
          label: loc.label,
          lang: loc.lang,
          themeConfig: {
            nav: navFor(`/${prefix}`, loc.ui),
            sidebar: sidebarFor(`/${prefix}`, loc.ui),
          },
        },
      ]),
    ),
  };
}

const GITHUB_BLOB_BASE = 'https://github.com/knowvah/elk-engine/blob/main/';

/**
 * Pages that are `<!--@include: ../docs/...-->` wrappers, mapped to the repo
 * directory of the included source. VitePress substitutes the included text
 * verbatim, so the canonical docs' relative links would resolve against the
 * wrapper's URL and go dead; `rewriteIncludedHref` re-resolves them against
 * the source directory instead.
 */
const INCLUDE_SOURCE_DIR: Readonly<Record<string, string>> = {
  'conformance.md': 'docs',
  'guide/architecture.md': 'docs/architecture',
  'guide/translation-rules.md': 'docs',
  'guide/collections-rules.md': 'docs',
  'guide/port-map.md': 'docs/architecture',
  'guide/inventory.md': 'docs/architecture',
  'guide/roadmap.md': 'plans',
};

/** Repo-relative source file -> the site page that publishes it. */
const CANONICAL_PAGES: Readonly<Record<string, string>> = {
  'docs/conformance.md': '/conformance',
  'docs/architecture/overview.md': '/guide/architecture',
  'docs/architecture/component-map.md': '/guide/architecture#component-map',
  'docs/architecture/port-map.md': '/guide/port-map',
  'docs/architecture/inventory.md': '/guide/inventory',
  'docs/translation-rules.md': '/guide/translation-rules',
  'docs/translation-rules-collections.md': '/guide/collections-rules',
  'plans/roadmap.md': '/guide/roadmap',
};

const NON_RELATIVE_HREF = /^(?:\/|#|[a-zA-Z][a-zA-Z0-9+.-]*:)/;

/**
 * Rewrites a relative `href` found in an included source file: to the site
 * page that publishes the target, else to its GitHub blob. Any other href is
 * returned unchanged.
 */
export function rewriteIncludedHref(href: string, sourceDir: string): string {
  if (NON_RELATIVE_HREF.test(href)) return href;
  const hashAt = href.indexOf('#');
  const target = hashAt === -1 ? href : href.slice(0, hashAt);
  const fragment = hashAt === -1 ? '' : href.slice(hashAt);
  const resolved = path.posix.normalize(path.posix.join(sourceDir, target));
  const canonical = CANONICAL_PAGES[resolved];
  if (canonical === undefined) return `${GITHUB_BLOB_BASE}${resolved}${fragment}`;
  return canonical.includes('#') ? canonical : `${canonical}${fragment}`;
}

type LinkOpenRule = NonNullable<MarkdownRenderer['renderer']['rules']['link_open']>;

/** Wraps markdown-it's `link_open` so included pages get rewritten hrefs. */
function installIncludeLinkRewrite(md: MarkdownRenderer): void {
  const previous: LinkOpenRule =
    md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const sourceDir = INCLUDE_SOURCE_DIR[(env as { relativePath?: string }).relativePath ?? ''];
    const token = tokens[idx];
    const href = token?.attrGet('href');
    if (sourceDir !== undefined && token !== undefined && href != null) {
      token.attrSet('href', rewriteIncludedHref(href, sourceDir));
    }
    return previous(tokens, idx, options, env, self);
  };
}

// Deployed at https://elk-engine.knowvah.com/ (GitHub Pages custom domain) —
// the site is served from the domain root, so base MUST be '/'. A '/<repo>/'
// base makes every CSS/JS/font asset 404 and the page renders unstyled.

export default defineConfigWithTheme<SiteThemeConfig>({
  base: '/',
  title: '@knowvah/elk-engine',
  description: pkg.description,
  lang: 'en-US',
  cleanUrls: true,
  locales: localesConfig(),
  markdown: { config: installIncludeLinkRewrite },
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
    componentsByLang: COMPONENTS_BY_LANG,
    socialLinks: [{ icon: 'github', link: 'https://github.com/knowvah/elk-engine' }],
  },
});
