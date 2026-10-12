// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOCALES } from '../../docs-site/.vitepress/i18n.js';

interface Entry {
  id: string;
  algorithm: string;
  description: string;
}
interface GoldenRef {
  id: string;
  description: string;
  algorithm: string;
  graph: unknown;
}
interface Grouped {
  order: string[];
  counts: Record<string, number>;
  byAlgorithm: Record<string, GoldenRef[]>;
}
type Showcase = Record<string, unknown>;
type Resolved = { blurbs: Record<string, string> } & Record<string, string>;
interface CopyGoldens {
  EN_SHOWCASE: { blurbs: Record<string, string> } & Record<string, unknown>;
  fillTemplate(t: string, vars: Record<string, string | number>): string;
  resolveShowcase(o: Showcase | undefined): Resolved;
  localizeGoldens(entries: Entry[], translations: Record<string, unknown>): { entries: Entry[]; missingIds: string[] };
  renderShowcaseIndex(
    prefix: string,
    order: string[],
    counts: Record<string, number>,
    strings: Showcase | undefined,
  ): string;
  renderAlgorithmPage(algorithm: string, count: number, strings: Showcase | undefined): string;
  groupByAlgorithm(entries: Entry[], readGraph: (id: string) => unknown): Grouped;
  yamlScalar(value: string): string;
  listLocalePrefixes(dir: string): string[];
  siteAlgorithmId(algorithm: string): string;
}

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const mod = (await import(pathToFileURL(here('../../docs-site/copy-goldens.mjs')).href)) as CopyGoldens;
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(here(rel), 'utf8')) as T;

const FIX = 'fixtures/goldens/';
const MANIFEST = readJson<{ golden: { id: string; algorithm: string; note: string }[] }>(
  `${FIX}manifest.json`,
).golden.map((g): Entry => ({ id: g.id, algorithm: g.algorithm, description: g.note }));
const XX = readJson<Record<string, unknown>>(`${FIX}locales/goldens/xx.json`);
const ORDER = ['force', 'layered'];
const COUNTS = { force: 1, layered: 2 };
const XX_BLURBS = { ...(XX.$showcase as Showcase), blurbs: { layered: 'Layerd layout.', force: 'Forse layout.' } };

const ALGORITHM_PAGE = `---
title: layered goldens
---

# layered: 2 goldens

Layer-based (Sugiyama-style) layout for node-link diagrams with ports and hierarchy. Each graph below is an oracle layout rendered live in your browser from its ELK JSON.

<GoldenGallery algorithm="layered" />
`;

describe('localizeGoldens', () => {
  it('translates covered ids, keeps English for the rest and names it', () => {
    const { entries, missingIds } = mod.localizeGoldens(MANIFEST, XX);
    expect(entries.map((e) => e.description)).toEqual(['Ferst gulden', 'Second golden', 'Therd gulden']);
    expect(missingIds).toEqual(['g-two']);
  });

  it('never treats $-keys as ids and does not mutate the input', () => {
    const { entries, missingIds } = mod.localizeGoldens(MANIFEST, { $showcase: {} });
    expect(missingIds).toEqual(['g-one', 'g-two', 'g-three']);
    expect(entries).toEqual(MANIFEST);
    expect(MANIFEST[0]?.description).toBe('First golden');
  });
});

describe('showcase rendering', () => {
  it('fills placeholders and leaves unknown ones intact', () => {
    expect(mod.fillTemplate('{a}-{b}-{c}', { a: 1, b: 'x' })).toBe('1-x-{c}');
  });

  it('merges overrides over English per key and per blurb', () => {
    const s = mod.resolveShowcase({ indexTitle: 'T', blurbs: { force: 'F' } });
    expect(s.indexTitle).toBe('T');
    expect(s.indexHeading).toBe(mod.EN_SHOWCASE.indexHeading);
    expect(s.blurbs.force).toBe('F');
    expect(s.blurbs.layered).toBe(mod.EN_SHOWCASE.blurbs.layered);
  });

  it('renders the English index with unprefixed links and the total', () => {
    const md = mod.renderShowcaseIndex('', ['layered'], { layered: 2 }, undefined);
    expect(md).toContain('- [**layered**](/showcase/layered) — Layer-based');
    expect(md).toContain('_(2 goldens)_');
    expect(md).toContain('one of **2 golden layouts**');
    expect(md).toContain('(see [Conformance](/conformance)).');
  });

  it('prefixes every internal link and translates prose for xx', () => {
    const md = mod.renderShowcaseIndex('xx', ORDER, COUNTS, XX_BLURBS);
    expect(md).toContain('title: Shoecase\n');
    expect(md).toContain('# Shoecase - the gulden corpus');
    expect(md).toContain('- [**layered**](/xx/showcase/layered) — Layerd layout. _(2 goldens)_');
    expect(md).toContain('- [**force**](/xx/showcase/force) — Forse layout. _(1 goldens)_');
    expect(md).toContain('(see [Conformens](/xx/conformance)).');
    expect(md).not.toContain('](/conformance)');
    expect(md).not.toContain('](/showcase/');
  });

  it('quotes a translated title that YAML cannot read as a plain scalar', () => {
    const md = mod.renderAlgorithmPage('layered', 2, { algorithmTitle: '{algorithm}: golden' });
    expect(md.startsWith('---\ntitle: "layered: golden"\n---\n')).toBe(true);
    expect(mod.yamlScalar('layered goldens')).toBe('layered goldens');
    expect(mod.yamlScalar('#1 "x"')).toBe('"#1 \\"x\\""');
  });

  it('renders an algorithm page exactly', () => {
    expect(mod.renderAlgorithmPage('layered', 2, undefined)).toBe(ALGORITHM_PAGE);
  });
});

describe('groupByAlgorithm', () => {
  it('strips the ELK prefix and embeds the parsed graph', () => {
    const grouped = mod.groupByAlgorithm(MANIFEST, (id) => readJson<unknown>(`${FIX}refs/${id}.json`));
    expect(mod.siteAlgorithmId('org.eclipse.elk.layered')).toBe('layered');
    expect(grouped.order).toEqual(['force', 'layered']);
    expect(grouped.counts).toEqual(COUNTS);
    expect(grouped.byAlgorithm.layered?.map((g) => g.id)).toEqual(['g-one', 'g-two']);
    expect(grouped.byAlgorithm.force?.[0]).toEqual({
      id: 'g-three',
      description: 'Third golden',
      algorithm: 'force',
      graph: { id: 'root-three', children: [{ id: 'n-three', width: 10, height: 10 }] },
    });
  });
});

describe('listLocalePrefixes', () => {
  it('lists only *.ts modules, not subdirectories or other files', () => {
    expect(mod.listLocalePrefixes(here(`${FIX}locales`))).toEqual(['xx']);
  });

  it('returns no locales for a missing directory', () => {
    expect(mod.listLocalePrefixes(here(`${FIX}nope`))).toEqual([]);
  });
});

describe('GoldenGallery strings', () => {
  const SRC = readFileSync(here('../../docs-site/.vitepress/theme/GoldenGallery.vue'), 'utf8');
  const USAGES = ['t.value.renderFailed', 't.clickToEnlarge', 't.rendering', 't.elkSource', 't.close'];

  it('resolves component strings and uses no Node built-ins or i18n.ts', () => {
    expect(SRC).toContain('pickStrings(lang.value, theme.value.componentsByLang)');
    expect(SRC).not.toMatch(/from 'node:/);
    expect(SRC).not.toMatch(/from '\.\.\/i18n/);
    for (const usage of USAGES) {
      expect(SRC).toContain(usage);
    }
  });
});

describe('shipped English goldens', () => {
  const MANIFEST_REAL = readJson<{ golden: { id: string }[] }>('../corpus/manifest.json').golden;
  const EN = readJson<Record<string, unknown>>('../../docs-site/.vitepress/locales/goldens/en.json');

  it('describes every manifest id with a non-blank string', () => {
    const blank = MANIFEST_REAL.map((g) => g.id).filter((id) => {
      const v = EN[id];
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(blank).toEqual([]);
  });

  it('keeps the $showcase block equal to EN_SHOWCASE', () => {
    expect(EN.$showcase).toEqual(mod.EN_SHOWCASE);
  });
});

describe('registered locales translate every golden id', () => {
  const IDS = readJson<{ golden: { id: string }[] }>('../corpus/manifest.json').golden.map((g) => g.id);
  for (const prefix of Object.keys(LOCALES).sort()) {
    it(`${prefix} covers all ${IDS.length} ids`, () => {
      const tr = readJson<Record<string, unknown>>(`../../docs-site/.vitepress/locales/goldens/${prefix}.json`);
      const missing = IDS.filter((id) => typeof tr[id] !== 'string' || (tr[id] as string).trim() === '');
      expect(missing.map((id) => `${prefix}: ${id}`)).toEqual([]);
    });
  }
});
