// SPDX-License-Identifier: EPL-2.0
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

interface ReportEntry {
  src: string;
  dst: string;
  title: string;
}

interface CopyReportsModule {
  REPORTS: ReportEntry[];
  rewriteReportLinks(md: string): string;
  mirrorReport(md: string, entry: { src: string; title: string }): string;
  copyReports(root?: string): string[];
}

const SCRIPT_PATH = fileURLToPath(new URL('../../docs-site/copy-reports.mjs', import.meta.url));
const REAL_REPORT = fileURLToPath(new URL('../../docs/parity-report.md', import.meta.url));
const mod = (await import(pathToFileURL(SCRIPT_PATH).href)) as CopyReportsModule;

const GH = 'https://github.com/knowvah/elk-engine/blob/main';
const FRONT_MATTER = '---\ntitle: Parity report\n---\n';
const MIRROR_COMMENT =
  '<!-- Mirrored from docs/parity-report.md by docs-site/copy-reports.mjs at docs build time. Edit the source report, not this copy. -->';
const SOURCE = '<!-- GENERATED -->\n<!-- SPDX-License-Identifier: EPL-2.0 -->\n\n# Parity report\n\nbody\n';

const REWRITES: [string, string][] = [
  ['](conformance.md)', '](/conformance)'],
  ['](./conformance.md#x)', '](/conformance)'],
  ['](../docs/conformance.md#y)', '](/conformance)'],
  ['](translation-rules.md)', '](/guide/translation-rules)'],
  ['](./translation-rules.md)', '](/guide/translation-rules)'],
  ['](../docs/translation-rules.md)', '](/guide/translation-rules)'],
  ['](architecture/port-map.md)', '](/guide/port-map)'],
  ['](./architecture/inventory.md)', '](/guide/inventory)'],
  ['](../docs/architecture/overview.md)', '](/guide/architecture)'],
  ['](plans/a/b.md)', `](${GH}/plans/a/b.md)`],
  ['](../plans/a/b.md)', `](${GH}/plans/a/b.md)`],
  ['](test/corpus/m.json)', `](${GH}/test/corpus/m.json)`],
  ['](./test/corpus/m.json)', `](${GH}/test/corpus/m.json)`],
  ['](../test/corpus/m.json)', `](${GH}/test/corpus/m.json)`],
];

const UNCHANGED = ['](/already/absolute)', '](#anchor)', '](https://example.com/plans/x.md)'];

const tmpRoots: string[] = [];

function makeRoot(withSource: boolean): string {
  const root = mkdtempSync(join(tmpdir(), 'copy-reports-'));
  tmpRoots.push(root);
  mkdirSync(join(root, 'docs'));
  mkdirSync(join(root, 'docs-site'));
  if (withSource)
    writeFileSync(join(root, 'docs', 'parity-report.md'), `${SOURCE}[a](../docs/conformance.md) [b](plans/p.md)\n`);
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('REPORTS', () => {
  it('lists the parity report mirror', () => {
    expect(mod.REPORTS).toEqual([{ src: '../docs/parity-report.md', dst: 'parity.md', title: 'Parity report' }]);
  });
});

describe('rewriteReportLinks', () => {
  it.each(REWRITES)('rewrites %s', (from, to) => {
    expect(mod.rewriteReportLinks(`[t]${from}`)).toBe(`[t]${to}`);
  });

  it.each(UNCHANGED)('leaves %s unchanged', (link) => {
    expect(mod.rewriteReportLinks(`[t]${link}`)).toBe(`[t]${link}`);
  });

  it('rewrites a document holding every kind of link at once', () => {
    const input = [...REWRITES.map(([from]) => from), ...UNCHANGED].map((l) => `[t]${l}`).join('\n');
    const expected = [...REWRITES.map(([, to]) => to), ...UNCHANGED].map((l) => `[t]${l}`).join('\n');
    expect(mod.rewriteReportLinks(input)).toBe(expected);
  });
});

describe('mirrorReport', () => {
  it('starts with front matter and puts the mirror comment before the H1', () => {
    const out = mod.mirrorReport(SOURCE, { src: '../docs/parity-report.md', title: 'Parity report' });
    expect(out.startsWith(`${FRONT_MATTER}\n${MIRROR_COMMENT}\n\n`)).toBe(true);
    expect(out.indexOf(MIRROR_COMMENT)).toBeLessThan(out.indexOf('# Parity report'));
    expect(out.endsWith(SOURCE)).toBe(true);
  });
});

describe('copyReports', () => {
  it('writes docs-site/parity.md with front matter and rewritten links', () => {
    const root = makeRoot(true);
    expect(mod.copyReports(root)).toEqual(['docs-site/parity.md']);
    const out = readFileSync(join(root, 'docs-site', 'parity.md'), 'utf8');
    expect(out.startsWith(FRONT_MATTER)).toBe(true);
    expect(out).toContain('](/conformance)');
    expect(out).not.toContain('](../docs/');
    expect(out).not.toContain('](plans/');
  });

  it('throws a typed error naming the source when it is missing', () => {
    const root = makeRoot(false);
    expect(() => mod.copyReports(root)).toThrowError(/parity-report\.md/);
    expect(() => mod.copyReports(root)).toThrowError(expect.objectContaining({ name: 'MissingReportSourceError' }));
  });

  it('mirrors the real report to a file whose first line is front matter', () => {
    const root = makeRoot(false);
    writeFileSync(join(root, 'docs', 'parity-report.md'), readFileSync(REAL_REPORT, 'utf8'));
    mod.copyReports(root);
    const first = readFileSync(join(root, 'docs-site', 'parity.md'), 'utf8').split('\n')[0];
    expect(first).toBe('---');
  });
});

describe('script entry point', () => {
  it('importing the module wrote nothing and running it on the real tree exits 0', () => {
    const result = spawnSync('node', [SCRIPT_PATH], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('copy-reports: wrote docs-site/parity.md');
  });
});
