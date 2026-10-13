// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.elk.core.test LayoutDataContentAssistTest (`Enclosed`: `LayoutOptionsPrefixes` and `Other`).
 *
 * NOT PORTED (decision C10, deferred to mission 5 unchanged): `Other.testAlgorithmSpecificKnown` and
 * `Other.testAlgorithmSpecificUnknown`. They set the algorithm to `BoxLayouterOptions.ALGORITHM_ID` and
 * `FixedLayouterOptions.ALGORITHM_ID`, whose algorithms are held back by C1.
 *
 * The tests below the ported ones cover the Java branches the JUnit test does not reach.
 *
 * @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/data/LayoutDataContentAssistTest.java
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { ElkGraphFactory } from '../../graph/ElkGraphFactory.js';
import '../../graph/impl/ElkGraphFactoryImpl.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { markAdvanced } from '../../graph/properties/AdvancedPropertyValue.js';
import { markExperimental } from '../../graph/properties/ExperimentalPropertyValue.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { ElkReflect } from '../../graph/util/ElkReflect.js';
import { JavaClass, javaInterface, type JavaClassRef } from '../../java/lang/JavaClass.js';
import { KVector } from '../math/KVector.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { Direction } from '../options/Direction.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import type { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { IFactory } from '../util/IFactory.js';
import type { ILayoutMetaDataProvider } from './ILayoutMetaDataProvider.js';
import { LayoutAlgorithmData } from './LayoutAlgorithmData.js';
import { LayoutDataContentAssist, Proposal } from './LayoutDataContentAssist.js';
import { LayoutMetaDataService } from './LayoutMetaDataService.js';
import { LayoutOptionData } from './LayoutOptionData.js';
import { LayoutOptionDataTarget } from './LayoutOptionDataTarget.js';

const { Type, Visibility } = LayoutOptionData;

const LAYERED_ID = 'test.alg.layered';
const TREE_ID = 'test.alg.tree';
const HIDDEN_OPTION_ID = 'test.hidden';
const NULL_GROUP_OPTION_ID = 'test.nullGroup';

/** Java `Class.getSimpleName()` of the parameterised test's first column. */
type ElementKind = 'ElkNode' | 'ElkEdge' | 'ElkPort' | 'ElkLabel';

/** Stands in for `ElkGraphFactory.eINSTANCE.create(EClass)`, which is not ported (D4). */
function createElement(kind: ElementKind): ElkGraphElement {
  const factory = ElkGraphFactory.eINSTANCE;
  switch (kind) {
    case 'ElkNode':
      return factory.createElkNode();
    case 'ElkEdge':
      return factory.createElkEdge();
    case 'ElkPort':
      return factory.createElkPort();
    case 'ElkLabel':
      return factory.createElkLabel();
  }
}

class Unregistered {}

const STUB_FACTORY: IFactory<AbstractLayoutProvider> = {
  create: () => ({}) as AbstractLayoutProvider,
  destroy: () => undefined,
};

function algorithm(id: string, name: string): LayoutAlgorithmData {
  return new LayoutAlgorithmData.Builder().id(id).name(name).providerFactory(STUB_FACTORY).create();
}

function option(type: ReturnType<LayoutOptionData['getType']>, optionClass: JavaClassRef | null): LayoutOptionData {
  return new LayoutOptionData.Builder()
    .id('test.value')
    .type(type as NonNullable<typeof type>)
    .optionClass(optionClass)
    .create();
}

function register(...data: Array<LayoutAlgorithmData | LayoutOptionData>): void {
  const provider: ILayoutMetaDataProvider = { apply: (registry) => data.forEach((d) => registry.register(d)) };
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(provider);
}

function coreOption(property: IProperty<unknown>): LayoutOptionData {
  return LayoutMetaDataService.getInstance().getOptionData(property.getId()) as LayoutOptionData;
}

function containsOption(proposals: Array<Proposal<LayoutOptionData>>, property: IProperty<unknown>): boolean {
  return proposals.some((p) => (p.data as LayoutOptionData).equals(property));
}

beforeAll(() => {
  ElkReflect.registerNewInstance(KVector, () => new KVector());
  markExperimental(Direction.LEFT);
  markAdvanced(Direction.DOWN);
});

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new CoreOptions());
});

afterEach(() => {
  LayoutMetaDataService.unload();
});

describe('LayoutOptionsPrefixes', () => {
  it.each<[ElementKind, IProperty<unknown>, string]>([
    // Prefixes of the id
    ['ElkNode', CoreOptions.PORT_CONSTRAINTS, 'org.eclipse.elk.portConstraints'],
    ['ElkNode', CoreOptions.PORT_CONSTRAINTS, 'eclipse.elk.portConstraints'],
    ['ElkNode', CoreOptions.PORT_CONSTRAINTS, 'elk.portConstraints'],
    ['ElkNode', CoreOptions.PORT_CONSTRAINTS, 'portConstraints'],
    ['ElkNode', CoreOptions.PORT_CONSTRAINTS, 'portCo'],

    // Some part of the name
    ['ElkNode', CoreOptions.PORT_CONSTRAINTS, 'rt Constr'],

    ['ElkEdge', CoreOptions.PRIORITY, 'prio'],

    ['ElkPort', CoreOptions.PORT_SIDE, 'port.sid'],

    ['ElkLabel', CoreOptions.NODE_LABELS_PLACEMENT, 'nodeLabels.pla'],

    // Anything that is assinged to 'nodes' should be returned for an empty prefix
    ['ElkNode', CoreOptions.PADDING, ''],
    ['ElkNode', CoreOptions.ALIGNMENT, ''],
  ])('testLayoutOption: %s proposes %o for prefix "%s"', (kind, expectedOption, prefix) => {
    const graphElement = createElement(kind);
    const ps = LayoutDataContentAssist.getLayoutOptionProposals(graphElement, prefix);
    expect(containsOption(ps, expectedOption)).toBe(true);
  });
});

describe('Other', () => {
  it('testParentNodes', () => {
    const root = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(root);

    const parentPs = LayoutDataContentAssist.getLayoutOptionProposals(root, CoreOptions.ALGORITHM.getId());
    expect(containsOption(parentPs, CoreOptions.ALGORITHM)).toBe(true);

    const childPs = LayoutDataContentAssist.getLayoutOptionProposals(child, CoreOptions.ALGORITHM.getId());
    expect(containsOption(childPs, CoreOptions.ALGORITHM)).toBe(false);
  });

  it('testOptionGroupIsAdded', () => {
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(root);
    const ps = LayoutDataContentAssist.getLayoutOptionProposals(root, 'nodeN');
    // The option must be included _and_ the proposal must contain the group
    const groupIsAdded = ps.some(
      (p) =>
        (p.data as LayoutOptionData).equals(CoreOptions.SPACING_NODE_NODE) &&
        p.proposal.includes((p.data as LayoutOptionData).getGroup() as string),
    );
    expect(groupIsAdded).toBe(true);
  });
});

describe('getLayoutOptionProposals', () => {
  it('proposes the shortest group-prefixed suffix with the option as data', () => {
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(root);
    const ps = LayoutDataContentAssist.getLayoutOptionProposals(root, 'nodeN');
    const proposal = ps.find((p) => (p.data as LayoutOptionData).equals(CoreOptions.SPACING_NODE_NODE));
    expect(proposal?.proposal).toBe('spacing.nodeNode');
    expect(proposal?.label).toBeNull();
  });

  it('matches a multi-segment prefix against segment starts', () => {
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(root);
    const ps = LayoutDataContentAssist.getLayoutOptionProposals(root, 'spacing.nodeN');
    expect(containsOption(ps, CoreOptions.SPACING_NODE_NODE)).toBe(true);
    expect(containsOption(ps, CoreOptions.PORT_CONSTRAINTS)).toBe(false);
  });

  it('proposes nothing for something that is no graph element or no element at all', () => {
    expect(LayoutDataContentAssist.getLayoutOptionProposals(null, '')).toEqual([]);
    expect(LayoutDataContentAssist.getLayoutOptionProposals({} as ElkGraphElement, '')).toEqual([]);
  });

  it('proposes nodes-only options for a leaf node and parent options only for a parent', () => {
    const root = ElkGraphUtil.createGraph();
    const leaf = ElkGraphUtil.createNode(root);
    const parentOnly = coreOption(CoreOptions.DIRECTION);
    expect(parentOnly.getTargets().contains(LayoutOptionDataTarget.PARENTS)).toBe(true);
    expect(parentOnly.getTargets().contains(LayoutOptionDataTarget.NODES)).toBe(false);
    expect(
      containsOption(LayoutDataContentAssist.getLayoutOptionProposals(root, 'direction'), CoreOptions.DIRECTION),
    ).toBe(true);
    expect(
      containsOption(LayoutDataContentAssist.getLayoutOptionProposals(leaf, 'direction'), CoreOptions.DIRECTION),
    ).toBe(false);
  });

  it('omits options the element already sets', () => {
    const edge = ElkGraphUtil.createEdge(null);
    expect(containsOption(LayoutDataContentAssist.getLayoutOptionProposals(edge, 'prio'), CoreOptions.PRIORITY)).toBe(
      true,
    );
    edge.setProperty(CoreOptions.PRIORITY, 3);
    expect(containsOption(LayoutDataContentAssist.getLayoutOptionProposals(edge, 'prio'), CoreOptions.PRIORITY)).toBe(
      false,
    );
  });

  it('omits hidden options', () => {
    register(
      new LayoutOptionData.Builder()
        .id(HIDDEN_OPTION_ID)
        .type(Type.BOOLEAN)
        .optionClass(JavaClass.Boolean)
        .group('')
        .name('Hidden')
        .targets(coreOption(CoreOptions.PADDING).getTargets())
        .visibility(Visibility.HIDDEN)
        .create(),
    );
    const root = ElkGraphUtil.createGraph();
    const ps = LayoutDataContentAssist.getLayoutOptionProposals(root, 'hidden');
    expect(ps.map((p) => (p.data as LayoutOptionData).getId())).not.toContain(HIDDEN_OPTION_ID);
  });

  it('fails like a Java NullPointerException for an option without a group', () => {
    register(
      new LayoutOptionData.Builder()
        .id(NULL_GROUP_OPTION_ID)
        .type(Type.BOOLEAN)
        .optionClass(JavaClass.Boolean)
        .name('No group')
        .targets(coreOption(CoreOptions.PADDING).getTargets())
        .create(),
    );
    expect(() => LayoutDataContentAssist.getLayoutOptionProposals(ElkGraphUtil.createGraph(), '')).toThrow(TypeError);
  });

  it('restricts to the options the responsible algorithm knows, except the algorithm option', () => {
    const layered = algorithm(LAYERED_ID, 'Test Layered');
    layered.addKnownOption(CoreOptions.PRIORITY, 0);
    register(layered);
    const root = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(root);
    root.setProperty(CoreOptions.ALGORITHM, LAYERED_ID);
    const edge = ElkGraphUtil.createEdge(root);

    const edgePs = LayoutDataContentAssist.getLayoutOptionProposals(edge, '');
    expect(edgePs.map((p) => (p.data as LayoutOptionData).getId())).toEqual([CoreOptions.PRIORITY.getId()]);

    ElkGraphUtil.createNode(child);
    const childPs = LayoutDataContentAssist.getLayoutOptionProposals(child, '');
    expect(containsOption(childPs, CoreOptions.ALGORITHM)).toBe(true);
    expect(containsOption(childPs, CoreOptions.PADDING)).toBe(false);
  });
});

describe('getAlgorithm', () => {
  function registeredGraph(): { root: ElkNode; child: ElkNode } {
    register(algorithm(LAYERED_ID, 'Test Layered'), algorithm(TREE_ID, 'Test Tree'));
    const root = ElkGraphUtil.createGraph();
    root.setProperty(CoreOptions.ALGORITHM, LAYERED_ID);
    const child = ElkGraphUtil.createNode(root);
    return { root, child };
  }

  it('uses the parent of a node, or the node itself if it has none', () => {
    const { root, child } = registeredGraph();
    expect(LayoutDataContentAssist.getAlgorithm(child)?.getId()).toBe(LAYERED_ID);
    expect(LayoutDataContentAssist.getAlgorithm(root)?.getId()).toBe(LAYERED_ID);
  });

  it('uses the containing node of an edge', () => {
    const { root } = registeredGraph();
    expect(LayoutDataContentAssist.getAlgorithm(ElkGraphUtil.createEdge(root))?.getId()).toBe(LAYERED_ID);
  });

  it('uses the grandparent of a port, or its parent if that is a root', () => {
    const { root, child } = registeredGraph();
    child.setProperty(CoreOptions.ALGORITHM, TREE_ID);
    expect(LayoutDataContentAssist.getAlgorithm(ElkGraphUtil.createPort(child))?.getId()).toBe(LAYERED_ID);
    expect(LayoutDataContentAssist.getAlgorithm(ElkGraphUtil.createPort(root))?.getId()).toBe(LAYERED_ID);
  });

  it('has no algorithm for a port without parent', () => {
    registeredGraph();
    expect(LayoutDataContentAssist.getAlgorithm(ElkGraphUtil.createPort(null))).toBeNull();
  });

  it('resolves a label through its label ancestors to the owner', () => {
    const { child } = registeredGraph();
    child.setProperty(CoreOptions.ALGORITHM, TREE_ID);
    const outer = ElkGraphUtil.createLabel(child);
    const inner = ElkGraphUtil.createLabel(outer);
    expect(LayoutDataContentAssist.getAlgorithm(inner)?.getId()).toBe(LAYERED_ID);
    expect(LayoutDataContentAssist.getAlgorithm(ElkGraphUtil.createLabel(null))).toBeNull();
  });

  it('has no algorithm without an algorithm id, with an unknown id, or for no element', () => {
    const root = ElkGraphUtil.createGraph();
    expect(LayoutDataContentAssist.getAlgorithm(root)).toBeNull();
    root.setProperty(CoreOptions.ALGORITHM, 'unknown.algorithm');
    expect(LayoutDataContentAssist.getAlgorithm(root)).toBeNull();
    expect(LayoutDataContentAssist.getAlgorithm(null)).toBeNull();
  });
});

describe('getLayoutAlgorithmProposals', () => {
  beforeEach(() => {
    register(algorithm(LAYERED_ID, 'Test Layered'), algorithm(TREE_ID, 'Test Tree'));
  });

  it('proposes every algorithm for an empty prefix, shortest unique suffix first', () => {
    const ps = LayoutDataContentAssist.getLayoutAlgorithmProposals('');
    expect(ps.map((p) => p.proposal)).toEqual(['layered', 'tree']);
    expect(ps.map((p) => p.data?.getId())).toEqual([LAYERED_ID, TREE_ID]);
  });

  it('matches id suffix prefixes and parts of the name', () => {
    expect(LayoutDataContentAssist.getLayoutAlgorithmProposals('alg.tr').map((p) => p.proposal)).toEqual(['alg.tree']);
    expect(LayoutDataContentAssist.getLayoutAlgorithmProposals('t lay').map((p) => p.proposal)).toEqual(['layered']);
    expect(LayoutDataContentAssist.getLayoutAlgorithmProposals('nothing')).toEqual([]);
  });
});

describe('getLayoutOptionValueProposal', () => {
  const propose = (o: LayoutOptionData): Array<Proposal<unknown>> =>
    LayoutDataContentAssist.getLayoutOptionValueProposal(o, '');
  const pairs = (ps: Array<Proposal<unknown>>): Array<[string, string | null]> => ps.map((p) => [p.proposal, p.label]);

  it('proposes the choices of an enum with experimental and advanced markers', () => {
    expect(pairs(propose(option(Type.ENUM, Direction)))).toEqual([
      ['UNDEFINED', 'UNDEFINED'],
      ['RIGHT', 'RIGHT'],
      ['LEFT', 'LEFT - Experimental'],
      ['DOWN', 'DOWN - Advanced'],
      ['UP', 'UP'],
    ]);
  });

  it('proposes the choices of an enum set without data', () => {
    const ps = propose(option(Type.ENUMSET, SizeConstraint));
    expect(ps).toHaveLength(4);
    expect(ps.every((p) => p.label === p.proposal && p.data === null)).toBe(true);
    expect(ps[0]?.proposal).toBe('PORTS');
  });

  it('proposes false and true for a boolean', () => {
    expect(pairs(propose(option(Type.BOOLEAN, JavaClass.Boolean)))).toEqual([
      ['false', 'false'],
      ['true', 'true'],
    ]);
  });

  it('proposes the default-default of numbers labelled with the type, doubles in Java format', () => {
    expect(pairs(propose(option(Type.INT, JavaClass.Integer)))).toEqual([['0', 'INT']]);
    expect(pairs(propose(option(Type.DOUBLE, JavaClass.Double)))).toEqual([['0.0', 'DOUBLE']]);
  });

  it('proposes a quoted instance of an object option, or an empty proposal if it cannot be created', () => {
    expect(pairs(propose(option(Type.OBJECT, KVector)))).toEqual([['"(0.0,0.0)"', 'OBJECT']]);
    expect(pairs(propose(option(Type.OBJECT, Unregistered)))).toEqual([['', 'OBJECT']]);
    expect(pairs(propose(option(Type.OBJECT, JavaClass.Object)))).toEqual([['', 'OBJECT']]);
    expect(pairs(propose(option(Type.OBJECT, javaInterface('IThing'))))).toEqual([['', 'OBJECT']]);
    expect(() => propose(option(Type.OBJECT, null))).toThrow(TypeError);
  });

  it('proposes nothing for strings and undefined types', () => {
    expect(propose(option(Type.STRING, JavaClass.String))).toEqual([]);
    expect(propose(option(Type.UNDEFINED, null))).toEqual([]);
  });
});

describe('Proposal', () => {
  it('has the three Java factories, also reachable through the outer class', () => {
    expect(LayoutDataContentAssist.Proposal).toBe(Proposal);
    const full = Proposal.of('p', 'l', 7);
    expect([full.proposal, full.label, full.data]).toEqual(['p', 'l', 7]);
    const labelled = Proposal.ofLabel('p', 'l');
    expect([labelled.proposal, labelled.label, labelled.data]).toEqual(['p', 'l', null]);
    const withData = Proposal.ofData('p', 7);
    expect([withData.proposal, withData.label, withData.data]).toEqual(['p', null, 7]);
  });
});
