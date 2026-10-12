// SPDX-License-Identifier: EPL-2.0
// Mechanical half of translation review (translation-spec.md "Hard rules"):
// what can still be verified without reading the language. Runs against the
// real docs-site for every registered locale, and against fixtures that plant
// one defect per check.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOCALES, TRANSLATABLE_EXCLUDES } from '../../docs-site/.vitepress/i18n.js';
import { EN_COMPONENTS, type ComponentStrings } from '../../docs-site/.vitepress/theme/strings.js';
import {
  CHECKS,
  checkComponents,
  englishOnlyMatcher,
  englishPathsFor,
  extractInternalLinks,
  isStale,
  lintPage,
  listTranslatedPages,
  loadEnglish,
  loadPage,
  parsePage,
  scanFences,
  staticAssetsOf,
  type LinkContext,
  type Violation,
} from '../helpers/docs.js';

interface CopyGoldens {
  localizeGoldens(
    entries: { id: string; algorithm: string; description: string }[],
    translations: Record<string, unknown>,
  ): { missingIds: string[] };
}

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const copyGoldens = (await import(pathToFileURL(here('../../docs-site/copy-goldens.mjs')).href)) as CopyGoldens;

const REPO = here('../../');
const FIXTURE = here('./fixtures/lint/');
const LOCALES_DIR = `${REPO}docs-site/.vitepress/locales`;
const FIXTURE_PREFIX = 'xx';
const FIXTURE_FILE = (rel: string): string => `docs-site/${FIXTURE_PREFIX}/${rel}`;
const UNPREFIXED = 'link /guide/clean must be prefixed /xx/ (or be English-only/static)';
const FIXTURE_PAGES = [
  'guide/arch.md',
  'guide/architecture.md',
  'guide/clean.md',
  'guide/comp.md',
  'guide/fence.md',
  'guide/hash.md',
  'guide/hero.md',
  'guide/include.md',
  'guide/link.md',
  'guide/stale.md',
  'guide/tag.md',
];
const XX: ComponentStrings = { ...EN_COMPONENTS, elkSource: 'ELK-JSON-Quelle' };
const GALLERY = '<GoldenGallery />';

function contextFor(root: string, prefix: string): LinkContext {
  return {
    prefix,
    isEnglishOnly: englishOnlyMatcher(TRANSLATABLE_EXCLUDES),
    staticAssets: staticAssetsOf(root),
  };
}

const manifest = JSON.parse(readFileSync(`${REPO}test/corpus/manifest.json`, 'utf8')) as {
  golden: { id: string; algorithm: string; note: string }[];
};
const goldenEntries = manifest.golden.map((g) => ({ id: g.id, algorithm: g.algorithm, description: g.note }));

function localeModules(): string[] {
  if (!existsSync(LOCALES_DIR)) return [];
  return readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => f.slice(0, -3))
    .sort();
}

describe('translated pages of registered locales', () => {
  const prefixes = Object.keys(LOCALES).sort();

  it(`registers exactly the locale modules (${prefixes.length} locales)`, () => {
    expect(prefixes).toEqual(localeModules());
  });

  for (const prefix of prefixes) {
    const locale = LOCALES[prefix];
    if (!locale) continue;
    const ctx = contextFor(REPO, prefix);
    const strings = { en: EN_COMPONENTS, locale: locale.components };
    describe(prefix, () => {
      for (const rel of listTranslatedPages(REPO, prefix)) {
        const found = lintPage(REPO, rel, ctx, strings);
        it.each(CHECKS)(`${rel}: %s`, (check) => {
          expect(found.filter((x) => x.check === check).map((x) => x.message)).toEqual([]);
        });
      }

      it('translates every golden description', () => {
        const translations = JSON.parse(readFileSync(`${LOCALES_DIR}/goldens/${prefix}.json`, 'utf8')) as Record<
          string,
          unknown
        >;
        expect(copyGoldens.localizeGoldens(goldenEntries, translations).missingIds).toEqual([]);
      });

      it('reports stale pages without failing', () => {
        const pages = listTranslatedPages(REPO, prefix);
        const stale = pages.filter((rel) => isStale(REPO, prefix, rel));
        if (stale.length > 0) console.warn(`${prefix}: ${stale.length} stale page(s): ${stale.join(', ')}`);
        // Staleness is reported, never failed (D9); the only invariant is that every stale page is a page.
        expect(stale.filter((rel) => !pages.includes(rel))).toEqual([]);
      });
    });
  }
});

describe('lint against planted defects (fixture locale xx)', () => {
  const ctx = contextFor(FIXTURE, FIXTURE_PREFIX);
  const lint = (rel: string): Violation[] => lintPage(FIXTURE, rel, ctx, { en: EN_COMPONENTS, locale: XX });
  const messages = (rel: string): string[] => lint(rel).map((x) => x.message);

  it('lists fixture pages without the generated showcase', () => {
    expect(listTranslatedPages(FIXTURE, FIXTURE_PREFIX)).toEqual(FIXTURE_PAGES);
  });

  it('passes the clean page on every check and records a current hash', () => {
    expect(lint('guide/clean.md')).toEqual([]);
    expect(isStale(FIXTURE, FIXTURE_PREFIX, 'guide/clean.md')).toBe(false);
  });

  it('fails a changed character in a ts fence, naming file and fence number', () => {
    expect(lint('guide/fence.md')).toEqual([
      { check: 'fences', file: FIXTURE_FILE('guide/fence.md'), message: 'fence #1 (ts): body differs from English' },
    ]);
  });

  it('fails an unprefixed link but allows English-only, static and external links', () => {
    expect(lint('guide/link.md')).toEqual([
      { check: 'links', file: FIXTURE_FILE('guide/link.md'), message: UNPREFIXED },
    ]);
  });

  it('counts front-matter link: values as links', () => {
    expect(messages('guide/hero.md')).toEqual([UNPREFIXED]);
  });

  it('fails a component string left in English', () => {
    expect(messages('guide/comp.md')).toEqual([
      'elkSource: missing "ELK-JSON-Quelle"',
      'elkSource: English "ELK JSON source" remains',
    ]);
  });

  it('leaves control words alone on a page that embeds no component', () => {
    const en = parsePage('# Guide\n\nOpen the ELK JSON source.\n');
    const tr = parsePage('# Gyde\n\nOpen the ELK JSON source.\n');
    expect(checkComponents(en, tr, { en: EN_COMPONENTS, locale: XX }, 'xx/guide/prose.md')).toEqual([]);
  });

  it('does not see the English string inside a locale string that contains it', () => {
    const locale = { ...EN_COMPONENTS, elkSource: 'ELK JSON source-Ansicht' };
    const strings = { en: EN_COMPONENTS, locale };
    const en = parsePage(`# E\n\n${GALLERY}\n\nOpen the ELK JSON source.\n`);
    const ok = parsePage(`# E\n\n${GALLERY}\n\nÖffne die ELK JSON source-Ansicht.\n`);
    expect(checkComponents(en, ok, strings, 'xx/e.md')).toEqual([]);
    const left = parsePage(`# E\n\n${GALLERY}\n\nELK JSON source-Ansicht oder ELK JSON source.\n`);
    expect(checkComponents(en, left, strings, 'xx/e.md')).toEqual([
      { check: 'components', file: 'xx/e.md', message: 'elkSource: English "ELK JSON source" remains' },
    ]);
  });

  it('fails a missing sourceHash', () => {
    expect(messages('guide/hash.md')).toEqual(['front matter has no sourceHash']);
  });

  it('fails a dropped <GoldenGallery tag', () => {
    expect(messages('guide/tag.md')).toEqual(['<GoldenGallery> count 0, English has 1']);
  });

  it('fails a leftover @include directive', () => {
    expect(messages('guide/include.md')).toEqual([
      'contains an <!--@include: directive; translate the included content',
    ]);
  });

  it('reports a stale page as stale but not as a violation', () => {
    expect(lint('guide/stale.md')).toEqual([]);
    expect(isStale(FIXTURE, FIXTURE_PREFIX, 'guide/stale.md')).toBe(true);
  });

  it('drops plantuml fences from the English side before comparing fences', () => {
    const en = loadEnglish(FIXTURE, FIXTURE_PREFIX, 'guide/arch.md');
    expect(en.fences).toEqual([{ info: 'ts', body: 'const a = 1;' }]);
    expect(lint('guide/arch.md')).toEqual([]);
  });

  it('concatenates several English sources and keeps their fences in order', () => {
    expect(englishPathsFor(FIXTURE_PREFIX, 'guide/architecture.md', FIXTURE)).toEqual([
      'docs/architecture/overview.md',
      'docs/architecture/component-map.md',
    ]);
    const en = loadEnglish(FIXTURE, FIXTURE_PREFIX, 'guide/architecture.md');
    expect(en.fences.map((f) => f.body)).toEqual(['const overview = 1;', 'const map = 2;']);
    expect(lint('guide/architecture.md')).toEqual([]);
    expect(isStale(FIXTURE, FIXTURE_PREFIX, 'guide/architecture.md')).toBe(false);
  });
});

describe('helpers', () => {
  it('keeps a ```` fence containing ``` as one block and supports ~~~', () => {
    const { fences } = scanFences('````md\n```x\ny\n```\n````\n\n~~~ts\nlet a;\n~~~\n');
    expect(fences).toEqual([
      { info: 'md', body: '```x\ny\n```' },
      { info: 'ts', body: 'let a;' },
    ]);
  });

  it('extracts markdown and html links, skipping code and external URLs', () => {
    const page = parsePage(
      '[a](/x/y#z) <a href="/p?q=1">b</a> `[c](/code)` [d](https://e.com) [e](//cdn/x)\n```\n[f](/fence)\n```\n',
    );
    expect(extractInternalLinks(page.prose)).toEqual(['/x/y#z', '/p?q=1']);
  });

  it('derives English-only URLs from the excludes, not showcase', () => {
    const only = englishOnlyMatcher(TRANSLATABLE_EXCLUDES);
    expect(['/parity', '/guide/roadmap', '/guide/overview', '/showcase/layered', '/conformance'].filter(only)).toEqual([
      '/parity',
      '/guide/roadmap',
    ]);
  });

  it('parses front matter keys and link values', () => {
    const page = loadPage(`${FIXTURE}docs-site/xx/guide/hero.md`);
    expect(page.frontMatter['title']).toBe('Start');
    expect(page.frontMatterLinks).toEqual(['/guide/clean']);
  });
});
