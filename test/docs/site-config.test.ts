// SPDX-License-Identifier: EPL-2.0
// docs-publish-prep T5 (DP5): the two facts of the VitePress config that `npm run docs:linkcheck` depends on.
//
// `cleanUrls: true` is why the check runs linkinator with `--clean-urls` (the site links `/guide/overview`, the file is
// `guide/overview.html`). `i18nRouting: false` is the fix for the language switcher: with it unset, the default theme's
// `useLangs({ correspondingLink: true })` (vitepress `theme-default/composables/langs.js:15`) appends the current page
// path to every locale prefix, and an English-only page (`TRANSLATABLE_EXCLUDES`) has no copy under any locale, so each
// such page carried one dead link per registered locale.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES, TRANSLATABLE_EXCLUDES } from '../../docs-site/.vitepress/i18n.js';
import { repoRoot } from '../corpus/corpus.js';

// config.ts is loaded through a variable specifier so that `tsc` does not pull VitePress's own declaration files
// into the program: they do not pass this project's `skipLibCheck: false` (DOM-only names, a circular alias).
const CONFIG_MODULE = '../../docs-site/.vitepress/config.js';

/** What this test reads from `docs-site/.vitepress/config.ts`. */
interface SiteConfigModule {
  readonly default: { readonly cleanUrls?: boolean; readonly themeConfig?: { readonly i18nRouting?: boolean } };
  pageHeadingSlug(text: string, relativePath: string): string;
  referenceHeadingSlug(text: string): string;
}

const site = (await import(CONFIG_MODULE)) as SiteConfigModule;
const { default: config, pageHeadingSlug, referenceHeadingSlug } = site;

const ROOT = repoRoot();
const DIST = 'docs-site/.vitepress/dist';

function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(ROOT, relative), 'utf8')) as Record<string, unknown>;
}

describe('docs-site config: what the link check depends on (DP5)', () => {
  it('serves clean URLs', () => {
    expect(config.cleanUrls).toBe(true);
  });

  it('turns off corresponding-page links in the language switcher', () => {
    expect(config.themeConfig?.i18nRouting).toBe(false);
  });

  it('has the condition that makes corresponding-page links dead: locales and English-only pages', () => {
    expect(Object.keys(LOCALES).length).toBeGreaterThan(0);
    expect(TRANSLATABLE_EXCLUDES).toContain('guide/getting-started.md');
    expect(TRANSLATABLE_EXCLUDES).toContain('reference/');
  });
});

// The generated API reference (typedoc-vitepress-theme) writes its link anchors with VitePress's default slug rule,
// while the rest of the site uses `headingSlug` (GitHub's rule as ruled in #94: see the next block). The expected
// values below are the outputs of the theme's own `slugifyAnchor`
// (tools/typedoc/node_modules/typedoc-vitepress-theme/dist/utils/utils.js) for the same inputs, recorded before
// `referenceHeadingSlug` was written.
describe('heading ids of the generated API reference (DP5)', () => {
  it.each([
    ['PARALLEL_NODE', 'parallel-node'],
    ['SPACING_INDIVIDUAL', 'spacing-individual'],
    ['INSIDE_SELF_LOOPS_ACTIVATE', 'inside-self-loops-activate'],
    ['compareTo()', 'compareto'],
    ['valueOf()', 'valueof'],
    ['Class: TopdownNodeTypes', 'class-topdownnodetypes'],
    ['ILayoutMetaDataProvider.Registry', 'ilayoutmetadataprovider-registry'],
    ['2D layout', '_2d-layout'],
    ['\u00dcber  uns', 'uber-uns'],
    ['a--b_ c', 'a-b-c'],
  ])('slugs %j as the reference links do: %j', (heading, slug) => {
    expect(referenceHeadingSlug(heading)).toBe(slug);
  });

  it('uses the reference rule under reference/ and the GitHub rule everywhere else', () => {
    expect(pageHeadingSlug('PARALLEL_NODE', 'reference/classes/TopdownNodeTypes.md')).toBe('parallel-node');
    expect(pageHeadingSlug('PARALLEL_NODE', 'guide/getting-started.md')).toBe('parallel_node');
    expect(pageHeadingSlug('1. Oracle', 'conformance.md')).toBe('1-oracle');
    expect(pageHeadingSlug('1. Oracle', 'de/conformance.md')).toBe('1-oracle');
  });
});

// Issue #94 (ruling of 2026-11-20): outside the reference, a heading keeps connector punctuation (Unicode Pc: `_`,
// U+203F, U+FF3F and the like), as github-slugger does, so a heading that names a Java identifier keeps its
// underscores. Non-ASCII whitespace still becomes `-`, where GitHub drops it. The expected values of the first six
// rows are the outputs of github-slugger 2.0.0's `slug()`; those of the last two are the site's own values before
// the rule changed, which the ruling keeps. All were recorded before `\p{Pc}` joined the kept classes.
describe('heading ids outside the API reference (issue #94)', () => {
  it.each([
    ['snake_case heading', 'snake_case-heading'],
    ['PARALLEL_NODE', 'parallel_node'],
    ['a\u203fb', 'a\u203fb'],
    ['a\uff3fb', 'a\uff3fb'],
    ['1. Oracle', '1-oracle'],
    ['A \u2014 B', 'a--b'],
    ['a\u00a0b', 'a-b'],
    ['foo\u2003bar', 'foo-bar'],
  ])('slugs %j as %j', (heading, slug) => {
    expect(pageHeadingSlug(heading, 'guide/getting-started.md')).toBe(slug);
  });
});

// linkinator recurses only into URLs that start with the root they were found from (linkinator
// build/src/index.js:892, `href.startsWith(rootPath)`). The site root covers every page a link reaches; the two pages no
// nav links (DP6) need roots of their own, and the reference needs a directory root so that its pages are crawled, not
// only fetched: with `reference/index.html` as the root, 18 dead anchors inside the reference went unreported.
describe('docs:linkcheck (DP5)', () => {
  const scripts = readJson('package.json')['scripts'] as Record<string, string>;

  it('crawls the site root, the getting-started page and the reference directory', () => {
    const roots = '. guide/getting-started.html reference/';
    expect(scripts['docs:linkcheck']).toBe(`linkinator ${roots} --config docs-site/linkinator.config.json`);
    expect(scripts['docs:linkcheck:external']).toBe(
      `linkinator ${roots} --config docs-site/linkinator.external.config.json`,
    );
  });

  it('checks internal links and fragments over the built site, with clean URLs, and skips other hosts', () => {
    expect(readJson('docs-site/linkinator.config.json')).toEqual({
      recurse: true,
      cleanUrls: true,
      checkFragments: true,
      serverRoot: DIST,
      skip: ['^https?://(?!localhost|127\\.0\\.0\\.1|\\[::1\\])'],
    });
  });

  it('the internal skip pattern spares the local server and skips every other host', () => {
    const [pattern] = readJson('docs-site/linkinator.config.json')['skip'] as string[];
    const skip = new RegExp(pattern ?? '');
    const urls = ['http://localhost:9999/guide/overview', 'http://127.0.0.1:9999/', 'http://[::1]:9999/reference/'];
    expect(urls.map((url) => skip.test(url))).toEqual([false, false, false]);
    expect(['https://github.com/knowvah/elk-engine', 'http://eclipse.dev/elk'].map((url) => skip.test(url))).toEqual([
      true,
      true,
    ]);
  });

  it('the external variant follows other hosts with a timeout and retries', () => {
    const external = readJson('docs-site/linkinator.external.config.json');
    expect(external['skip']).toBeUndefined();
    expect(external['serverRoot']).toBe(DIST);
    expect([external['recurse'], external['cleanUrls'], external['retry'], external['retryErrors']]).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(external['timeout']).toBe(20000);
  });
});
