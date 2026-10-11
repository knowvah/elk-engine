// SPDX-License-Identifier: EPL-2.0
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CensusModel } from '../../tools/corpus/census.js';
import {
  type GeneratedModel,
  type PlannedCase,
  type RunResult,
  parseArgs,
  parseResultLine,
  planCases,
  runShard,
  selectCases,
  shardCases,
  toOracleCase,
  verdictOf,
} from '../../tools/corpus/sweep.js';

const LAYERED = 'org.eclipse.elk.layered';
const STRESS = 'org.eclipse.elk.stress';
const RANDOM = 'org.eclipse.elk.random';
const ALGORITHMS = [LAYERED, RANDOM, STRESS];
const VARIANTS = ['default', 'direction-right'];

function model(id: string, rootAlgorithm: string, parse: 'ok' | 'error' = 'ok'): CensusModel {
  return {
    id,
    folder: 'examples',
    source: 'json',
    formats: ['json'],
    parse,
    nodes: 1,
    edges: 0,
    ports: 0,
    labels: 0,
    maxDepth: 1,
    declaredAlgorithms: [],
    rootAlgorithm,
  };
}

const CENSUS = [
  model('examples/a', LAYERED),
  model('examples/b', STRESS),
  model('examples/bad', LAYERED, 'error'),
];
const GENERATED: GeneratedModel[] = [
  { name: 'random-graph-small', input: '/gen/random-graph-small.json' },
];

const ok = (output: string, ms = 1): RunResult => ({
  status: 'ok',
  output,
  ms,
});
const throwsOf = (cls: string, message: string): RunResult => ({
  status: 'throws',
  exception: { class: cls, message },
  ms: 1,
});
const tagged = (status: 'oracle-error' | 'timeout'): RunResult => ({
  status,
  ms: 1,
});

describe('verdictOf', () => {
  it('oracle-error wins over timeout', () => {
    expect(verdictOf(tagged('timeout'), tagged('oracle-error'))).toBe('oracle-error');
    expect(verdictOf(tagged('oracle-error'), ok('x'))).toBe('oracle-error');
  });
  it('timeout wins over ok and throws', () => {
    expect(verdictOf(ok('x'), tagged('timeout'))).toBe('timeout');
    expect(verdictOf(tagged('timeout'), throwsOf('E', 'm'))).toBe('timeout');
  });
  it('ok when both ok with equal bytes', () => {
    expect(verdictOf(ok('{"a":1}'), ok('{"a":1}'))).toBe('ok');
  });
  it('nondeterministic when both ok with different bytes', () => {
    expect(verdictOf(ok('{"a":1}'), ok('{"a":2}'))).toBe('nondeterministic');
  });
  it('throws when class and message match', () => {
    expect(verdictOf(throwsOf('E', 'm@<hash>'), throwsOf('E', 'm@<hash>'))).toBe('throws');
  });
  it('nondeterministic when throws differ in class or message', () => {
    expect(verdictOf(throwsOf('E', 'm'), throwsOf('F', 'm'))).toBe('nondeterministic');
    expect(verdictOf(throwsOf('E', 'm'), throwsOf('E', 'n'))).toBe('nondeterministic');
  });
  it('nondeterministic when ok meets throws', () => {
    expect(verdictOf(ok('x'), throwsOf('E', 'm'))).toBe('nondeterministic');
  });
});

describe('planCases', () => {
  const plan = planCases(CENSUS, ALGORITHMS, VARIANTS, GENERATED);
  const ids = plan.cases.map((c) => c.caseId);
  const byTier = (tier: string): string[] =>
    plan.cases.filter((c) => c.tier === tier).map((c) => c.caseId);

  it('plans native cases per variant with the root algorithm', () => {
    expect(byTier('native')).toEqual([
      'native/layered/default/examples/a',
      'native/layered/direction-right/examples/a',
      'native/stress/default/examples/b',
      'native/stress/direction-right/examples/b',
    ]);
  });
  it('plans retarget cases for every other algorithm, default variant only', () => {
    expect(byTier('retarget')).toEqual([
      'retarget/layered/default/examples/b',
      'retarget/random/default/examples/a',
      'retarget/random/default/examples/b',
      'retarget/stress/default/examples/a',
    ]);
  });
  it('plans generated cases per variant under the name prefix algorithm', () => {
    expect(byTier('generated')).toEqual([
      'generated/random/default/generated/random-graph-small',
      'generated/random/direction-right/generated/random-graph-small',
    ]);
  });
  it('has no duplicates, is sorted by caseId, and lists parse errors', () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort());
    expect(plan.parseErrors).toEqual(['examples/bad']);
  });
  it('sends no algorithm for native cases and the full id otherwise', () => {
    const native = plan.cases.find((c) => c.caseId === 'native/layered/default/examples/a');
    const retarget = plan.cases.find((c) => c.caseId === 'retarget/random/default/examples/a');
    expect(native?.override).toBe(false);
    expect(native?.algorithm).toBe(LAYERED);
    expect(retarget?.override).toBe(true);
    expect(retarget?.algorithm).toBe(RANDOM);
  });
  it('rejects a generated name whose algorithm is not listed', () => {
    expect(() => planCases([], ALGORITHMS, VARIANTS, [{ name: 'bogus-x', input: '/x' }])).toThrow(
      'bogus',
    );
  });
});

describe('toOracleCase', () => {
  const plan = planCases(CENSUS, ALGORITHMS, VARIANTS, GENERATED);
  const dirs = { modelsDir: '/models' };
  it('omits algorithm for native and resolves the model path', () => {
    const c = plan.cases.find((x) => x.caseId === 'native/layered/direction-right/examples/a');
    expect(toOracleCase(c as PlannedCase, dirs)).toEqual({
      id: 'native/layered/direction-right/examples/a',
      input: '/models/examples/a.json',
      mode: 'layout',
      variant: 'direction-right',
    });
  });
  it('sends algorithm for retarget and uses the generated input verbatim', () => {
    const r = plan.cases.find((x) => x.caseId === 'retarget/random/default/examples/a');
    expect(toOracleCase(r as PlannedCase, dirs).algorithm).toBe(RANDOM);
    const g = plan.cases.find((x) => x.tier === 'generated');
    const line = toOracleCase(g as PlannedCase, dirs);
    expect(line.input).toBe('/gen/random-graph-small.json');
    expect(line.algorithm).toBe(RANDOM);
  });
});

describe('selectCases and shardCases', () => {
  const plan = planCases(CENSUS, ALGORITHMS, VARIANTS, GENERATED).cases;
  it('filters by substring', () => {
    expect(selectCases(plan, 'generated/', undefined)).toHaveLength(2);
  });
  it('limit takes an even stride across the sorted plan', () => {
    const picked = selectCases(plan, undefined, 3).map((c) => c.caseId);
    expect(picked).toHaveLength(3);
    expect(picked[0]).toBe(plan[0]?.caseId);
  });
  it('limit above size keeps everything', () => {
    expect(selectCases(plan, undefined, 999)).toHaveLength(plan.length);
  });
  it('shards round-robin without losing cases', () => {
    const shards = shardCases(plan, 3);
    expect(shards).toHaveLength(3);
    expect(shards.flat()).toHaveLength(plan.length);
    expect(shards[0]?.[0]?.caseId).toBe(plan[0]?.caseId);
    expect(shards[1]?.[0]?.caseId).toBe(plan[1]?.caseId);
  });
  it('never makes more shards than cases', () => {
    expect(shardCases(plan.slice(0, 2), 8)).toHaveLength(2);
  });
});

describe('parseResultLine', () => {
  it('accepts an ok line', () => {
    expect(parseResultLine('{"id":"a/b","status":"ok","ms":12}')).toEqual({
      id: 'a/b',
      result: { status: 'ok', ms: 12 },
    });
  });
  it('accepts a throws line with exception', () => {
    const line = '{"id":"x","status":"throws","exception":{"class":"E","message":"m"},"ms":3}';
    expect(parseResultLine(line)?.result.exception).toEqual({
      class: 'E',
      message: 'm',
    });
  });
  it('accepts a null exception message', () => {
    const line =
      '{"id":"x","status":"throws","exception":{"class":"java.lang.StackOverflowError","message":null},"ms":3}';
    expect(parseResultLine(line)?.result.exception).toEqual({
      class: 'java.lang.StackOverflowError',
      message: null,
    });
  });
  it.each([
    'not json',
    '{"id":1,"status":"ok","ms":1}',
    '{"id":"a","status":"weird","ms":1}',
    '{"id":"a","status":"ok"}',
    '[1]',
    '{"id":"a","status":"throws","exception":{"class":1},"ms":1}',
  ])('rejects %s', (line) => {
    expect(parseResultLine(line)).toBeUndefined();
  });
});

describe('parseArgs', () => {
  it('defaults', () => {
    const o = parseArgs([]);
    expect(o.filter).toBeUndefined();
    expect(o.limit).toBeUndefined();
    expect(o.planOnly).toBe(false);
    expect(o.shards).toBeGreaterThanOrEqual(1);
  });
  it('reads every flag', () => {
    expect(
      parseArgs([
        '--filter',
        'retarget/',
        '--limit',
        '5',
        '--shards',
        '3',
        '--out',
        '/o',
        '--plan-only',
      ]),
    ).toMatchObject({
      filter: 'retarget/',
      limit: 5,
      shards: 3,
      out: '/o',
      planOnly: true,
    });
  });
  it('rejects unknown flags and bad numbers', () => {
    expect(() => parseArgs(['--nope'])).toThrow('--nope');
    expect(() => parseArgs(['--limit', 'x'])).toThrow('--limit');
    expect(() => parseArgs(['--shards', '0'])).toThrow('--shards');
    expect(() => parseArgs(['--out'])).toThrow('--out');
  });
});

describe('runShard', () => {
  function fakeScript(body: string): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'sweep-test-'));
    const script = path.join(dir, 'run.sh');
    writeFileSync(script, `#!/usr/bin/env bash\n${body}\n`);
    chmodSync(script, 0o755);
    return script;
  }
  function casesFile(ids: string[]): { file: string; out: string } {
    const dir = mkdtempSync(path.join(tmpdir(), 'sweep-cases-'));
    const file = path.join(dir, 'cases.jsonl');
    writeFileSync(file, ids.map((id) => JSON.stringify({ id })).join('\n'));
    const out = path.join(dir, 'out');
    mkdirSync(out);
    return { file, out };
  }

  it('collects one result per line and ignores noise', async () => {
    const script = fakeScript(
      'echo "using x" >&2; echo noise; echo \'{"id":"c1","status":"ok","ms":4}\'; exit 0',
    );
    const { file, out } = casesFile(['c1']);
    const seen: string[] = [];
    const res = await runShard(script, file, out, (id) => seen.push(id));
    expect(res.results.get('c1')).toEqual({ status: 'ok', ms: 4 });
    expect(res.exitCode).toBe(0);
    expect(seen).toEqual(['c1']);
  });
  it('reports a real failure exit code with stderr tail', async () => {
    const script = fakeScript('echo boom >&2; exit 3');
    const { file, out } = casesFile(['c1']);
    const res = await runShard(script, file, out, () => undefined);
    expect(res.results.size).toBe(0);
    expect(res.exitCode).toBe(3);
    expect(res.stderrTail).toContain('boom');
  });
});

describe('verdictOf output normalization (D5 amendment, 2026-10-11)', () => {
  it('ok when both ok outputs differ only in identity-hash tokens', () => {
    expect(
      verdictOf(ok('{"g":"DCGraph@2e38f232"}'), ok('{"g":"DCGraph@1b0375b3"}')),
    ).toBe('ok');
  });
  it('still nondeterministic when outputs differ outside identity-hash tokens', () => {
    expect(verdictOf(ok('{"id":"n0_g563078"}'), ok('{"id":"n0_g101912"}'))).toBe(
      'nondeterministic',
    );
    expect(verdictOf(ok('{"g":"A@2e"}'), ok('{"g":"B@2e"}'))).toBe('nondeterministic');
  });
});
