// SPDX-License-Identifier: EPL-2.0
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type CaseDeps,
  type CaseOutcome,
  type Dirs,
  type SweepRow,
  CATEGORIES,
  DEFAULT_ALGORITHMS,
  classify,
  compareCase,
  inputOf,
  layoutToJson,
  lenientParse,
  overlayAlgorithm,
  execute,
  parseArgs,
  resolveSweepDir,
  report,
  runComparison,
  selectRows,
  simpleClassName,
  summarize,
} from '../../tools/corpus/ts-layout-compare.js';

const ALG = 'org.eclipse.elk.box';
const row = (over: Partial<SweepRow> = {}): SweepRow => ({
  caseId: 'retarget/box/default/m',
  tier: 'retarget',
  algorithm: ALG,
  variant: 'default',
  modelId: 'm',
  verdict: 'ok',
  ms: 10,
  ...over,
});
const doc = (x: number): string => JSON.stringify({ id: 'root', children: [{ id: 'n1', x, y: 0 }] });
const deps = (oracle: string, ts: string | Error): CaseDeps => ({
  readOracleOutput: () => oracle,
  runTs: () => {
    if (ts instanceof Error) throw ts;
    return ts;
  },
});
class IllegalStateException extends Error {
  constructor() {
    super('x');
    this.name = 'IllegalStateException';
  }
}

describe('lenientParse', () => {
  it('reads bare NaN and infinities as numbers and leaves strings alone', () => {
    const parsed = lenientParse('{"a": NaN, "b": [Infinity, -Infinity], "c": "NaN \\" NaN", "d": 1.5}') as {
      a: number;
      b: number[];
      c: string;
      d: number;
    };
    expect(parsed.a).toBeNaN();
    expect(parsed.b).toEqual([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]);
    expect(parsed.c).toBe('NaN " NaN');
    expect(parsed.d).toBe(1.5);
  });

  it('still rejects malformed JSON', () => {
    expect(() => lenientParse('{"a": ')).toThrow(SyntaxError);
  });
});

describe('classify', () => {
  it('maps the oracle verdict and the TS outcome to a category', () => {
    const threw = { kind: 'threw', name: 'IllegalStateException' } as const;
    const exc = { class: 'java.lang.IllegalStateException', message: null };
    expect(classify(row(), { kind: 'laid', equal: true })).toEqual({ category: 'ok', detail: '' });
    expect(classify(row(), { kind: 'laid', equal: false }).category).toBe('mismatch');
    expect(classify(row(), threw)).toEqual({ category: 'ts-only-throw', detail: 'TS threw IllegalStateException' });
    expect(classify(row({ verdict: 'throws', exception: exc }), threw)).toEqual({
      category: 'both-throw',
      detail: 'IllegalStateException',
    });
    expect(classify(row({ verdict: 'throws', exception: exc }), { kind: 'laid', equal: true }).category).toBe(
      'oracle-only-throw',
    );
    const other = classify(row({ verdict: 'throws', exception: exc }), { kind: 'threw', name: 'TypeError' });
    expect(other).toEqual({ category: 'mismatch', detail: 'oracle threw IllegalStateException, TS threw TypeError' });
    expect(classify(row({ verdict: 'nondeterministic' }), { kind: 'laid', equal: true })).toEqual({
      category: 'excluded',
      detail: 'nondeterministic',
    });
  });

  it('keeps only the simple class name', () => {
    expect(simpleClassName('java.lang.IllegalStateException')).toBe('IllegalStateException');
    expect(simpleClassName('Plain')).toBe('Plain');
  });
});

describe('compareCase', () => {
  it('applies the AD-4 tolerance: 5e-7 is ok, 2e-6 is a mismatch', () => {
    expect(compareCase(row(), deps(doc(1), doc(1 + 5e-7))).category).toBe('ok');
    const off = compareCase(row(), deps(doc(1), doc(1 + 2e-6)));
    expect(off.category).toBe('mismatch');
    expect(off.optionsOnly).toBe(false);
    expect(off.detail).toContain('children[id=n1].x');
  });

  it('treats NaN on both sides as equal', () => {
    const text = '{"id": "root", "height": NaN}';
    expect(compareCase(row(), deps(text, text)).category).toBe('ok');
  });

  it('marks a mismatch confined to layout options', () => {
    const a = '{"id": "root", "layoutOptions": {"elk.direction": "RIGHT"}}';
    const b = '{"id": "root", "layoutOptions": {"direction": "RIGHT"}}';
    const out = compareCase(row(), deps(a, b));
    expect(out.category).toBe('mismatch');
    expect(out.optionsOnly).toBe(true);
  });

  it('classifies throws on either side', () => {
    const exc = { class: 'java.lang.IllegalStateException', message: 'm' };
    const err = new IllegalStateException();
    expect(compareCase(row({ verdict: 'throws', exception: exc }), deps('', err)).category).toBe('both-throw');
    expect(compareCase(row({ verdict: 'throws', exception: exc }), deps('', doc(0))).category).toBe(
      'oracle-only-throw',
    );
    expect(compareCase(row(), deps(doc(0), err)).category).toBe('ts-only-throw');
    expect(compareCase(row(), deps(doc(0), new IllegalStateException())).detail).toBe('TS threw IllegalStateException');
  });

  it('names a thrown value without a name', () => {
    expect(compareCase(row(), deps(doc(0), new Error('plain'))).detail).toBe('TS threw Error');
  });

  it('names a non-Error throw by its type', () => {
    const bare: CaseDeps = {
      readOracleOutput: () => doc(0),
      runTs: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercises the non-Error branch
        throw 'boom';
      },
    };
    expect(compareCase(row(), bare).detail).toBe('TS threw string');
  });

  it('excludes oracle-nondeterministic cases without running TS', () => {
    let ran = false;
    const spy: CaseDeps = {
      readOracleOutput: () => '',
      runTs: () => {
        ran = true;
        return '';
      },
    };
    const out = compareCase(row({ verdict: 'nondeterministic' }), spy);
    expect(out.category).toBe('excluded');
    expect(out.tsMs).toBe(0);
    expect(ran).toBe(false);
  });
});

describe('summarize', () => {
  const outcome = (algorithm: string, category: CaseOutcome['category'], extra: Partial<CaseOutcome> = {}) => ({
    caseId: `${algorithm}/${category}`,
    algorithm,
    category,
    detail: '',
    tsMs: 2,
    oracleMs: 3,
    ...extra,
  });

  it('counts per algorithm so that the categories sum to planned, and lists the findings', () => {
    const summary = summarize([
      outcome('a', 'ok'),
      outcome('a', 'mismatch', { optionsOnly: true }),
      outcome('a', 'excluded'),
      outcome('b', 'both-throw'),
      outcome('b', 'ts-only-throw'),
    ]);
    const a = summary.byAlgorithm['a'];
    expect(a?.planned).toBe(3);
    expect(a?.counts).toEqual({
      ok: 1,
      mismatch: 1,
      'both-throw': 0,
      'ts-only-throw': 0,
      'oracle-only-throw': 0,
      excluded: 1,
    });
    expect(a?.optionsOnlyMismatches).toBe(1);
    expect(a?.tsMs).toBe(6);
    expect(a?.oracleMs).toBe(9);
    for (const entry of Object.values(summary.byAlgorithm)) {
      expect(CATEGORIES.reduce((n, c) => n + entry.counts[c], 0)).toBe(entry.planned);
    }
    expect(summary.findings.map((f) => f.caseId)).toEqual(['a/mismatch', 'b/ts-only-throw']);
  });
});

describe('parseArgs and selectRows', () => {
  it('parses flags and defaults', () => {
    expect(parseArgs([])).toEqual({
      out: undefined,
      sweepDir: undefined,
      algorithms: DEFAULT_ALGORITHMS,
      filter: undefined,
    });
    expect(parseArgs(['--out', 'o.json', '--algorithms', 'box,fixed', '--filter', 'x', '--sweep-dir', 's'])).toEqual({
      out: 'o.json',
      sweepDir: 's',
      algorithms: ['box', 'fixed'],
      filter: 'x',
    });
    expect(() => parseArgs(['--bogus'])).toThrow('Unknown argument --bogus');
    expect(() => parseArgs(['--out'])).toThrow('--out requires a value');
  });

  it('keeps the rows of the wanted algorithms and filter, and rejects malformed rows', () => {
    const lines = [row(), row({ caseId: 'c2', algorithm: 'org.eclipse.elk.layered' }), row({ caseId: 'zz' })]
      .map((r) => JSON.stringify(r))
      .join('\n');
    expect(selectRows(`${lines}\n`, ['box'], undefined).map((r) => r.caseId)).toEqual(['retarget/box/default/m', 'zz']);
    expect(selectRows(lines, ['box'], 'zz').map((r) => r.caseId)).toEqual(['zz']);
    expect(() => selectRows('{"caseId": 1}\n', ['box'], undefined)).toThrow('Malformed sweep row');
    expect(() => selectRows('[]\n', ['box'], undefined)).toThrow('Malformed sweep row');
  });

  it('overlays the algorithm on every tier but native', () => {
    expect(overlayAlgorithm(row())).toBe(ALG);
    expect(overlayAlgorithm(row({ tier: 'native' }))).toBeNull();
  });
});

describe('layoutToJson', () => {
  const graph = JSON.stringify({
    id: 'root',
    children: [
      { id: 'a', width: 10, height: 10 },
      { id: 'b', width: 10, height: 10 },
    ],
  });

  it('lays a JSON graph out with the retargeted algorithm and exports it', () => {
    const out = JSON.parse(layoutToJson(graph, 'json', row())) as { children: { id: string; x: number }[] };
    expect(out.children.map((c) => c.id)).toEqual(['a', 'b']);
    expect(out.children[0]?.x).toBe(15);
  });

  it('lays an elkt graph out', () => {
    const text = 'node root { node a { layout [ size: 10, 10 ] } node b { layout [ size: 10, 10 ] } }';
    const out = JSON.parse(layoutToJson(text, 'elkt', row())) as {
      children: { id: string; children: { id: string }[] }[];
    };
    expect(out.children[0]?.children.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('rejects an elkt graph with errors', () => {
    expect(() => layoutToJson('node {', 'elkt', row())).toThrow('elkt load failed');
  });
});

describe('runComparison over a fixture sweep', () => {
  const GRAPH = { id: 'root', children: [{ id: 'a', width: 10, height: 10 }] };

  function fixture(): { dirs: Dirs; cleanup: () => void } {
    const base = mkdtempSync(path.join(tmpdir(), 'ts-layout-compare-'));
    const dirs = {
      root: path.join(base, 'repo'),
      modelsDir: path.join(base, 'models'),
      sweepDir: path.join(base, 'sweep'),
    };
    mkdirSync(path.join(dirs.root, 'test', 'corpus', 'generated'), { recursive: true });
    mkdirSync(path.join(dirs.modelsDir, 'tests'), { recursive: true });
    mkdirSync(path.join(dirs.sweepDir, 'run-a'), { recursive: true });
    writeFileSync(
      path.join(dirs.root, 'test', 'corpus', 'census.json'),
      JSON.stringify({ models: [{ id: 'tests/m', source: 'json' }] }),
    );
    writeFileSync(path.join(dirs.modelsDir, 'tests', 'm.json'), JSON.stringify(GRAPH));
    writeFileSync(path.join(dirs.root, 'test', 'corpus', 'generated', 'g.json'), JSON.stringify(GRAPH));
    return { dirs, cleanup: () => rmSync(base, { recursive: true, force: true }) };
  }

  it('resolves census and generated inputs', () => {
    const { dirs, cleanup } = fixture();
    const sources = new Map([['tests/m', 'elkt']]);
    expect(inputOf(row({ modelId: 'tests/m' }), dirs, sources)).toEqual({
      file: path.join(dirs.modelsDir, 'tests/m.elkt'),
      source: 'elkt',
    });
    expect(inputOf(row({ modelId: 'tests/other' }), dirs, sources).source).toBe('json');
    expect(inputOf(row({ modelId: 'generated/g' }), dirs, sources).file).toBe(
      path.join(dirs.root, 'test/corpus/generated/g.json'),
    );
    cleanup();
  });

  it('counts, reports and finds a divergence against the oracle output', () => {
    const { dirs, cleanup } = fixture();
    const ts = JSON.parse(layoutToJson(JSON.stringify(GRAPH), 'json', row())) as { children: { x: number }[] };
    const good = row({ caseId: 'retarget/box/default/tests/m', modelId: 'tests/m' });
    const bad = row({ caseId: 'retarget/box/default/generated/g', modelId: 'generated/g' });
    const skipped = row({ caseId: 'retarget/box/default/x', modelId: 'tests/m', verdict: 'nondeterministic' });
    writeFileSync(
      path.join(dirs.sweepDir, 'results.jsonl'),
      [good, bad, skipped].map((r) => JSON.stringify(r)).join('\n'),
    );
    writeFileSync(path.join(dirs.sweepDir, 'run-a', 'retarget__box__default__tests__m.json'), JSON.stringify(ts));
    const shifted = { ...ts, children: [{ ...ts.children[0], x: (ts.children[0]?.x ?? 0) + 1 }] };
    writeFileSync(
      path.join(dirs.sweepDir, 'run-a', 'retarget__box__default__generated__g.json'),
      JSON.stringify(shifted),
    );
    const summary = runComparison(
      { out: undefined, sweepDir: undefined, algorithms: ['box'], filter: undefined },
      dirs,
    );
    expect(summary.byAlgorithm[ALG]?.planned).toBe(3);
    expect(summary.byAlgorithm[ALG]?.counts.excluded).toBe(1);
    expect(summary.byAlgorithm[ALG]?.counts.ok).toBe(1);
    expect(summary.findings.map((f) => f.caseId)).toEqual([bad.caseId]);
    expect(report(summary)).toContain(`${ALG}: planned=3 ok=1 mismatch=1 both-throw=0`);
    expect(report(summary)).toContain('findings=1');
    cleanup();
  });

  it('executes end to end: output file, stdout and exit code', () => {
    const { dirs, cleanup } = fixture();
    const only = row({ caseId: 'retarget/box/default/x', modelId: 'tests/m', verdict: 'nondeterministic' });
    writeFileSync(path.join(dirs.sweepDir, 'results.jsonl'), JSON.stringify(only));
    const written = new Map<string, string>();
    let printed = '';
    const io = {
      modelsDir: dirs.modelsDir,
      oracleEnv: undefined,
      stdout: (text: string) => {
        printed += text;
      },
      writeFile: (file: string, text: string) => written.set(file, text),
    };
    const argv = ['--sweep-dir', dirs.sweepDir, '--algorithms', 'box', '--out', 'summary.json'];
    expect(execute(argv, dirs.root, io)).toBe(0);
    expect(printed).toContain('excluded=1');
    expect(JSON.parse(written.get('summary.json') ?? '{}')).toMatchObject({ findings: [] });
    printed = '';
    writeFileSync(path.join(dirs.sweepDir, 'results.jsonl'), JSON.stringify(row({ verdict: 'throws' })));
    writeFileSync(path.join(dirs.root, 'test', 'corpus', 'generated', 'g.json'), '{}');
    expect(execute(['--sweep-dir', dirs.sweepDir, '--algorithms', 'box'], dirs.root, io)).toBe(1);
    cleanup();
  });

  it('resolves the sweep directory from the override, the environment or the default', () => {
    const { dirs, cleanup } = fixture();
    mkdirSync(path.join(dirs.root, 'tools', 'oracle'), { recursive: true });
    writeFileSync(path.join(dirs.root, 'tools', 'oracle', 'ELK_COMMIT'), 'abc123\n');
    expect(resolveSweepDir(dirs.root, 'rel', undefined)).toBe(path.resolve('rel'));
    const fromEnv = resolveSweepDir(dirs.root, undefined, '/oracle');
    expect(fromEnv.startsWith(path.join('/oracle', 'sweep', 'abc123-'))).toBe(true);
    const fallback = resolveSweepDir(dirs.root, undefined, '');
    expect(fallback.startsWith(path.join(path.dirname(dirs.root), 'elk-oracle', 'sweep', 'abc123-'))).toBe(true);
    cleanup();
  });
});
