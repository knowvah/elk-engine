// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MelkSyntaxError,
  type Expr,
  type MdAlgorithm,
  type MdBundleMember,
  type MdGroupOrOption,
  type MdOption,
} from '../../tools/melk/ast.js';
import { lex } from '../../tools/melk/lexer.js';
import { parseMelk } from '../../tools/melk/parser.js';

const SOURCES_DIR = join(import.meta.dirname, '../../tools/melk/sources');
const FILE_NAMES = [
  'Core',
  'Disco',
  'Force',
  'Labels',
  'Layered',
  'Polyomino',
  'Radial',
  'RectPacking',
  'SPOrE',
  'Stress',
  'Topdownpacking',
  'Tree',
  'VertiFlex',
].map((n) => `${n}.melk`);

const PRELUDE = 'package p.q\n';
const readSource = (name: string): string => readFileSync(join(SOURCES_DIR, name), 'utf8');

const OPTION_LINE = /^\s*(?:(?:deprecated|advanced|programmatic|output|global)\s+)*option\s+\^?\w+\s*[:{]/;
const GROUP_LINE = /^\s*group\s+\w+\s*\{/;
const CATEGORY_LINE = /^\s*(?:deprecated\s+)?category\s+\w+\s*\{/;
const ALGORITHM_LINE = /^\s*(?:deprecated\s+)?algorithm\s+\w+\s*\(/;
const SUPPORTS_LINE = /^\s*supports\s+[\w.^]+\s*(?:=.*)?$/;

const countLines = (text: string, re: RegExp): number => text.split('\n').filter((l) => re.test(l)).length;

function flatten(members: readonly (MdBundleMember | MdGroupOrOption)[]): (MdBundleMember | MdGroupOrOption)[] {
  return members.flatMap((m) => (m.kind === 'group' ? [m, ...flatten(m.children)] : [m]));
}

function parseOne(body: string): MdBundleMember {
  const member = parseMelk(PRELUDE + body, 't.melk').members[0];
  if (member === undefined) throw new Error('no member parsed');
  return member;
}

function defaultOf(expr: string): Expr {
  const m = parseOne(`option o { default = ${expr} }`) as MdOption;
  if (m.defaultValue === null) throw new Error('no default');
  return m.defaultValue;
}

function errorOf(text: string): MelkSyntaxError {
  try {
    parseMelk(text, 'bad.melk');
  } catch (e) {
    if (e instanceof MelkSyntaxError) return e;
    throw e;
  }
  throw new Error('expected MelkSyntaxError');
}

describe('parseMelk on the vendored sources', () => {
  it.each(FILE_NAMES)('%s parses with counts matching the source', (name) => {
    const text = readSource(name);
    const file = parseMelk(text, name);
    const all = flatten(file.members);
    expect(all.filter((m) => m.kind === 'option').length).toBe(countLines(text, OPTION_LINE));
    expect(all.filter((m) => m.kind === 'group').length).toBe(countLines(text, GROUP_LINE));
    expect(all.filter((m) => m.kind === 'category').length).toBe(countLines(text, CATEGORY_LINE));
    const algorithms = all.filter((m): m is MdAlgorithm => m.kind === 'algorithm');
    expect(algorithms.length).toBe(countLines(text, ALGORITHM_LINE));
    const supports = algorithms.reduce((n, a) => n + a.supportedOptions.length, 0);
    expect(supports).toBe(countLines(text, SUPPORTS_LINE));
  });

  it('reads the Core algorithms and the topdown dependency', () => {
    const file = parseMelk(readSource('Core.melk'), 'Core.melk');
    const providers = Object.fromEntries(
      file.members.filter((m): m is MdAlgorithm => m.kind === 'algorithm').map((a) => [a.name, a.provider.name]),
    );
    expect(providers).toMatchObject({
      fixed: 'FixedLayoutProvider',
      box: 'BoxLayoutProvider',
      random: 'RandomLayoutProvider',
    });
    const topdown = file.members.find((m) => m.kind === 'group' && m.name === 'topdown');
    const option = flatten([topdown as MdGroupOrOption]).find(
      (m) => m.kind === 'option' && m.name === 'sizeCategories',
    );
    expect((option as MdOption).dependencies).toEqual([
      {
        target: 'sizeApproximator',
        value: { kind: 'ref', segments: ['TopdownSizeApproximator', 'FIXED_INTEGER_RATIO_BOXES'] },
      },
    ]);
  });

  it('resolves the ^labels escape in the package name and bundle', () => {
    const file = parseMelk(readSource('Labels.melk'), 'Labels.melk');
    expect(file.packageName).toBe('org.eclipse.elk.core.labels');
    expect(file.bundle).toEqual({
      label: 'ELK Label Management',
      targetClass: 'LabelManagementOptions',
      documentationFolder: null,
      idPrefix: 'org.eclipse.elk.labels',
    });
    const option = file.members[0] as MdOption;
    expect(option).toMatchObject({ name: 'labelManager', modifier: 'programmatic', targets: ['parents', 'labels'] });
    expect(option.type).toEqual({ name: 'ILabelManager', args: [] });
  });

  it('keeps imports including nested type names and generic option types', () => {
    const core = parseMelk(readSource('Core.melk'), 'Core.melk');
    expect(core.imports).toContain('java.util.EnumSet');
    const stress = parseMelk(readSource('Stress.melk'), 'Stress.melk');
    expect(stress.imports).toContain('org.eclipse.elk.alg.force.stress.StressMajorization.Dimension');
    const layered = parseMelk(readSource('Layered.melk'), 'Layered.melk');
    const list = flatten(layered.members).find(
      (m) => m.kind === 'option' && m.type?.name === 'List' && m.defaultValue !== null,
    ) as MdOption;
    expect(list.type).toEqual({ name: 'List', args: [{ name: 'Integer', args: [] }] });
    expect(list.defaultValue).toMatchObject({ kind: 'list' });
  });
});

describe('declarations', () => {
  it('parses an option with every clause in shuffled order', () => {
    const o = parseOne(`deprecated advanced option ab : int {
      legacyIds x.y, z
      targets nodes, ports
      upperBound = 9
      lowerBound = -1
      default = 3
      documentation "d.md"
      description "desc"
      label "L"
      requires other == true
      requires more
    }`) as MdOption;
    expect(o).toMatchObject({
      kind: 'option',
      deprecated: true,
      modifier: 'advanced',
      label: 'L',
      description: 'desc',
      documentation: 'd.md',
      targets: ['nodes', 'ports'],
      legacyIds: ['x.y', 'z'],
      line: 2,
    });
    expect(o.lowerBound).toEqual({
      kind: 'unary',
      operator: '-',
      operand: { kind: 'literal', type: 'int', raw: '1', suffix: null },
    });
    expect(o.dependencies.map((d) => d.target)).toEqual(['other', 'more']);
  });

  it.each(['advanced', 'programmatic', 'output', 'global'] as const)('reads the %s modifier', (m) => {
    expect((parseOne(`${m} option o {}`) as MdOption).modifier).toBe(m);
  });

  it('parses groups with documentation and nested children', () => {
    const g = parseOne('group g { documentation "doc" group h { option o {} } option p {} }');
    expect(g).toMatchObject({ kind: 'group', name: 'g', documentation: 'doc' });
    expect(flatten([g]).map((m) => m.kind)).toEqual(['group', 'group', 'option', 'option']);
  });

  it('parses a full algorithm', () => {
    const a = parseOne(`deprecated algorithm alg(pkg.Provider # param) {
      validator Val
      features self_loops, clusters
      preview images/a-b.png
      category org.x.cat
      documentation "doc"
      description "desc"
      metadataClass Meta
      label "Lbl"
      supports one = 1 documentation "why"
      supports two
    }`) as MdAlgorithm;
    expect(a).toMatchObject({
      deprecated: true,
      provider: { name: 'pkg.Provider', args: [] },
      parameter: 'param',
      label: 'Lbl',
      targetClass: 'Meta',
      description: 'desc',
      documentation: 'doc',
      category: 'org.x.cat',
      previewImage: 'images/a-b.png',
      supportedFeatures: ['self_loops', 'clusters'],
      validator: { name: 'Val', args: [] },
    });
    expect(a.supportedOptions).toEqual([
      { option: 'one', value: { kind: 'literal', type: 'int', raw: '1', suffix: null }, documentation: 'why' },
      { option: 'two', value: null, documentation: null },
    ]);
  });

  it('parses a category and a bundle with all clauses', () => {
    const file = parseMelk(
      `package a.b
      import x.Y
      import x.*
      bundle { idPrefix p.q documentationFolder docs/x-y label "B" metadataClass M }
      deprecated category c { description "d" documentation "x" label "l" }`,
      't.melk',
    );
    expect(file.imports).toEqual(['x.Y', 'x.*']);
    expect(file.bundle).toEqual({ label: 'B', targetClass: 'M', documentationFolder: 'docs/x-y', idPrefix: 'p.q' });
    expect(file.members[0]).toMatchObject({ kind: 'category', name: 'c', deprecated: true, label: 'l' });
  });

  it('yields an empty bundle without a bundle block and an empty file without a package', () => {
    expect(parseMelk('package a', 't').bundle).toEqual({
      label: null,
      targetClass: null,
      documentationFolder: null,
      idPrefix: null,
    });
    expect(parseMelk('// nothing', 't')).toEqual({
      fileName: 't',
      packageName: null,
      imports: [],
      bundle: null,
      members: [],
    });
  });

  it('treats clause words as plain names when escaped or out of position', () => {
    const o = parseOne('option ^default { default = default }') as MdOption;
    expect(o.name).toBe('default');
    expect(o.defaultValue).toEqual({ kind: 'ref', segments: ['default'] });
    expect((parseOne('option constructor {}') as MdOption).name).toBe('constructor');
  });
});

describe('expressions', () => {
  it.each([
    ['0', { kind: 'literal', type: 'int', raw: '0', suffix: null }],
    ['1_000', { kind: 'literal', type: 'int', raw: '1_000', suffix: null }],
    ['5L', { kind: 'literal', type: 'int', raw: '5', suffix: 'l' }],
    ['1.5', { kind: 'literal', type: 'decimal', raw: '1.5', suffix: null }],
    ['2f', { kind: 'literal', type: 'decimal', raw: '2', suffix: 'f' }],
    ['0.25d', { kind: 'literal', type: 'decimal', raw: '0.25', suffix: 'd' }],
    ['10e-4', { kind: 'literal', type: 'decimal', raw: '10e-4', suffix: null }],
    ['1E+3', { kind: 'literal', type: 'decimal', raw: '1E+3', suffix: null }],
    ['true', { kind: 'literal', type: 'boolean', raw: 'true', suffix: null }],
    ['false', { kind: 'literal', type: 'boolean', raw: 'false', suffix: null }],
    ['"s"', { kind: 'literal', type: 'string', raw: 's', suffix: null }],
    ['null', { kind: 'null' }],
    ['Integer.MAX_VALUE', { kind: 'ref', segments: ['Integer', 'MAX_VALUE'] }],
    ['A.B.C', { kind: 'ref', segments: ['A', 'B', 'C'] }],
    [
      'new KVector(0, 1.5f)',
      {
        kind: 'new',
        type: { name: 'KVector', args: [] },
        args: [
          { kind: 'literal', type: 'int', raw: '0', suffix: null },
          { kind: 'literal', type: 'decimal', raw: '1.5', suffix: 'f' },
        ],
      },
    ],
    ['new KVectorChain()', { kind: 'new', type: { name: 'KVectorChain', args: [] }, args: [] }],
    ['ContentAlignment.topLeft()', { kind: 'call', receiver: ['ContentAlignment'], name: 'topLeft', args: [] }],
    [
      'f(1)',
      { kind: 'call', receiver: [], name: 'f', args: [{ kind: 'literal', type: 'int', raw: '1', suffix: null }] },
    ],
    [
      'EnumSet.noneOf(SizeConstraint)',
      {
        kind: 'call',
        receiver: ['EnumSet'],
        name: 'noneOf',
        args: [{ kind: 'ref', segments: ['SizeConstraint'] }],
      },
    ],
    ['#[]', { kind: 'list', elements: [] }],
    [
      '#[1, 2]',
      {
        kind: 'list',
        elements: [
          { kind: 'literal', type: 'int', raw: '1', suffix: null },
          { kind: 'literal', type: 'int', raw: '2', suffix: null },
        ],
      },
    ],
  ] satisfies [string, Expr][])('parses %s', (source, expected) => {
    expect(defaultOf(source)).toEqual(expected);
  });

  it('parses nested calls', () => {
    expect(defaultOf('ExclusiveBounds.greaterThan(-1)')).toEqual({
      kind: 'call',
      receiver: ['ExclusiveBounds'],
      name: 'greaterThan',
      args: [{ kind: 'unary', operator: '-', operand: { kind: 'literal', type: 'int', raw: '1', suffix: null } }],
    });
  });
});

describe('lexer', () => {
  it('resolves string escapes and keeps multi-line content', () => {
    const [t] = lex(`'a\\n\\t\\"q\\\\ \\u0041 \\z\n  second'`, 'x');
    expect(t?.text).toBe('a\n\t"q\\ A z\n  second');
  });

  it('skips comments and tracks positions', () => {
    const tokens = lex('/* a\n b */ // c\n  foo "s"', 'x');
    expect(tokens.map((t) => [t.kind, t.text, t.line, t.column])).toEqual([
      ['id', 'foo', 3, 3],
      ['string', 's', 3, 7],
      ['eof', '', 3, 10],
    ]);
  });

  it('lexes == and a dot that is not a decimal point', () => {
    expect(lex('a == 1.x 2e', 'x').map((t) => t.text)).toEqual(['a', '==', '1', '.', 'x', '2', 'e', '']);
  });
});

describe('errors', () => {
  it('rejects a repeated clause in an unordered group, naming file, line and column', () => {
    const e = errorOf('package p\noption o {\n  label "a"\n  label "b"\n}');
    expect(e).toMatchObject({ fileName: 'bad.melk', line: 4, column: 3 });
    expect(e.message).toBe("bad.melk:4:3: clause 'label' appears more than once");
  });

  it('rejects a lambda', () => {
    const e = errorOf('package p\noption o { default = [ x | x ] }');
    expect(e).toMatchObject({ line: 2, column: 22 });
    expect(e.message).toContain("unsupported expression form 'lambda'");
  });

  it.each([
    ['if (true) 1', "'if'"],
    ['{ 1 }', 'block expression'],
    ['(1)', 'parenthesized expression'],
    ['}', "'}'"],
    ['a.b(1).c', 'chained member access'],
  ])('rejects the expression %s', (source, form) => {
    expect(errorOf(`package p\noption o { default = ${source} }`).message).toContain(form);
  });

  it.each([
    ['unterminated comment', 'package p /* x', 'unterminated comment'],
    ['unterminated string', 'package p option o { label "x', 'unterminated string'],
    ['dangling backslash', 'package p option o { label "x\\', 'unterminated string'],
    ['bad unicode escape', 'package p option o { label "\\u12G4" }', 'invalid unicode escape'],
    ['bare caret', 'package p option ^ {}', 'identifier expected after ^'],
    ['stray character', 'package p @', "unexpected character '@'"],
    ['static import', 'package p import static a.B', "'import static'"],
    ['unknown target', 'package p option o { targets cats }', 'an option target'],
    ['unknown feature', 'package p algorithm a(P) { features wings }', 'a graph feature'],
    ['modifier without option', 'package p advanced group g {}', "expected 'option'"],
    ['deprecated group', 'package p deprecated group g {}', "'option', 'algorithm', 'category' or 'group'"],
    ['algorithm in group', 'package p group g { category c {} }', "'option' or 'group'"],
    ['missing brace', 'package p option o', "expected '{'"],
    ['missing name', 'package p option {}', 'an identifier'],
    ['missing string', 'package p option o { label x }', 'a string'],
    ['unclosed group at eof', 'package p group g {', 'end of file'],
    ['text before package', 'option o {}', "expected 'package'"],
  ])('rejects %s', (_name, text, message) => {
    const e = errorOf(text);
    expect(e.message).toContain(message);
    expect(e.line).toBeGreaterThanOrEqual(1);
  });
});
