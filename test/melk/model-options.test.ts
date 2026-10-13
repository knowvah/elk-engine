// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { MdAlgorithm, MelkFile } from '../../tools/melk/ast.js';
import { buildImportScope, classPath } from '../../tools/melk/expr.js';
import { ModelError, UnportedClassError } from '../../tools/melk/model-errors.js';
import { allOptionDefinitions, buildOptionIndex, resolveOptionReference } from '../../tools/melk/model-index.js';
import {
  algorithmClassName,
  bundleClassName,
  constantName,
  defaultConstantName,
  dependencyConstantName,
  lowerBoundConstantName,
  memberId,
  scopedName,
  shrinkWhiteSpace,
  toUpperCaseWithUnderscores,
  upperBoundConstantName,
} from '../../tools/melk/model-names.js';
import { resolveOptionType } from '../../tools/melk/model-types.js';
import { resolveAll, type OptionData, type ResolvedBundle } from '../../tools/melk/model.js';
import { parseMelk } from '../../tools/melk/parser.js';
import {
  diffCalls,
  dumpCalls,
  firstDifference,
  MELK_NAMES,
  modelCalls,
  parseVendored,
  resolveVendored,
  vendoredBundle,
} from './helpers.js';

const OPTION_COUNT_IN_DUMP = 250;
const EXAMPLE_PACKAGE = 'org.example';

/** Resolves a synthetic file: a package, the given imports, a bundle block and the given members. */
function resolveSnippet(members: string, imports = '', bundle = 'idPrefix org.example'): ResolvedBundle {
  const text = `package ${EXAMPLE_PACKAGE}\n${imports}\nbundle {\n metadataClass options.ExampleOptions\n ${bundle}\n}\n${members}`;
  const [resolved] = resolveAll([parseMelk(text, 'Example.melk')]);
  if (resolved === undefined) {
    throw new Error('snippet did not resolve');
  }
  return resolved;
}

function snippetOptions(members: string, imports = ''): OptionData[] {
  return resolveSnippet(members, imports).options.map((option) => option.data);
}

function onlyOption(members: string, imports = ''): OptionData {
  const [option] = snippetOptions(members, imports);
  if (option === undefined) {
    throw new Error('snippet has no option');
  }
  return option;
}

describe('option model against the JVM dump', () => {
  it.each(MELK_NAMES)('%s: option, category and dependency calls equal the dump', (name) => {
    const bundle = vendoredBundle(name);
    const expected = dumpCalls(bundle.bundleClass);
    expect(expected.length).toBeGreaterThan(0);
    expect(modelCalls(bundle)).toHaveLength(expected.length);
    expect(diffCalls(modelCalls(bundle), expected)).toBeNull();
  });

  it('resolves exactly the 250 options of the dump across the 13 files', () => {
    const count = resolveVendored()
      .flatMap((bundle) => bundle.calls)
      .filter((call) => call.call === 'registerOption').length;
    expect(count).toBe(OPTION_COUNT_IN_DUMP);
  });

  it('keys every bundle by a class the dump has a provider for, including the algorithm classes', () => {
    for (const name of MELK_NAMES) {
      const file = parseVendored(name);
      expect(dumpCalls(bundleClassName(file), ['registerOption', 'registerCategory']).length).toBeGreaterThanOrEqual(0);
      for (const member of file.members.filter((m): m is MdAlgorithm => m.kind === 'algorithm')) {
        expect(dumpCalls(algorithmClassName(file, member), ['registerAlgorithm'])).toHaveLength(1);
      }
    }
  });

  it('gives Labels.melk the option ids of the dump', () => {
    const bundle = vendoredBundle('Labels');
    expect(bundle.packageName).toBe('org.eclipse.elk.core.labels');
    expect(bundle.bundleClass).toBe('org.eclipse.elk.core.labels.LabelManagementOptions');
    const ids = bundle.options.map((option) => option.data.id);
    const expected = dumpCalls(bundle.bundleClass, ['registerOption']).map((call) =>
      call.call === 'registerOption' ? call.data.id : '',
    );
    expect(ids).toEqual(expected);
    expect(ids).toHaveLength(1);
  });

  it('collapses line breaks and runs of spaces in descriptions exactly as the dump does', () => {
    const padding = vendoredBundle('Core').options.find((option) => option.data.id === 'org.eclipse.elk.padding');
    const expected = dumpCalls('org.eclipse.elk.core.options.CoreOptions', ['registerOption']).find(
      (call) => call.call === 'registerOption' && call.data.id === 'org.eclipse.elk.padding',
    );
    const source = padding?.entry.option.description ?? '';
    expect(source).toMatch(/\n/);
    expect(padding?.data.description).toMatch(
      /^The padding to be left to a parent element's border when placing child elements\. This can also serve/,
    );
    expect(padding?.data.description).not.toMatch(/\s{2}|\n/);
    expect(expected?.call === 'registerOption' ? expected.data.description : null).toBe(padding?.data.description);
  });

  it('encodes every default and bound of Core.melk as the dump does', () => {
    const bundle = vendoredBundle('Core');
    const expected = new Map(
      dumpCalls(bundle.bundleClass, ['registerOption']).flatMap((call) =>
        call.call === 'registerOption' ? [[call.data.id, call.data] as const] : [],
      ),
    );
    let defaults = 0;
    let bounds = 0;
    for (const option of bundle.options) {
      const dump = expected.get(option.data.id);
      expect(dump).toBeDefined();
      expect(option.data.default).toEqual(dump?.default);
      expect(option.data.lowerBound).toEqual(dump?.lowerBound);
      expect(option.data.upperBound).toEqual(dump?.upperBound);
      defaults += option.data.default === null ? 0 : 1;
      bounds += (option.data.lowerBound === null ? 0 : 1) + (option.data.upperBound === null ? 0 : 1);
    }
    expect(defaults).toBeGreaterThan(60);
    expect(bounds).toBeGreaterThan(5);
  });

  it('widens an Nf literal to a double and encodes an exclusive lower bound as the dump does', () => {
    const options = vendoredBundle('Core').options;
    const component = options.find((o) => o.data.id === 'org.eclipse.elk.spacing.componentComponent');
    expect(component?.entry.option.defaultValue).toMatchObject({ kind: 'literal', raw: '20', suffix: 'f' });
    expect(component?.data.default).toEqual({ t: 'double', v: '20.0' });
    expect(options.find((o) => o.data.id === 'org.eclipse.elk.aspectRatio')?.data.lowerBound).toEqual({
      t: 'obj',
      c: 'ExclusiveLowerBound',
      fields: { exclusiveLowerBound: { t: 'double', v: '0.0' } },
    });
  });

  it('registers dependencies right after their option, then categories', () => {
    const core = vendoredBundle('Core');
    const kinds = core.calls.map((call) => call.call);
    expect(kinds.lastIndexOf('registerOption')).toBeLessThan(kinds.indexOf('registerCategory'));
    const firstDependency = kinds.indexOf('addDependency');
    expect(kinds[firstDependency - 1]).toMatch(/registerOption|addDependency/);
    const call = core.calls[firstDependency];
    const previous = core.calls[firstDependency - 1];
    expect(call?.call === 'addDependency' && previous?.call === 'registerOption' ? call.source : null).toBe(
      previous?.call === 'registerOption' ? previous.data.id : undefined,
    );
  });

  it('holds back nothing in the option model: the TopdownSizeApproximator dependency is encoded symbolically', () => {
    const dependency = vendoredBundle('Core')
      .options.flatMap((option) => option.dependencies)
      .find(
        (candidate) =>
          candidate.expression?.kind === 'ref' && candidate.expression.segments[0] === 'TopdownSizeApproximator',
      );
    expect(dependency?.value).toEqual({ t: 'enum', c: 'TopdownSizeApproximator', n: 'FIXED_INTEGER_RATIO_BOXES' });
    expect(dependency?.constantName).toBe('TOPDOWN_SIZE_CATEGORIES_DEP_TOPDOWN_SIZE_APPROXIMATOR_0');
  });
});

describe('names', () => {
  const file = (prefix: string | null, packageName: string | null = EXAMPLE_PACKAGE): MelkFile => ({
    fileName: 'Example.melk',
    packageName,
    imports: [],
    bundle: { label: null, targetClass: null, documentationFolder: null, idPrefix: prefix },
    members: [],
  });

  it('builds ids from the prefix, the groups and the name', () => {
    expect(memberId(file('org.example.p'), ['a', 'b'], 'name')).toBe('org.example.p.a.b.name');
    expect(memberId(file(null), [], 'name')).toBe('org.example.name');
  });

  it('drops the last prefix segment when the member repeats it', () => {
    expect(memberId(file('org.eclipse.elk.layered'), [], 'layered')).toBe('org.eclipse.elk.layered');
    expect(memberId(file('org.eclipse.elk.layered'), ['g'], 'layered')).toBe('org.eclipse.elk.g.layered');
  });

  it('rejects a repeated one-segment prefix, which Java cannot cut', () => {
    expect(() => memberId(file('elk'), [], 'elk')).toThrow(ModelError);
  });

  it('refuses ids and names for a file without a package', () => {
    expect(() => memberId(file(null, null), [], 'x')).toThrow(/no package declaration/);
    expect(() => scopedName(file(null, null), [], 'x')).toThrow(ModelError);
  });

  it('builds scoped names from the package, not the prefix', () => {
    expect(scopedName(file('org.other'), ['g'], 'x')).toBe('org.example.g.x');
  });

  it('spells constants with underscores before inner capitals', () => {
    expect(toUpperCaseWithUnderscores('nodeSizeMinimum')).toBe('NODE_SIZE_MINIMUM');
    expect(toUpperCaseWithUnderscores('Ab')).toBe('AB');
    expect(constantName(['crossingMinimization', 'greedySwitch'], 'type')).toBe(
      'CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE',
    );
    expect(constantName([], 'aspectRatio')).toBe('ASPECT_RATIO');
  });

  it('derives the default, bound and dependency constant names', () => {
    expect(defaultConstantName('X')).toBe('X_DEFAULT');
    expect(lowerBoundConstantName('X')).toBe('X_LOWER_BOUND');
    expect(upperBoundConstantName('X')).toBe('X_UPPER_BOUND');
    expect(dependencyConstantName('X', 'Y', 2)).toBe('X_DEP_Y_2');
  });

  it('names bundle and algorithm classes', () => {
    expect(bundleClassName(parseVendored('Core'))).toBe('org.eclipse.elk.core.options.CoreOptions');
    const noClass = { ...file(null), bundle: { ...file(null).bundle, targetClass: null } } as MelkFile;
    expect(bundleClassName(noClass)).toBe('org.example.Metadata');
    const algorithm = { name: 'fooBar', targetClass: null } as MdAlgorithm;
    expect(algorithmClassName(noClass, algorithm)).toBe('org.example.FooBarMetadata');
    expect(algorithmClassName(noClass, { name: 'x', targetClass: 'options.Mine' } as MdAlgorithm)).toBe(
      'org.example.options.Mine',
    );
    expect(algorithmClassName(noClass, { name: '', targetClass: null } as MdAlgorithm)).toBe('org.example.Metadata');
  });

  it('shrinks white space like the inferrer', () => {
    expect(shrinkWhiteSpace(null)).toBeNull();
    expect(shrinkWhiteSpace('')).toBe('');
    expect(shrinkWhiteSpace('   ')).toBe('');
    expect(shrinkWhiteSpace('  a \n\t b   c  ')).toBe('a b c');
    expect(shrinkWhiteSpace('a b')).toBe('a b');
    expect(shrinkWhiteSpace('a　 b')).toBe('a b');
  });
});

describe('option fields', () => {
  it('maps modifiers to visibility and orders targets by ordinal', () => {
    const options = snippetOptions(`
      option a: boolean { targets labels, parents default = true }
      advanced option b: boolean { targets nodes }
      programmatic option c: boolean { targets edges }
      output option d: boolean { targets ports }
      global option e: boolean { targets parents }
    `);
    expect(options.map((o) => o.visibility)).toEqual(['VISIBLE', 'ADVANCED', 'HIDDEN', 'HIDDEN', 'HIDDEN']);
    expect(options[0]?.targets).toEqual(['PARENTS', 'LABELS']);
    expect(options[0]?.default).toEqual({ t: 'bool', v: true });
  });

  it('registers the options of a level before those of its groups, recursively', () => {
    const bundle = resolveSnippet(`
      group g { option inG: int { } group h { option inH: int { } } option inG2: int { } }
      option top: int { }
      group k { option inK: int { } }
    `);
    expect(bundle.options.map((o) => o.data.id)).toEqual([
      'org.example.top',
      'org.example.g.inG',
      'org.example.g.inG2',
      'org.example.g.h.inH',
      'org.example.k.inK',
    ]);
    expect(bundle.options.map((o) => o.data.group)).toEqual(['', 'g', 'g', 'g.h', 'k']);
    expect(allOptionDefinitions(bundle.source.members).map((d) => d.option.name)).toEqual(
      bundle.options.map((o) => o.entry.option.name),
    );
  });

  it('uses the label (shrunk) as name, keeps legacy ids, gives no targets and no legacy ids as empty and null', () => {
    const [labelled, plain] = snippetOptions(`
      option x: boolean { label "A   long
        label" legacyIds old.one, old.two }
      option y: boolean { }
    `);
    expect(labelled?.name).toBe('A long label');
    expect(labelled?.legacyIds).toEqual(['old.one', 'old.two']);
    expect(plain?.name).toBe('y');
    expect(plain?.legacyIds).toBeNull();
    expect(plain?.targets).toEqual([]);
    expect(plain?.description).toBeNull();
  });

  it('registers categories with shrunk names and descriptions under the prefix id', () => {
    const bundle = resolveSnippet(`category cat { label "My   Cat" description "d  e" }  category example { }`);
    expect(bundle.calls).toEqual([
      { call: 'registerCategory', data: { id: 'org.example.cat', name: 'My Cat', description: 'd e' } },
      { call: 'registerCategory', data: { id: 'org.example', name: 'example', description: null } },
    ]);
  });

  it('skips a file without a package', () => {
    expect(resolveAll([parseMelk('', 'Empty.melk')])).toEqual([]);
  });
});

describe('option types', () => {
  const cases: [string, string, string, string][] = [
    ['boolean', 'BOOLEAN', 'Boolean', 'boolean'],
    ['Boolean', 'BOOLEAN', 'Boolean', 'boolean'],
    ['int', 'INT', 'Integer', 'int'],
    ['Integer', 'INT', 'Integer', 'int'],
    ['double', 'DOUBLE', 'Double', 'double'],
    ['Double', 'DOUBLE', 'Double', 'double'],
    ['float', 'DOUBLE', 'Double', 'float'],
    ['Float', 'DOUBLE', 'Double', 'float'],
    ['String', 'STRING', 'String', 'string'],
    ['Direction', 'ENUM', 'Direction', 'other'],
    ['java.util.List<Integer>', 'OBJECT', 'List', 'other'],
    ['KVector', 'OBJECT', 'KVector', 'other'],
    ['EnumSet<SizeOptions>', 'ENUMSET', 'SizeOptions', 'other'],
  ];

  it.each(cases)('%s resolves to %s with option class %s', (written, type, optionClass, valueKind) => {
    const parsed = parseMelk(`package p\nbundle { }\noption o: ${written} { }`, 'T.melk');
    const member = parsed.members[0];
    const info = resolveOptionType(member?.kind === 'option' ? member.type : null);
    expect([info.type, info.optionClass, info.valueKind]).toEqual([type, optionClass, valueKind]);
  });

  it('types an option without a type as UNDEFINED / Void', () => {
    expect(resolveOptionType(null)).toMatchObject({ type: 'UNDEFINED', optionClass: 'Void', elementClass: null });
  });

  it('rejects long, unknown classes and EnumSet without a type argument', () => {
    expect(() => snippetOptions('option o: long { }')).toThrow(/no value encoding/);
    expect(() => snippetOptions('option o: Mystery { }')).toThrow(/class index/);
    expect(() => snippetOptions('option o: EnumSet { }')).toThrow(/no type argument/);
  });
});

describe('expressions', () => {
  it('widens and narrows numbers by the assignment target', () => {
    const options = snippetOptions(`
      option a: double { default = 3 lowerBound = -1 upperBound = 2.5 }
      option b: float { default = 0.1f lowerBound = 2 }
      option c: Double { default = 1.0d }
      option d: int { default = -7 lowerBound = 0 upperBound = Integer.MAX_VALUE }
      option e: int { default = Integer.MIN_VALUE }
      option f: double { default = -0.0 }
      option g: Object { default = 5 lowerBound = 1.5 }
    `);
    expect(options[0]).toMatchObject({
      default: { t: 'double', v: '3.0' },
      lowerBound: { t: 'double', v: '-1.0' },
      upperBound: { t: 'double', v: '2.5' },
    });
    expect(options[1]).toMatchObject({
      default: { t: 'double', v: '0.10000000149011612' },
      lowerBound: { t: 'double', v: '2.0' },
    });
    expect(options[2]?.default).toEqual({ t: 'double', v: '1.0' });
    expect(options[3]).toMatchObject({
      default: { t: 'int', v: -7 },
      lowerBound: { t: 'int', v: 0 },
      upperBound: { t: 'int', v: 2147483647 },
    });
    expect(options[4]?.default).toEqual({ t: 'int', v: -2147483648 });
    expect(options[5]?.default).toEqual({ t: 'double', v: '-0.0' });
    expect(options[6]).toMatchObject({ default: { t: 'int', v: 5 }, lowerBound: { t: 'double', v: '1.5' } });
  });

  it('rejects numbers that Java would not assign', () => {
    expect(() => onlyOption('option o: int { default = 1.5 }')).toThrow(/cannot be assigned to an int/);
    expect(() => onlyOption('option o: int { default = 2147483648 }')).toThrow(/cannot be assigned to an int/);
    expect(() => onlyOption('option o: int { default = 5l }')).toThrow(/long values/);
    expect(() => onlyOption('option o: float { default = 0.5 }')).toThrow(/without a cast/);
    expect(() => onlyOption('option o: boolean { default = 1 }')).toThrow(/cannot be assigned to a boolean/);
    expect(() => onlyOption('option o: double { default = true }')).toThrow(
      /bool value cannot be assigned to a double/,
    );
    expect(() => onlyOption('option o: double { default = "x" }')).toThrow(ModelError);
    expect(() => onlyOption('option o: String { default = 3 }')).toThrow(/cannot be assigned to a string/);
    expect(() => onlyOption('option o: Object { default = -true }')).toThrow(/unary minus/);
  });

  it('encodes strings, null and list literals', () => {
    const options = snippetOptions(
      `
      option s: String { default = "a b" }
      option n: Integer { default = null }
      option l: List<Integer> { default = #[1, 2] }
    `,
      'import java.util.List',
    );
    expect(options[0]?.default).toEqual({ t: 'string', v: 'a b' });
    expect(options[1]?.default).toBeNull();
    expect(options[2]?.default).toEqual({
      t: 'list',
      c: 'UnmodifiableRandomAccessList',
      items: [
        { t: 'int', v: 1 },
        { t: 'int', v: 2 },
      ],
    });
  });

  it('evaluates ported constructors, factories and sets through the TS ports', () => {
    const options = snippetOptions(
      `
      option v: KVector { default = new KVector(1, 2.5) }
      option c: KVectorChain { default = new KVectorChain() }
      option p: ElkPadding { default = new ElkPadding(1, 2, 3, 4) }
      option m: ElkMargin { default = new ElkMargin() }
      option u: double { upperBound = ExclusiveBounds.lessThan(4) }
      option s: EnumSet<SizeOptions> { default = EnumSet.of(SizeOptions.PORTS_OVERHANG, SizeOptions.DEFAULT_MINIMUM_SIZE) }
      option t: EnumSet<SizeConstraint> { default = EnumSet.noneOf(SizeConstraint) }
      option a: EnumSet<ContentAlignment> { default = ContentAlignment.topLeft() }
      option f: EnumSet<NodeLabelPlacement> { default = NodeLabelPlacement.fixed }
    `,
      'import org.example.ExclusiveBounds',
    );
    expect(options[0]?.default).toEqual({
      t: 'obj',
      c: 'KVector',
      fields: { x: { t: 'double', v: '1.0' }, y: { t: 'double', v: '2.5' } },
    });
    expect(options[1]?.default).toEqual({ t: 'list', c: 'KVectorChain', items: [] });
    expect(options[2]?.default).toMatchObject({
      c: 'ElkPadding',
      fields: { top: { v: '1.0' }, right: { v: '2.0' }, bottom: { v: '3.0' }, left: { v: '4.0' } },
    });
    expect(options[3]?.default).toMatchObject({ c: 'ElkMargin', fields: { top: { v: '0.0' } } });
    expect(options[4]?.upperBound).toEqual({
      t: 'obj',
      c: 'ExclusiveUpperBound',
      fields: { exclusiveUpperBound: { t: 'double', v: '4.0' } },
    });
    expect(options[5]?.default).toEqual({
      t: 'set',
      c: 'SizeOptions',
      items: ['DEFAULT_MINIMUM_SIZE', 'PORTS_OVERHANG'],
    });
    expect(options[6]?.default).toEqual({ t: 'set', c: 'SizeConstraint', items: [] });
    expect(options[7]?.default).toEqual({ t: 'set', c: 'ContentAlignment', items: ['V_TOP', 'H_LEFT'] });
    expect(options[8]?.default).toEqual({ t: 'set', c: 'NodeLabelPlacement', items: [] });
  });

  it('names nested enum constants by their outer class, through the imports', () => {
    const options = snippetOptions(
      `
      option a: PackingMode { default = BoxLayoutProvider.PackingMode.SIMPLE }
      option b: PackingMode { default = PackingMode.GROUP_DEC }
      option c: Direction { default = Direction.UP }
    `,
      'import org.eclipse.elk.core.util.BoxLayoutProvider\nimport org.eclipse.elk.core.util.BoxLayoutProvider.PackingMode',
    );
    expect(options.map((o) => o.default)).toEqual([
      { t: 'enum', c: 'BoxLayoutProvider.PackingMode', n: 'SIMPLE' },
      { t: 'enum', c: 'BoxLayoutProvider.PackingMode', n: 'GROUP_DEC' },
      { t: 'enum', c: 'Direction', n: 'UP' },
    ]);
  });

  it('stops on behaviour of unported classes (stop condition 9)', () => {
    expect(() => onlyOption('option o: EnumSet<PortSide> { default = EnumSet.of(PortSide.NORTH) }')).toThrow(
      UnportedClassError,
    );
    expect(() => onlyOption('option o: EnumSet<PortSide> { default = EnumSet.noneOf(PortSide) }')).toThrow(
      /class literal 'PortSide'/,
    );
    expect(() => onlyOption('option o: Object { default = IndividualSpacings.X }')).toThrow(UnportedClassError);
    expect(() => onlyOption('option o: Object { default = new IndividualSpacings() }')).toThrow(UnportedClassError);
    expect(() => onlyOption('option o: Object { default = ElkPadding.other() }')).toThrow(UnportedClassError);
  });

  it('rejects expressions the tables cannot evaluate', () => {
    expect(() => onlyOption('option o: Object { default = Mystery.fn() }')).toThrow(/unknown class 'Mystery'/);
    expect(() => onlyOption('option o: Object { default = new Mystery() }')).toThrow(ModelError);
    expect(() => onlyOption('option o: Object { default = EnumSet.of() }')).toThrow(/at least one/);
    expect(() => onlyOption('option o: Object { default = EnumSet.of(1) }')).toThrow(/enum constants/);
    expect(() => onlyOption('option o: Object { default = EnumSet.noneOf() }')).toThrow(/class literal/);
    expect(() => onlyOption('option o: Object { default = ExclusiveBounds.greaterThan() }')).toThrow(/exactly one/);
    expect(() => onlyOption('option o: Object { default = ExclusiveBounds.greaterThan(1, 2) }')).toThrow(/exactly one/);
    expect(() => onlyOption('option o: Object { default = ExclusiveBounds.greaterThan(true) }')).toThrow(
      /must be a number/,
    );
    expect(() => onlyOption('option o: Object { default = Unknown }')).toThrow(/unknown|class literal/);
    expect(() => onlyOption('option o: Object { default = someFeature }')).toThrow(ModelError);
    expect(() =>
      onlyOption('option o: EnumSet<SizeOptions> { default = EnumSet.of(SizeOptions.PORTS_OVERHANG) }'),
    ).not.toThrow();
  });

  it('refuses a native value without an EnumSet option to name its element class', () => {
    expect(() => onlyOption('option o: Object { default = NodeLabelPlacement.fixed }')).toThrow(/element class/);
    expect(() => onlyOption('option o: Object { default = ContentAlignment.topLeft() }')).toThrow(/element class/);
  });

  it('resolves import scopes and class paths', () => {
    const scope = buildImportScope(['org.eclipse.elk.core.^labels.ILabelManager', 'a.b.Outer.Inner']);
    expect(scope.get('ILabelManager')).toBe('org.eclipse.elk.core.labels.ILabelManager');
    expect(classPath(['Inner'], scope)).toBe('Outer.Inner');
    expect(classPath(['Outer', 'Inner'], scope)).toBe('Outer.Inner');
    expect(classPath(['Local'], scope)).toBe('Local');
    expect(classPath([], scope)).toBe('');
    expect(classPath(['x'], new Map([['x', 'lower.case']]))).toBe('lower.case');
  });
});

describe('cross references', () => {
  const members = `
    group a { option strategy: int { }
      group b { option x: int { requires strategy == 1 requires org.other.far }
                option y: boolean { requires a.strategy } }
      option z: double { requires b.x == 2 } }
    option far: int { }
  `;

  it('resolves names relative to the enclosing groups, innermost first, then to the package', () => {
    const bundle = resolveSnippet(members.replace('requires org.other.far', 'requires far'));
    const calls = bundle.calls.filter((call) => call.call === 'addDependency');
    expect(calls).toEqual([
      { call: 'addDependency', source: 'org.example.a.z', target: 'org.example.a.b.x', value: { t: 'int', v: 2 } },
      {
        call: 'addDependency',
        source: 'org.example.a.b.x',
        target: 'org.example.a.strategy',
        value: { t: 'int', v: 1 },
      },
      { call: 'addDependency', source: 'org.example.a.b.x', target: 'org.example.far', value: null },
      { call: 'addDependency', source: 'org.example.a.b.y', target: 'org.example.a.strategy', value: null },
    ]);
  });

  it('numbers dependency constants by position and names them after the target', () => {
    const bundle = resolveSnippet(members.replace('requires org.other.far', 'requires far'));
    const names = bundle.options.flatMap((o) => o.dependencies.map((d) => d.constantName));
    expect(names).toEqual(['A_Z_DEP_A_B_X_0', 'A_B_X_DEP_A_STRATEGY_0', 'A_B_X_DEP_FAR_1', 'A_B_Y_DEP_A_STRATEGY_0']);
  });

  it('reports an unresolvable target with the names it tried', () => {
    expect(() => resolveSnippet(members)).toThrow(
      /cannot resolve option 'org.other.far' .*org.example.a.b.org.other.far/,
    );
  });

  it('resolves across files and rejects duplicate definitions', () => {
    const index = buildOptionIndex(MELK_NAMES.map(parseVendored));
    const layered = parseVendored('Layered');
    expect(
      resolveOptionReference(
        index,
        { file: layered, groups: ['crossingMinimization'] },
        'org.eclipse.elk.hierarchyHandling',
      ).id,
    ).toBe('org.eclipse.elk.hierarchyHandling');
    const twice = parseMelk('package p\nbundle { }\noption a: int { }\noption a: int { }', 'Dup.melk');
    expect(() => buildOptionIndex([twice])).toThrow(/defined twice/);
  });
});

describe('comparison helpers', () => {
  it('describes the first difference with its field path', () => {
    const left = { calls: [{ data: { id: 'a', default: { t: 'int', v: 1 } } }] };
    const right = { calls: [{ data: { id: 'a', default: { t: 'int', v: 2 } } }] };
    expect(firstDifference(left, right, 'x')).toBe('x.calls[0].data.default.v: model 1 != dump 2');
    expect(firstDifference(left, left, 'x')).toBeNull();
    expect(firstDifference([1], [1, 2], 'l')).toBe('l[1]: model undefined != dump 2');
    expect(firstDifference(1, 'a', 'p')).toBe('p: model 1 != dump "a"');
  });

  it('reports a missing provider and a missing bundle', () => {
    expect(() => dumpCalls('no.such.Class')).toThrow(/no provider/);
    expect(() => vendoredBundle('Nope')).toThrow(/no resolved bundle/);
  });
});
