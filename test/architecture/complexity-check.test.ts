// SPDX-License-Identifier: EPL-2.0

/**
 * `tools/complexity/check.ts` measures every TypeScript function, including
 * those lizard silently drops. The fixtures under `fixtures/complexity/` each
 * put a deliberately over-complex function behind one lizard blind spot (or
 * make the function itself the blind-spot construct); the tool must report it.
 * The end-to-end cases need the `lizard` executable and skip without it.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { astCcn, astNloc, measureByAst } from '../../tools/complexity/ast.js';
import { LIMITS, countLines, findFileViolations, findFunctionViolations } from '../../tools/complexity/evaluate.js';
import { skipReason } from '../../tools/complexity/files.js';
import { buildFileModel, type FunctionInfo } from '../../tools/complexity/inventory.js';
import { lizardAvailable, parseLizardCsv, splitCsvLine } from '../../tools/complexity/lizard.js';
import { matchDirect, type Measured } from '../../tools/complexity/measure.js';
import { buildSnippet } from '../../tools/complexity/snippets.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECK = join(ROOT, 'tools', 'complexity', 'check.ts');
const FIXTURES = join(ROOT, 'test', 'architecture', 'fixtures', 'complexity');
const EXIT_OK = 0;
const EXIT_VIOLATIONS = 1;
const HAS_LIZARD = lizardAvailable();
const NO_LIZARD = 'needs the lizard executable (pip install lizard)';

function runCheck(...targets: string[]): { status: number | null; stdout: string } {
  const run = spawnSync(process.execPath, ['--import', 'tsx', CHECK, ...targets], { encoding: 'utf8', cwd: ROOT });
  return { status: run.status, stdout: run.stdout };
}

function fixture(name: string): string {
  return join(FIXTURES, name);
}

describe.skipIf(!HAS_LIZARD)(`complexity check, end to end (${HAS_LIZARD ? 'lizard found' : NO_LIZARD})`, () => {
  const BLIND_SPOTS: readonly (readonly [string, string, string])[] = [
    ['(a) #private method behind a function-typed constructor parameter', 'private-method.ts', '#overComplexPrivate'],
    ['(b) member behind a `new X()` default parameter', 'default-new.ts', 'afterNewDefault'],
    ['(c) function behind a regex literal containing a quote', 'regex-quote.ts', 'afterRegex'],
    ['(d) parameter typed `readonly (A | B)[]`', 'readonly-union.ts', 'readonlyUnion'],
    ['(e) function cut short by `(call(a) + 1) * 2`', 'parenthesised-call.ts', 'parenthesisedCall'],
    ['(f) function cut short by an optional call', 'optional-call.ts', 'optionalCall'],
  ];

  it.each(BLIND_SPOTS)('reports the over-complex function: %s', (_label, file, name) => {
    const { status, stdout } = runCheck(fixture(file));
    expect(status).toBe(EXIT_VIOLATIONS);
    expect(stdout).toMatch(new RegExp(`${file}:\\d+  ${name}  CCN \\d+ > ${LIMITS.ccn}`));
  });

  it('reports a function over the NLOC limit', () => {
    const { status, stdout } = runCheck(fixture('too-long.ts'));
    expect(status).toBe(EXIT_VIOLATIONS);
    expect(stdout).toMatch(/too-long\.ts:\d+  tooLong  NLOC 33 > 30  \[direct\]/);
  });

  it('reports a function over the parameter limit', () => {
    const { status, stdout } = runCheck(fixture('too-many-params.ts'));
    expect(status).toBe(EXIT_VIOLATIONS);
    expect(stdout).toMatch(/too-many-params\.ts:\d+  tooManyParams  params 6 > 5/);
  });

  it('exits 0 and counts every function of a clean file with all blind spots', () => {
    const { status, stdout } = runCheck(fixture('clean.ts'));
    expect(status).toBe(EXIT_OK);
    expect(stdout).toContain('files: 1  functions: 4 ');
    expect(stdout).not.toContain('violations');
  });

  it('reports a file over the line limit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'complexity-test-'));
    try {
      const lines = Array.from({ length: LIMITS.fileLines + 1 }, (_, i) => `export const v${i} = ${i};`);
      writeFileSync(join(dir, 'long.ts'), `${lines.join('\n')}\n`);
      const { status, stdout } = runCheck(dir);
      expect(status).toBe(EXIT_VIOLATIONS);
      expect(stdout).toMatch(/long\.ts {2}501 lines > 500/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips test files and measures nothing in them', () => {
    const dir = mkdtempSync(join(tmpdir(), 'complexity-test-'));
    try {
      writeFileSync(join(dir, 'x.test.ts'), 'export const f = (a: number) => a;\n');
      const { status, stdout } = runCheck(dir);
      expect(status).toBe(EXIT_OK);
      expect(stdout).toContain('files: 0  functions: 0 ');
      expect(stdout).toContain('skipped files: 1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function fnInfo(overrides: Partial<FunctionInfo> = {}): FunctionInfo {
  return {
    name: 'f',
    startLine: 1,
    bodyStartLine: 1,
    endLine: 3,
    paramCount: 0,
    paramsMultiline: false,
    body: { start: 0, end: 0 },
    bodyIsBlock: true,
    node: { type: 'FunctionDeclaration', start: 0, end: 0 },
    ...overrides,
  };
}

function measured(nloc: number, ccn: number, params: number, file = 'a.ts', startLine = 1): Measured {
  return { file, fn: fnInfo({ startLine }), nloc, ccn, params, method: 'direct' };
}

describe('limit evaluation', () => {
  it('flags only values strictly above each limit and names every exceeded metric', () => {
    const found = findFunctionViolations([measured(30, 10, 5), measured(31, 11, 6)]);
    expect(found).toHaveLength(1);
    expect(found[0]!.reasons).toEqual(['NLOC 31 > 30', 'CCN 11 > 10', 'params 6 > 5']);
  });

  it('orders violations by file then line', () => {
    const found = findFunctionViolations([
      measured(99, 1, 0, 'b.ts', 1),
      measured(99, 1, 0, 'a.ts', 9),
      measured(99, 1, 0, 'a.ts', 2),
    ]);
    expect(found.map((v) => `${v.measured.file}:${v.measured.fn.startLine}`)).toEqual(['a.ts:2', 'a.ts:9', 'b.ts:1']);
  });

  it('flags files strictly over 500 lines', () => {
    const found = findFileViolations(
      new Map([
        ['ok.ts', 500],
        ['big.ts', 501],
      ]),
    );
    expect(found).toEqual([{ file: 'big.ts', lines: 501 }]);
  });

  it('counts lines with and without a trailing newline', () => {
    expect([countLines(''), countLines('a'), countLines('a\n'), countLines('a\nb\n'), countLines('a\nb')]).toEqual([
      0, 1, 1, 2, 2,
    ]);
  });
});

describe('file selection', () => {
  it('skips tests, the generated option catalogue and files with the melk header', () => {
    expect(skipReason('x/a.test.ts', '')).toBe('test');
    expect(skipReason('src/core/options/CoreOptions.ts', '')).toBe('generated');
    expect(skipReason('x/a.ts', '// SPDX\n// GENERATED by tools/melk\n')).toBe('generated');
    expect(skipReason('x/a.ts', '// plain\n')).toBeNull();
  });
});

describe('lizard output parsing', () => {
  it('splits quoted CSV fields containing commas and doubled quotes', () => {
    expect(splitCsvLine('1,"a, b","c ""d"""')).toEqual(['1', 'a, b', 'c "d"']);
  });

  it('parses one function per CSV row and ignores other lines', () => {
    const row = '3,2,15,1,3,"x@3-5@/p/a.ts","/p/a.ts","x","x ( a, b )",3,5';
    expect(parseLizardCsv(`${row}\nnot csv\n`)).toEqual([
      { nloc: 3, ccn: 2, params: 1, file: '/p/a.ts', name: 'x', startLine: 3, endLine: 5 },
    ]);
  });

  it('matches by span (not just start) and prefers the same name', () => {
    const z = (name: string, startLine: number, endLine: number) => ({
      file: 'a.ts',
      name,
      nloc: 1,
      ccn: 1,
      params: 0,
      startLine,
      endLine,
    });
    const fn = fnInfo({ name: '#p', startLine: 4, bodyStartLine: 5, endLine: 9 });
    expect(matchDirect(fn, [z('other', 5, 9), z('_p', 5, 9)])?.name).toBe('_p');
    expect(matchDirect(fn, [z('_p', 5, 8)])).toBeNull();
    expect(matchDirect(fn, [z('_p', 3, 9)])).toBeNull();
  });
});

const SAMPLE = [
  "const é = '😀';",
  'class K {',
  '  #p(a: number, b = new Map<string, number>()): number {',
  '    return a;',
  '  }',
  '  get x(): number {',
  '    return /\'/.test("");',
  '  }',
  '}',
  'export const arrow = (n: number) => n + 1;',
  '',
].join('\n');

describe('inventory', () => {
  const model = buildFileModel('sample.ts', SAMPLE);

  it('lists every function-like node with name, span and parameter count', () => {
    expect(model.functions.map((f) => [f.name, f.startLine, f.endLine, f.paramCount])).toEqual([
      ['#p', 3, 5, 2],
      ['get x', 6, 8, 0],
      ['arrow', 10, 10, 1],
    ]);
  });

  it('records private-name and regex offsets as UTF-16 string indices', () => {
    expect(SAMPLE.slice(model.privateHashOffsets[0]!, model.privateHashOffsets[0]! + 2)).toBe('#p');
    const regex = model.regexRanges[0]!;
    expect(SAMPLE.slice(regex.start, regex.end)).toBe("/'/");
  });

  it('throws naming the file on a syntax error', () => {
    expect(() => buildFileModel('bad.ts', 'function (')).toThrowError(/^bad\.ts: parse error/);
  });
});

describe('snippets', () => {
  const model = buildFileModel('sample.ts', SAMPLE);

  it('replaces parameters with placeholders and regex literals with /x/', () => {
    expect(buildSnippet(model, model.functions[1]!, false)).toBe('function f() {\n    return /x/.test("");\n  }\n');
    expect(buildSnippet(model, model.functions[0]!, false)).toBe('function f(p0, p1) {\n    return a;\n  }\n');
  });

  it('wraps an expression body and blanks type syntax when stripping', () => {
    expect(buildSnippet(model, model.functions[2]!, true)).toBe('function f(p0) { return (n + 1); }\n');
  });

  it('blanks types without changing line structure', () => {
    const typed = buildFileModel(
      't.ts',
      'function g(a: number): number {\n  const v = (a as number)!;\n  return v;\n}\n',
    );
    expect(buildSnippet(typed, typed.functions[0]!, true)).toBe(
      `function f(p0) {\n  const v =  a${' '.repeat(12)};\n  return v;\n}\n`,
    );
  });
});

describe('AST measurement (last-resort tier)', () => {
  const source = [
    'function m(a: number, f?: () => number): number {',
    '  // a comment',
    '  const t = `${a > 1 ? 1 : 2}`;',
    '  if (a && f) return 1;',
    '  const r = f?.() ?? (a > 0 ? 1 : 2);',
    '  const g = (z: number) => {',
    '    if (z) return 1;',
    '    return 2;',
    '  };',
    '  return r + g(1) + t.length;',
    '}',
  ].join('\n');
  const model = buildFileModel('m.ts', source);
  const outer = model.functions.find((f) => f.name === 'm')!;

  it('counts branches lizard-style, skipping nested functions and template literals', () => {
    // 1 + if + && + ?. + ?? (2) + ?: = 7
    expect(astCcn(outer.node)).toBe(7);
  });

  it('counts code lines of the span, excluding comments and nested function bodies', () => {
    // lines 1,3,4,5,6 (nested keeps its first line) and 10,11
    expect(astNloc(model, outer)).toBe(7);
    expect(measureByAst(model, outer)).toEqual({ nloc: 7, ccn: 7 });
  });
});
