// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ALL_LOCALE_PREFIXES, TRANSLATABLE_EXCLUDES } from '../../docs-site/.vitepress/i18n.js';

interface Status {
  prefix: string;
  missing: string[];
  stale: string[];
  noHash: string[];
  orphaned: string[];
}
interface HashMod {
  LOCALE_PREFIX_PATTERN: RegExp;
  englishSourceFor(p: string, root?: string): string[];
  hashSource(p: string | string[], root?: string): string;
  parseSourceHash(md: string): string | undefined;
}
interface StatusMod {
  TRANSLATABLE_EXCLUDES: string[];
  detectLocales(root: string): string[];
  englishPages(root: string, localeDirs: string[]): string[];
  englishUrl(rel: string): string;
  localeStatus(root: string, prefix: string, localeDirs: string[]): Status;
  missingGoldenIds(manifestGoldens: unknown[], translations: unknown): string[];
  staleHashes(statuses: Status[]): Record<string, string>;
  formatLocale(s: Status, goldenIds: string[]): string;
  writeHashes(root: string, statuses: Status[]): Record<string, string>;
}

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const load = async <T>(rel: string): Promise<T> => (await import(pathToFileURL(here(rel)).href)) as T;
const hashMod = await load<HashMod>('../../scripts/i18n-hash.mjs');
const status = await load<StatusMod>('../../scripts/docs-i18n-status.mjs');

const ROOT = here('fixtures/status/');
const HASH_CLI = here('../../scripts/i18n-hash.mjs');
const STATUS_CLI = here('../../scripts/docs-i18n-status.mjs');
const sha = (s: string): string => createHash('sha256').update(s).digest('hex');
const LOCALES = ['xx', 'yy'];
const ARCH_SOURCES = ['docs/architecture/overview.md', 'docs/architecture/component-map.md'];
const ENGLISH_PAGES = [
  'conformance.md',
  'guide/architecture.md',
  'guide/contributing.md',
  'guide/java-foundations.md',
  'guide/overview.md',
  'index.md',
];
const XX_STATUS: Status = {
  prefix: 'xx',
  missing: [],
  stale: ['guide/java-foundations.md'],
  noHash: ['guide/contributing.md'],
  orphaned: ['guide/gone.md'],
};
const GOLDEN_ENTRIES = JSON.parse(readFileSync(join(ROOT, 'test/corpus/manifest.json'), 'utf8')).golden as unknown[];
const CONFORMANCE_BYTES = '# Conformance\n\nEnglish conformance body.\n';

const withTempCopy = (run: (tmp: string) => void): void => {
  const tmp = mkdtempSync(join(tmpdir(), 'i18n-status-'));
  try {
    cpSync(ROOT, tmp, { recursive: true });
    run(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

describe('englishSourceFor', () => {
  it('maps the include wrappers to their docs/ sources', () => {
    expect(hashMod.englishSourceFor('docs-site/xx/conformance.md')).toEqual(['docs/conformance.md']);
    expect(hashMod.englishSourceFor('docs-site/xx/guide/architecture.md')).toEqual(ARCH_SOURCES);
  });

  it('maps every other page to its English twin, absolute paths included', () => {
    expect(hashMod.englishSourceFor('docs-site/pt-br/guide/overview.md')).toEqual(['docs-site/guide/overview.md']);
    expect(hashMod.englishSourceFor(`${ROOT}docs-site/xx/guide/overview.md`, ROOT)).toEqual([
      'docs-site/guide/overview.md',
    ]);
  });

  it('rejects paths that are not locale pages', () => {
    expect(() => hashMod.englishSourceFor('docs-site/guide/overview.md')).toThrow(/not a locale page/);
  });
});

describe('hashSource and the CLI', () => {
  it('hashes file bytes as 64 lowercase hex chars', () => {
    expect(hashMod.hashSource('docs/conformance.md', ROOT)).toBe(sha(CONFORMANCE_BYTES));
  });

  it('hashes several files as their concatenated bytes', () => {
    const joined = ARCH_SOURCES.map((p) => readFileSync(join(ROOT, p), 'utf8')).join('');
    expect(hashMod.hashSource(ARCH_SOURCES, ROOT)).toBe(sha(joined));
  });

  it('prints the hash of an English path', () => {
    const r = spawnSync('node', [HASH_CLI, `${ROOT}docs/conformance.md`], { encoding: 'utf8' });
    expect(r.stdout).toBe(`${sha(CONFORMANCE_BYTES)}\n`);
    expect(r.status).toBe(0);
  });

  it('prints the hash of the English sources of a locale page path', () => {
    const r = spawnSync('node', [HASH_CLI, 'docs-site/xx/conformance.md'], { encoding: 'utf8', cwd: here('../..') });
    const real = readFileSync(here('../../docs/conformance.md'));
    expect(r.stdout).toBe(`${createHash('sha256').update(real).digest('hex')}\n`);
    expect(r.status).toBe(0);
  });

  it('exits 2 without an argument', () => {
    const r = spawnSync('node', [HASH_CLI], { encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/usage:/);
  });

  it('reads sourceHash from front matter only', () => {
    const h = sha('x');
    expect(hashMod.parseSourceHash(`---\ntitle: t\nsourceHash: ${h}\n---\nbody`)).toBe(h);
    expect(hashMod.parseSourceHash(`# no front matter\nsourceHash: ${h}`)).toBeUndefined();
    expect(hashMod.parseSourceHash('---\ntitle: t\n---\n')).toBeUndefined();
  });
});

describe('localeStatus', () => {
  it('finds locales from modules and directories', () => {
    expect(status.detectLocales(ROOT)).toEqual(LOCALES);
  });

  it('classifies pages by hash', () => {
    expect(status.localeStatus(ROOT, 'xx', LOCALES)).toEqual(XX_STATUS);
  });

  it('lists the pages a bare locale directory lacks', () => {
    expect(status.localeStatus(ROOT, 'yy', LOCALES).missing).toEqual(ENGLISH_PAGES.filter((p) => p !== 'index.md'));
  });

  it('is not stale until the English source changes', () => {
    withTempCopy((tmp) => {
      expect(status.localeStatus(tmp, 'xx', LOCALES).stale).toEqual(XX_STATUS.stale);
      writeFileSync(join(tmp, 'docs-site/guide/overview.md'), '# Overview, edited\n');
      writeFileSync(join(tmp, 'docs/conformance.md'), '# Conformance, edited\n');
      expect(status.localeStatus(tmp, 'xx', LOCALES).stale).toEqual([
        'conformance.md',
        'guide/java-foundations.md',
        'guide/overview.md',
      ]);
    });
  });

  it('turns the architecture page stale when only the second include changes', () => {
    withTempCopy((tmp) => {
      writeFileSync(join(tmp, 'docs/architecture/component-map.md'), '# Component map, edited\n');
      expect(status.localeStatus(tmp, 'xx', LOCALES).stale).toEqual([
        'guide/architecture.md',
        'guide/java-foundations.md',
      ]);
    });
  });
});

describe('banner data', () => {
  it('maps stale locale pages to English URLs', () => {
    const de = { ...XX_STATUS, prefix: 'de', stale: ['conformance.md', 'index.md'] };
    expect(status.staleHashes([XX_STATUS, de])).toEqual({
      'xx/guide/java-foundations.md': '/guide/java-foundations',
      'de/conformance.md': '/conformance',
      'de/index.md': '/',
    });
  });

  it('writes the hashes file the banner imports', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'i18n-hashes-'));
    try {
      status.writeHashes(tmp, [XX_STATUS]);
      const written = readFileSync(join(tmp, 'docs-site/.vitepress/i18n-hashes.json'), 'utf8');
      expect(JSON.parse(written)).toEqual({ 'xx/guide/java-foundations.md': '/guide/java-foundations' });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('maps nested index pages to a directory URL', () => {
    expect(status.englishUrl('guide/index.md')).toBe('/guide/');
  });
});

describe('report', () => {
  it('lists golden ids without a translation', () => {
    expect(status.missingGoldenIds(GOLDEN_ENTRIES, { 'g-one': 'A' })).toEqual(['g-two']);
    expect(status.missingGoldenIds(GOLDEN_ENTRIES, undefined)).toEqual(['g-one', 'g-two']);
  });

  it('formats counts and items per category', () => {
    expect(status.formatLocale(XX_STATUS, ['g-two'])).toBe(
      [
        'xx:',
        '  missing pages: 0',
        '  stale pages: 1',
        '    - guide/java-foundations.md',
        '  pages without sourceHash: 1',
        '    - guide/contributing.md',
        '  pages whose English source is gone: 1',
        '    - guide/gone.md',
        '  golden descriptions still English: 1',
        '    - g-two',
      ].join('\n'),
    );
  });

  it('exits 0 on the real tree', () => {
    const r = spawnSync('node', [STATUS_CLI], { encoding: 'utf8' });
    expect(r.status).toBe(0);
  });
});

describe('agreement with i18n.ts', () => {
  it('uses the same excludes', () => {
    expect(status.TRANSLATABLE_EXCLUDES).toEqual([...TRANSLATABLE_EXCLUDES]);
  });

  it('recognizes every registered prefix', () => {
    expect(ALL_LOCALE_PREFIXES.filter((p) => !hashMod.LOCALE_PREFIX_PATTERN.test(p))).toEqual([]);
  });

  it('computes the English page set the completeness check uses', () => {
    expect(status.englishPages(ROOT, LOCALES)).toEqual(ENGLISH_PAGES);
  });
});
