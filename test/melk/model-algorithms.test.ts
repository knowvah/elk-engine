// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { MdAlgorithm } from '../../tools/melk/ast.js';
import { PENDING_TYPES, loadUpstreamPaths, parseUpstreamPaths } from '../../tools/melk/config.js';
import { ModelError } from '../../tools/melk/model-errors.js';
import { definingBundleId } from '../../tools/melk/model-algorithms.js';
import { algorithmClassName } from '../../tools/melk/model-names.js';
import { resolveAll, type RegistryCall, type ResolvedBundle } from '../../tools/melk/model.js';
import { parseMelk } from '../../tools/melk/parser.js';
import { diffCalls, dumpCalls, MELK_NAMES, parseVendored } from './helpers.js';

const ALL_CALLS: readonly RegistryCall['call'][] = [
  'registerOption',
  'registerCategory',
  'addDependency',
  'registerAlgorithm',
  'addOptionSupport',
];
const CORE_BUNDLE = 'org.eclipse.elk.core.options.CoreOptions';
const HELD_BACK_ALGORITHMS = ['org.eclipse.elk.fixed', 'org.eclipse.elk.box', 'org.eclipse.elk.random'];
const HELD_BACK_DEPENDENCY_SOURCE = 'org.eclipse.elk.topdown.sizeCategories';

function resolveVendoredWith(pendingTypes: readonly string[]): ResolvedBundle[] {
  return resolveAll(MELK_NAMES.map(parseVendored), { pendingTypes });
}

function bundleOf(bundles: readonly ResolvedBundle[], name: string): ResolvedBundle {
  const bundle = bundles.find((candidate) => candidate.file === `${name}.melk`);
  if (bundle === undefined) {
    throw new Error(`no bundle ${name}`);
  }
  return bundle;
}

/** A synthetic file with one bundle and the given members; pending types as given. */
function resolveSnippet(members: string, pendingTypes: readonly string[] = [], imports = ''): ResolvedBundle {
  const text = `package org.example\n${imports}\nbundle {\n label "Ex"\n metadataClass options.ExampleOptions\n idPrefix org.example\n}\n${members}`;
  const [bundle] = resolveAll([parseMelk(text, 'Example.melk')], { pendingTypes, upstreamPaths: new Map() });
  if (bundle === undefined) {
    throw new Error('snippet did not resolve');
  }
  return bundle;
}

describe('algorithm model against the JVM dump (no pending types)', () => {
  const bundles = resolveVendoredWith([]);

  it.each(MELK_NAMES)('%s: the bundle calls, algorithms included, equal the dump', (name) => {
    const bundle = bundleOf(bundles, name);
    const expected = dumpCalls(bundle.bundleClass, ALL_CALLS);
    expect(bundle.heldBack).toEqual([]);
    expect(bundle.calls).toHaveLength(expected.length);
    expect(diffCalls(bundle.calls, expected)).toBeNull();
  });

  it('matches every algorithm class entry of the dump, with its id and factory', () => {
    const algorithms = bundles.flatMap((bundle) => bundle.algorithms);
    expect(algorithms.map((a) => a.id).sort()).toEqual(
      [
        ...HELD_BACK_ALGORITHMS,
        ...algorithms.map((a) => a.id).filter((id) => !HELD_BACK_ALGORITHMS.includes(id)),
      ].sort(),
    );
    expect(algorithms.length).toBeGreaterThanOrEqual(14);
    for (const algorithm of algorithms) {
      const expected = dumpCalls(algorithm.className, ['registerAlgorithm', 'addOptionSupport']);
      expect(diffCalls(algorithm.calls, expected)).toBeNull();
      expect(algorithm.data.factoryClass).toBe(`${algorithm.className}$${algorithm.factoryName}`);
    }
  });

  it('keys the algorithm classes the way the dump does', () => {
    for (const name of MELK_NAMES) {
      const file = parseVendored(name);
      const classNames = file.members
        .filter((m): m is MdAlgorithm => m.kind === 'algorithm')
        .map((m) => algorithmClassName(file, m));
      expect(bundleOf(bundles, name).algorithms.map((a) => a.className)).toEqual(classNames);
    }
  });

  it('yields 1.600000023841858 for supports aspectRatio = 1.6f and the defining bundle of Layered', () => {
    const layered = bundleOf(bundles, 'Layered').algorithms[0];
    expect(layered?.data.definingBundleId).toBe('org.eclipse.elk.alg.layered');
    expect(layered?.data.category).toBe('org.eclipse.elk.layered');
    expect(layered?.data.supportedFeatures).toEqual([
      'SELF_LOOPS',
      'INSIDE_SELF_LOOPS',
      'MULTI_EDGES',
      'EDGE_LABELS',
      'PORTS',
      'COMPOUND',
      'CLUSTERS',
    ]);
    const aspect = layered?.supports.find((s) => s.option.data.id === 'org.eclipse.elk.aspectRatio');
    expect(aspect?.value).toEqual({ t: 'double', v: '1.600000023841858' });
    expect(aspect?.constantName).toBe('ASPECT_RATIO');
    expect(aspect?.defaultConstantName).toBe('ASPECT_RATIO_DEFAULT');
    expect(aspect?.bundleClass).toBe('org.eclipse.elk.core.options.CoreOptions');
  });

  it('uses the option default (no default constant) when a support gives no value', () => {
    const support = bundleOf(bundles, 'Layered').algorithms[0]?.supports[0];
    expect(support?.expression).toBeNull();
    expect(support?.defaultConstantName).toBeNull();
    expect(support?.value).toEqual(support?.option.data.default);
  });
});

/** The four types held back in mission 3; the C1 mechanism tests keep exercising them (M9: T8 un-held Fixed, T10 Random, T12 Box). */
const MISSION3_PENDING_TYPES: readonly string[] = [
  'org.eclipse.elk.core.util.FixedLayoutProvider',
  'org.eclipse.elk.core.util.BoxLayoutProvider',
  'org.eclipse.elk.core.util.RandomLayoutProvider',
  'org.eclipse.elk.core.options.TopdownSizeApproximator',
];

describe('pending types (C1)', () => {
  const bundles = resolveVendoredWith(MISSION3_PENDING_TYPES);

  it('lists no pending type (Fixed left the list in T8, Random in T10, Box in T12, TopdownSizeApproximator in T14)', () => {
    expect(PENDING_TYPES).toEqual([]);
  });

  it('holds back exactly the three Core algorithms and the topdown.sizeCategories dependency', () => {
    const core = bundleOf(bundles, 'Core');
    const heldIds = core.heldBack.flatMap(({ call }) => {
      if (call.call === 'registerAlgorithm') {
        return [call.data.id];
      }
      return [];
    });
    expect(heldIds).toEqual(HELD_BACK_ALGORITHMS);
    const supports = core.heldBack.filter(({ call }) => call.call === 'addOptionSupport');
    expect(supports.length).toBe(dumpCalls(CORE_BUNDLE, ['addOptionSupport']).length);
    const dependencies = core.heldBack.filter(({ call }) => call.call === 'addDependency');
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0]?.call).toMatchObject({ source: HELD_BACK_DEPENDENCY_SOURCE });
    expect(dependencies[0]?.reason).toBe(
      'expression references pending type org.eclipse.elk.core.options.TopdownSizeApproximator',
    );
    expect(core.heldBack.find(({ call }) => call.call === 'registerAlgorithm')?.reason).toBe(
      'the layout provider is pending type org.eclipse.elk.core.util.FixedLayoutProvider',
    );
    expect(core.heldBack).toHaveLength(3 + supports.length + 1);
    expect(core.algorithms.map((a) => a.heldBackReason !== null)).toEqual([true, true, true]);
  });

  it('leaves the rest of CoreOptions equal to the dump, nested PackingMode included', () => {
    const core = bundleOf(bundles, 'Core');
    const expected = dumpCalls(CORE_BUNDLE, ALL_CALLS).filter((call) => {
      switch (call.call) {
        case 'registerAlgorithm':
        case 'addOptionSupport':
          return false;
        case 'addDependency':
          return call.source !== HELD_BACK_DEPENDENCY_SOURCE;
        default:
          return true;
      }
    });
    expect(diffCalls(core.calls, expected)).toBeNull();
    expect(core.calls.some((c) => c.call === 'registerOption' && c.data.id === 'org.eclipse.elk.box.packingMode')).toBe(
      true,
    );
  });

  it.each(MELK_NAMES.filter((name) => name !== 'Core'))('%s: nothing is held back', (name) => {
    expect(bundleOf(bundles, name).heldBack).toEqual([]);
  });
});

describe('algorithm fields', () => {
  it('shrinks names and descriptions, and resolves category, features, validator, image and parameter', () => {
    const bundle = resolveSnippet(
      `
      category cat { label "A   Cat" }
      algorithm alg(Provider#param) {
        label "My   Alg"
        description "d
          e"
        category cat
        features disconnected, ports
        validator Checker
        preview images/a.png
      }
      algorithm plain(Provider2) { }
    `,
    );
    const [alg, plain] = bundle.algorithms;
    expect(alg?.data).toEqual({
      id: 'org.example.alg',
      name: 'My Alg',
      description: 'd e',
      category: 'org.example.cat',
      bundleName: 'Ex',
      definingBundleId: null,
      previewImagePath: 'images/a.png',
      supportedFeatures: ['PORTS', 'DISCONNECTED'],
      validatorClass: 'Checker',
      factoryClass: 'org.example.AlgMetadata$Alg' + 'Factory',
    });
    expect(alg?.parameter).toBe('param');
    expect(alg?.providerType).toBe('org.example.Provider');
    expect(plain?.className).toBe('org.example.Plain' + 'Metadata');
    expect(plain?.data).toMatchObject({ name: 'plain', description: null, category: null, validatorClass: null });
  });

  it('places the algorithm calls after the categories, in source order', () => {
    const bundle = resolveSnippet(`algorithm a(P) { } category c { } algorithm b(P) { }`);
    expect(bundle.calls.map((c) => c.call)).toEqual(['registerCategory', 'registerAlgorithm', 'registerAlgorithm']);
  });

  it('rejects an unknown category and an unknown supported option', () => {
    expect(() => resolveSnippet('algorithm a(P) { category nowhere }')).toThrow(/cannot resolve category 'nowhere'/);
    expect(() => resolveSnippet('algorithm a(P) { supports nowhere }')).toThrow(ModelError);
  });

  it('gives a support constant of the option, with a default constant only for a given value', () => {
    const bundle = resolveSnippet(`
      option x: int { default = 5 }
      option y: double { }
      algorithm a(P) { supports x supports y = 2 }
    `);
    const [x, y] = bundle.algorithms[0]?.supports ?? [];
    expect([x?.constantName, x?.defaultConstantName, x?.value]).toEqual(['X', null, { t: 'int', v: 5 }]);
    expect([y?.constantName, y?.defaultConstantName, y?.value]).toEqual(['Y', 'Y_DEFAULT', { t: 'double', v: '2.0' }]);
    expect(bundle.algorithms[0]?.calls.slice(1)).toEqual([
      { call: 'addOptionSupport', algorithm: 'org.example.a', option: 'org.example.x', default: { t: 'int', v: 5 } },
      {
        call: 'addOptionSupport',
        algorithm: 'org.example.a',
        option: 'org.example.y',
        default: { t: 'double', v: '2.0' },
      },
    ]);
  });
});

describe('pending detection', () => {
  const PENDING = [
    'org.example.options.Direction',
    'org.example.options.KVector',
    'org.example.options.SizeConstraint',
    'org.other.Checker',
    'org.example.options.Gone',
    'org.example.Gone',
    'org.example.Direction',
  ];

  it('holds back an algorithm whose provider, validator or support value references a pending type', () => {
    const bundle = resolveSnippet(
      `
      option e: Object { }
      algorithm byProvider(Gone) { supports e }
      algorithm byValidator(Fine) { validator Checker }
      algorithm bySupport(Fine) { supports e = Direction.UP }
      algorithm clean(Fine) { supports e }
    `,
      PENDING,
      'import org.other.Checker',
    );
    expect(bundle.algorithms.map((a) => a.heldBackReason)).toEqual([
      'the layout provider is pending type org.example.Gone',
      'the validator is pending type org.other.Checker',
      'expression references pending type org.example.Direction',
      null,
    ]);
    expect(bundle.heldBack).toHaveLength(2 + 1 + 2);
    expect(bundle.calls.filter((c) => c.call === 'registerAlgorithm')).toHaveLength(1);
  });

  it('finds pending types in constants, constructors, class literals, lists and unary operands', () => {
    const bundle = resolveSnippet(
      `
      option plain: Object { default = -1 upperBound = #[-1, 2] }
      option a: Direction { default = Direction.UP }
      option b: KVector { default = new KVector(1, 2) }
      option c: Object { default = #[Direction.UP, 2] }
      option d: EnumSet<SizeConstraint> { default = EnumSet.noneOf(SizeConstraint) }
      option f: Object { requires a == Direction.DOWN requires plain == null requires a == 1 }
    `,
      PENDING,
    );
    const held = bundle.heldBack.map((h) => (h.call.call === 'registerOption' ? h.call.data.id : h.call.call));
    expect(held).toEqual(['org.example.a', 'org.example.b', 'org.example.c', 'org.example.d', 'addDependency']);
    expect(bundle.calls.some((c) => c.call === 'registerOption' && c.data.id === 'org.example.plain')).toBe(true);
  });

  it('does not hold back a nested type whose outer class is pending', () => {
    const bundle = resolveSnippet(
      'option m: PackingMode { default = Outer.PackingMode.SIMPLE } option n: PackingMode { default = PackingMode.SIMPLE }',
      ['org.example.Outer'],
      'import org.example.Outer\nimport org.example.Outer.PackingMode',
    );
    expect(bundle.heldBack).toEqual([]);
  });
});

describe('manifest and defining bundle', () => {
  it('takes the directory before src', () => {
    expect(definingBundleId('plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/Layered.melk')).toBe(
      'plugins/org.eclipse.elk.alg.layered'.split('/')[1],
    );
    expect(definingBundleId('src/Only.melk')).toBeNull();
    expect(definingBundleId('a/b/C.melk')).toBeNull();
    expect(definingBundleId(undefined)).toBeNull();
  });

  it('loads the upstream path of all 13 vendored files', () => {
    const paths = loadUpstreamPaths();
    expect(paths.size).toBe(13);
    expect(paths.get('Core.melk')).toBe('plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/Core.melk');
    expect(definingBundleId(paths.get('Core.melk'))).toBe('org.eclipse.elk.core');
  });

  it('validates the manifest shape', () => {
    expect(() => parseUpstreamPaths(null)).toThrow(/no 'files' array/);
    expect(() => parseUpstreamPaths({ files: [{ name: 'A.melk' }] })).toThrow(/string 'name'/);
    expect(() => parseUpstreamPaths({ files: [1] })).toThrow(/string 'name'/);
    expect(parseUpstreamPaths({ files: [{ name: 'A.melk', upstreamPath: 'x/src/A.melk' }] }).get('A.melk')).toBe(
      'x/src/A.melk',
    );
  });
});
