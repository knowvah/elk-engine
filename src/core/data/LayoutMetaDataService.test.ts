// SPDX-License-Identifier: EPL-2.0
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ElkReflect } from '../../graph/util/ElkReflect.js';
import { JavaClass } from '../../java/lang/JavaClass.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import type { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import { ElkMargin } from '../math/ElkMargin.js';
import { ElkPadding } from '../math/ElkPadding.js';
import { KVector } from '../math/KVector.js';
import { KVectorChain } from '../math/KVectorChain.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { IndividualSpacings } from '../util/IndividualSpacings.js';
import type { IFactory } from '../util/IFactory.js';
import type { ILayoutMetaDataProvider } from './ILayoutMetaDataProvider.js';
import { LayoutAlgorithmData } from './LayoutAlgorithmData.js';
import { LayoutCategoryData } from './LayoutCategoryData.js';
import { LayoutMetaDataService } from './LayoutMetaDataService.js';
import { LayoutOptionData } from './LayoutOptionData.js';
import { LayoutOptionDataTarget } from './LayoutOptionDataTarget.js';

const CORE_OPTION_COUNT = 94;

function option(
  id: string,
  legacyIds: string[] = [],
  targets: LayoutOptionDataTarget[] = [LayoutOptionData.Target.NODES],
): LayoutOptionData {
  const targetSet = EnumSet.noneOf(LayoutOptionDataTarget);
  targets.forEach((target) => targetSet.add(target));
  const builder = new LayoutOptionData.Builder()
    .id(id)
    .type(LayoutOptionData.Type.BOOLEAN)
    .optionClass(JavaClass.Boolean)
    .targets(targetSet);
  return (legacyIds.length > 0 ? builder.legacyIds(...legacyIds) : builder).create();
}

function algorithm(
  id: string,
  category: string | null,
  factory?: IFactory<AbstractLayoutProvider>,
): LayoutAlgorithmData {
  const stub: IFactory<AbstractLayoutProvider> = factory ?? {
    create: () => ({}) as AbstractLayoutProvider,
    destroy: () => undefined,
  };
  const builder = new LayoutAlgorithmData.Builder().id(id).name(id).providerFactory(stub);
  return (category === null ? builder : builder.category(category)).create();
}

/** A provider that registers fixed data and records which registry calls it makes. */
class StubProvider implements ILayoutMetaDataProvider {
  constructor(private readonly register: (registry: ILayoutMetaDataProvider.Registry) => void) {}

  apply(registry: ILayoutMetaDataProvider.Registry): void {
    this.register(registry);
  }
}

beforeEach(() => {
  LayoutMetaDataService.unload();
});

afterEach(() => {
  LayoutMetaDataService.unload();
});

describe('LayoutMetaDataService singleton', () => {
  it('creates one instance with CoreOptions registered, until unloaded', () => {
    const service = LayoutMetaDataService.getInstance();
    expect(LayoutMetaDataService.getInstance({ ignored: true })).toBe(service);
    expect(service.getOptionData()).toHaveLength(CORE_OPTION_COUNT);
    expect(service.getOptionData('org.eclipse.elk.algorithm')?.getId()).toBe(CoreOptions.ALGORITHM.getId());
    LayoutMetaDataService.unload();
    expect(LayoutMetaDataService.getInstance()).not.toBe(service);
  });

  it('unload clears the instance pools of the registered algorithms', () => {
    let destroyed = 0;
    const factory: IFactory<AbstractLayoutProvider> = {
      create: () => ({}) as AbstractLayoutProvider,
      destroy: () => {
        destroyed++;
      },
    };
    const service = LayoutMetaDataService.getInstance();
    const data = algorithm('t.alg', null, factory);
    service.registerLayoutMetaDataProviders(new StubProvider((registry) => registry.register(data)));
    data.getInstancePool().release(data.getInstancePool().fetch());
    LayoutMetaDataService.unload();
    expect(destroyed).toBe(1);
    LayoutMetaDataService.unload();
  });

  it('registers the data classes with ElkReflect', () => {
    LayoutMetaDataService.initElkReflect();
    expect(ElkReflect.newInstance(KVector)).toBeInstanceOf(KVector);
    expect(ElkReflect.newInstance(KVectorChain)).toBeInstanceOf(KVectorChain);
    expect(ElkReflect.newInstance(ElkMargin)).toBeInstanceOf(ElkMargin);
    expect(ElkReflect.newInstance(ElkPadding)).toBeInstanceOf(ElkPadding);
    expect(ElkReflect.newInstance(IndividualSpacings)).toBeInstanceOf(IndividualSpacings);
    expect(ElkReflect.newInstance(LinkedList)).toBeInstanceOf(LinkedList);
    expect(ElkReflect.newInstance(Array)).toEqual([]);
    expect(ElkReflect.newInstance(Set)).toEqual(new Set());

    const vector = new KVector(1, 2);
    expect(ElkReflect.clone(vector)).toEqual(vector);
    expect(ElkReflect.clone(vector)).not.toBe(vector);
    const chain = new KVectorChain(vector);
    expect([...(ElkReflect.clone(chain) as KVectorChain)]).toHaveLength(1);
    expect((ElkReflect.clone(new ElkMargin(1)) as ElkMargin).top).toBe(1);
    expect((ElkReflect.clone(new ElkPadding(2)) as ElkPadding).left).toBe(2);
    expect(ElkReflect.clone(new IndividualSpacings())).toBeInstanceOf(IndividualSpacings);
    expect(ElkReflect.clone([1, 2])).toEqual([1, 2]);
    expect(ElkReflect.clone(new Set([1]))).toEqual(new Set([1]));
    expect([...(ElkReflect.clone(new LinkedList([3])) as LinkedList<number>)]).toEqual([3]);
  });
});

describe('LayoutMetaDataService lookups', () => {
  it('finds options by suffix, caches them, and refuses ambiguous suffixes', () => {
    const service = LayoutMetaDataService.getInstance();
    expect(service.getOptionDataBySuffix('spacing.nodeNode')?.getId()).toBe('org.eclipse.elk.spacing.nodeNode');
    expect(service.getOptionDataBySuffix('spacing.nodeNode')).toBe(service.getOptionDataBySuffix('spacing.nodeNode'));
    expect(service.getOptionDataBySuffix('org.eclipse.elk.spacing.nodeNode')?.getId()).toBe(
      'org.eclipse.elk.spacing.nodeNode',
    );
    expect(service.getOptionDataBySuffix('nodeLabels.padding')?.getId()).toBe('org.eclipse.elk.nodeLabels.padding');
    // "padding" ends the ids of org.eclipse.elk.padding and of several nested ones
    expect(service.getOptionDataBySuffix('padding')).toBeNull();
    // a suffix must start at a dot boundary
    expect(service.getOptionDataBySuffix('Node')).toBeNull();
    expect(service.getOptionDataBySuffix('')).toBeNull();
    expect(service.getOptionDataBySuffix(null)).toBeNull();
  });

  it('resolves legacy ids and legacy id suffixes, and detects ambiguous legacy suffixes', () => {
    const service = LayoutMetaDataService.getInstance();
    service.registerLayoutMetaDataProviders(
      new StubProvider((registry) => {
        registry.register(option('t.one', ['old.alpha', 'older.alpha']));
        registry.register(option('t.two', ['old.beta']));
        registry.register(option('t.three', ['other.gamma']));
      }),
    );
    expect(service.getOptionData('old.beta')?.getId()).toBe('t.two');
    expect(service.getOptionData('missing')).toBeNull();
    expect(service.getOptionDataBySuffix('beta')?.getId()).toBe('t.two');
    expect(service.getOptionDataBySuffix('gamma')?.getId()).toBe('t.three');
    // two legacy ids of the same option both end in "alpha": not unique, as in Java
    expect(service.getOptionDataBySuffix('alpha')).toBeNull();
  });

  it('clears the option suffix cache when providers are registered', () => {
    const service = LayoutMetaDataService.getInstance();
    expect(service.getOptionDataBySuffix('fresh')).toBeNull();
    service.registerLayoutMetaDataProviders(new StubProvider((registry) => registry.register(option('t.fresh'))));
    expect(service.getOptionDataBySuffix('fresh')?.getId()).toBe('t.fresh');
    service.registerLayoutMetaDataProviders(new StubProvider((registry) => registry.register(option('u.fresh'))));
    expect(service.getOptionDataBySuffix('fresh')).toBeNull();
  });

  it('finds algorithms by id and suffix, with defaults', () => {
    const service = LayoutMetaDataService.getInstance();
    service.registerLayoutMetaDataProviders(
      new StubProvider((registry) => {
        registry.register(algorithm('x.layered', null));
        registry.register(algorithm('x.radial', null));
        registry.register(algorithm('y.radial', null));
      }),
    );
    expect(service.getAlgorithmData('x.layered')?.getId()).toBe('x.layered');
    expect(service.getAlgorithmData('nope')).toBeNull();
    expect(service.getAlgorithmData().map((a) => a.getId())).toEqual(['x.layered', 'x.radial', 'y.radial']);
    expect(service.getAlgorithmDataBySuffix('layered')).toBe(service.getAlgorithmDataBySuffix('layered'));
    expect(service.getAlgorithmDataBySuffix('radial')).toBeNull();
    expect(service.getAlgorithmDataBySuffix('ayered')).toBeNull();
    expect(service.getAlgorithmDataBySuffix('')).toBeNull();
    expect(service.getAlgorithmDataBySuffix(null)).toBeNull();
    expect(service.getAlgorithmDataBySuffixOrDefault('layered', 'x.radial')?.getId()).toBe('x.layered');
    expect(service.getAlgorithmDataBySuffixOrDefault('  ', 'x.radial')?.getId()).toBe('x.radial');
    expect(service.getAlgorithmDataBySuffixOrDefault('unknown', 'layered')?.getId()).toBe('x.layered');
    expect(service.getAlgorithmDataBySuffixOrDefault(null, null)).toBeNull();
    expect(service.getAlgorithmDataBySuffixOrDefault('unknown', 'unknown')).toBeNull();
    expect(service.getAlgorithmDataBySuffixOrDefault('unknown', '')).toBeNull();
  });

  it('lists the options an algorithm knows, plus the algorithm option, for a target', () => {
    const service = LayoutMetaDataService.getInstance();
    const known = option('t.known', [], [LayoutOptionData.Target.NODES, LayoutOptionData.Target.EDGES]);
    const wrongTarget = option('t.wrong', [], [LayoutOptionData.Target.LABELS]);
    const unknown = option('t.unknown');
    service.registerLayoutMetaDataProviders(
      new StubProvider((registry) => {
        registry.register(known);
        registry.register(wrongTarget);
        registry.register(unknown);
        registry.register(algorithm('t.alg', null));
        registry.addOptionSupport('t.alg', 't.known', true);
        registry.addOptionSupport('t.alg', 't.wrong', true);
      }),
    );
    const alg = service.getAlgorithmData('t.alg') as LayoutAlgorithmData;
    const ids = (target: LayoutOptionDataTarget): string[] => service.getOptionData(alg, target).map((o) => o.getId());
    expect(ids(LayoutOptionData.Target.NODES)).toEqual(['t.known']);
    expect(ids(LayoutOptionData.Target.LABELS)).toEqual(['t.wrong']);
    expect(ids(LayoutOptionData.Target.PARENTS)).toEqual(['org.eclipse.elk.algorithm']);
  });
});

describe('LayoutMetaDataService registration', () => {
  it('stores categories and puts algorithms into their category or the backup category', () => {
    const service = LayoutMetaDataService.getInstance();
    const inCategory = algorithm('t.a', 't.cat');
    const noCategory = algorithm('t.b', null);
    const unknownCategory = algorithm('t.c', 't.missing');
    service.registerLayoutMetaDataProviders(
      new StubProvider((registry) => {
        registry.register(new LayoutCategoryData.Builder().id('t.cat').name('Cat').create());
        registry.register(inCategory);
        registry.register(noCategory);
        registry.register(unknownCategory);
      }),
    );
    expect(service.getCategoryData('t.cat')?.getLayouters()).toEqual([inCategory]);
    const backup = service.getCategoryData('');
    expect(backup?.getName()).toBe('Other');
    expect(backup?.getLayouters()).toEqual([noCategory]);
    expect(service.getCategoryData('t.missing')).toBeNull();
    expect(
      service
        .getCategoryData()
        .map((c) => c.getId())
        .slice(-2),
    ).toEqual(['t.cat', '']);
    // registering again neither duplicates the layouters nor creates a second backup category
    service.registerLayoutMetaDataProviders(new StubProvider(() => undefined));
    expect(service.getCategoryData('')?.getLayouters()).toHaveLength(1);
    expect(service.getCategoryData('t.cat')?.getLayouters()).toHaveLength(1);
  });

  it('applies dependencies and option support, ignoring unknown ids', () => {
    const service = LayoutMetaDataService.getInstance();
    service.registerLayoutMetaDataProviders(
      new StubProvider((registry) => {
        registry.register(option('t.source', ['legacy.source']));
        registry.register(option('t.target'));
        registry.register(algorithm('t.alg', null));
        registry.addDependency('legacy.source', 't.target', true);
        registry.addDependency('t.source', 't.nowhere', true);
        registry.addDependency('t.nowhere', 't.target', true);
        registry.addOptionSupport('t.alg', 't.target', 42);
        registry.addOptionSupport('t.nobody', 't.target', 1);
        registry.addOptionSupport('t.alg', 't.nowhere', 1);
      }),
    );
    const dependencies = service.getOptionData('t.source')?.getDependencies() ?? [];
    expect(dependencies.map((d) => [d.getFirst()?.getId(), d.getSecond()])).toEqual([['t.target', true]]);
    const alg = service.getAlgorithmData('t.alg') as LayoutAlgorithmData;
    expect([...alg.getKnownOptionIds()]).toEqual(['t.target']);
    expect(alg.getDefaultValue('t.target')).toBe(42);
  });

  it('ignores registered data of an unknown class', () => {
    const service = LayoutMetaDataService.getInstance();
    service.registerLayoutMetaDataProviders(
      new StubProvider((registry) =>
        registry.register({ getId: () => 'x', getName: () => null, getDescription: () => null }),
      ),
    );
    expect(service.getOptionData()).toHaveLength(CORE_OPTION_COUNT);
  });
});
