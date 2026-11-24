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

/**
 * Heading ids by github-slugger's rule for letters, numbers, marks and
 * connector punctuation: lowercase, drop every character that is not one of
 * those, whitespace or a hyphen, then turn each whitespace character into a
 * hyphen. Connector punctuation (Unicode Pc: `_`, `‿`, `＿`, …) is kept, so a
 * heading that names a Java identifier keeps its underscores (`PARALLEL_NODE`
 * is `#parallel_node`; issue #94). Diacritics stay. One ruled difference from
 * GitHub (issue #94): every whitespace character becomes a hyphen, where
 * GitHub does that for the ASCII space only and drops the rest (U+00A0,
 * U+2003, …). Other characters can still differ: github-slugger works from a
 * fixed character list, this rule from the runtime's Unicode classes. The
 * canonical docs under `docs/` are written for GitHub, where
 * `## 1. Oracle` is `#1-oracle` and `## 2.0 How …` is `#20-how-…`; VitePress's
 * default (`_1-oracle`, `2-0-how-…`) makes every such in-page link silently
 * miss on the site. The client scrolls by `getElementById`, so a leading digit
 * is safe. Translated pages follow the same rule, so their anchors keep
 * umlauts (`#1a-konformitätseinheit`).
 */
const NOT_SLUG_CHARS = /[^\p{L}\p{N}\p{M}\p{Pc}\s-]/gu;
export function headingSlug(text: string): string {
  return text.trim().toLowerCase().replace(NOT_SLUG_CHARS, '').replace(/\s/g, '-');
}

/** Site-relative directory of the generated API reference (`npm run docs:api`, tools/typedoc). */
const REFERENCE_DIR = 'reference/';
const COMBINING_MARKS = /[\u0300-\u036f]/g;
const CONTROL_CHARS = /[\u0000-\u001f]/g;
// Whitespace and ASCII punctuation, underscore included, plus the four typographic quotes. Built from a string with
// escapes because lizard mis-tokenizes a regex literal that holds a quote character (.agent-notes/docs-site.md).
const SEPARATOR_RUNS = new RegExp(
  '[\\s~\\x60!@#$%^&*()\\-_+=[\\]{}|\\\\;:\\x22\\x27\\u201c\\u201d\\u2018\\u2019<>,.?/]+',
  'g',
);

/**
 * Heading ids for the generated API reference. typedoc-vitepress-theme writes every link anchor with VitePress's
 * default slug rule (its `slugifyAnchor`), not GitHub's: `PARALLEL_NODE` is linked as `#parallel-node`, where
 * `headingSlug` would give the heading the id `parallel_node` and the link would miss. So the reference pages get their
 * ids by the rule their links were written with: strip accents and control characters, turn each run of whitespace
 * or punctuation into one hyphen, trim hyphens, guard a leading digit with `_`, lowercase.
 */
export function referenceHeadingSlug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(CONTROL_CHARS, '')
    .replace(SEPARATOR_RUNS, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase();
}

/** The heading id for a page: the reference rule under `reference/`, `headingSlug` everywhere else. */
export function pageHeadingSlug(text: string, relativePath: string): string {
  return relativePath.startsWith(REFERENCE_DIR) ? referenceHeadingSlug(text) : headingSlug(text);
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
  markdown: {
    anchor: {
      slugify: headingSlug,
      // Takes precedence over `slugify` in markdown-it-anchor; the state carries the page being rendered.
      slugifyWithState: (text, state) =>
        pageHeadingSlug(text, (state.env as { relativePath?: string }).relativePath ?? ''),
    },
    toc: { slugify: headingSlug },
    config: installIncludeLinkRewrite,
  },
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
    // The language switcher links each locale's home page, not the page being read. With i18nRouting unset the
    // default theme (`useLangs({ correspondingLink: true })`, theme-default/composables/langs.js:15) appends the
    // current page path to every locale prefix, and it has no per-page switch. English-only pages
    // (TRANSLATABLE_EXCLUDES: the reference wrappers, parity, getting-started, the API reference) exist under no
    // locale, so each of them carried one dead link per registered locale. `npm run docs:linkcheck` guards this.
    i18nRouting: false,
    socialLinks: [{ icon: 'github', link: 'https://github.com/knowvah/elk-engine' }],
  },
});
