// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  type Scenario,
  UNSUPPORTED_OPS,
  loadGraphVectors,
  recordedStep,
  replayScenario,
} from '../../../test/helpers/graph-vectors.js';
import type { EList } from '../../emf/common/util/EList.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { isElkConnectableShape } from '../ElkConnectableShape.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import { ElkGraphFactory, isElkGraphFactory } from '../ElkGraphFactory.js';
import { ElkGraphPackage } from '../ElkGraphPackage.js';
import type { ElkNode } from '../ElkNode.js';
import type { ElkPort } from '../ElkPort.js';
import { Property } from '../properties/Property.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkConnectableShapeImpl } from './ElkConnectableShapeImpl.js';
import { ElkEdgeSectionImpl } from './ElkEdgeSectionImpl.js';
import { ElkGraphFactoryImpl } from './ElkGraphFactoryImpl.js';

const vectors = loadGraphVectors();

/** A non-negative feature id beyond every class's feature count: no generated `switch` handles it. */
const FOREIGN_FEATURE = 99;

/** Recorded counts of `graph.json` (D9): frozen with the file. */
const SCENARIO_COUNT = 40;
const STEP_COUNT = 654;

/** Scenarios that use `generateIdentifiers` (`GraphIdentifierGenerator`, T10); replayed by T10's test. */
const DEFERRED_SCENARIOS = ['generate-identifiers', 'generate-identifiers-root-and-subgraph'];

function usesUnsupportedOp(scenario: Scenario): boolean {
  return scenario.steps.some((step) => UNSUPPORTED_OPS.includes(step.op));
}

const replayable = vectors.scenarios.filter((s) => !usesUnsupportedOp(s));
const deferred = vectors.scenarios.filter(usesUnsupportedOp);

describe('graph.json replay (D9)', () => {
  it('holds the recorded scenario and step counts', () => {
    expect(vectors.scenarios).toHaveLength(SCENARIO_COUNT);
    expect(vectors.scenarios.reduce((n, s) => n + s.steps.length, 0)).toBe(STEP_COUNT);
  });

  it('defers exactly the generate-identifiers scenarios to T10', () => {
    expect(deferred.map((s) => s.name)).toEqual(DEFERRED_SCENARIOS);
    for (const scenario of deferred) {
      expect(() => replayScenario(scenario)).toThrow(
        `scenario ${scenario.name}: no handler for op generateIdentifiers`,
      );
    }
  });

  it('replays the other 38 scenarios, every step compared', () => {
    const deferredSteps = deferred.reduce((n, s) => n + s.steps.length, 0);
    const compared = replayable.reduce((n, s) => n + replayScenario(s).length, 0);
    expect(replayable).toHaveLength(SCENARIO_COUNT - DEFERRED_SCENARIOS.length);
    expect(compared).toBe(STEP_COUNT - deferredSteps);
  });

  describe.each(replayable.map((s) => [s.name, s] as const))('%s', (_name, scenario) => {
    it('matches every recorded step', () => {
      const actual = replayScenario(scenario);
      expect(actual).toHaveLength(scenario.steps.length);
      actual.forEach((step, i) => {
        const recorded = scenario.steps[i];
        expect({ step: i, op: recorded?.op, ...step }).toEqual({
          step: i,
          op: recorded?.op,
          ...recordedStep(recorded as (typeof scenario.steps)[number]),
        });
      });
    });
  });
});

describe('T9 acceptance', () => {
  it('an edge to a grandchild is hierarchical, connected, neither a self loop nor a hyperedge', () => {
    const graph = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(graph);
    const n3 = ElkGraphUtil.createNode(graph);
    const n3_1 = ElkGraphUtil.createNode(n3);
    const n3_1_1 = ElkGraphUtil.createNode(n3_1);
    const edge = ElkGraphUtil.createSimpleEdge(n1, n3_1_1);
    expect([edge.isHierarchical(), edge.isSelfloop(), edge.isHyperedge(), edge.isConnected()]).toEqual([
      true,
      false,
      false,
      true,
    ]);
  });

  it('firstEdgeSection(edge, true, true) keeps one reset section', () => {
    const graph = ElkGraphUtil.createGraph();
    const edge = ElkGraphUtil.createSimpleEdge(ElkGraphUtil.createNode(graph), ElkGraphUtil.createNode(graph));
    const first = ElkGraphUtil.createEdgeSection(edge);
    first.setStartLocation(1, 2);
    first.setEndLocation(3, 4);
    ElkGraphUtil.createBendPoint(first, 5, 6);
    ElkGraphUtil.createEdgeSection(edge);
    ElkGraphUtil.createEdgeSection(edge);
    expect(ElkGraphUtil.firstEdgeSection(edge, true, true)).toBe(first);
    expect(edge.getSections().toArray()).toEqual([first]);
    expect(first.getBendPoints().isEmpty()).toBe(true);
    expect([first.getStartX(), first.getStartY(), first.getEndX(), first.getEndY()]).toEqual([0, 0, 0, 0]);
  });

  it('prints a hyperedge with bracketed, comma-joined endpoints', () => {
    const graph = ElkGraphUtil.createGraph();
    const [a, b, c] = ['a', 'b', 'c'].map((id) => {
      const node = ElkGraphUtil.createNode(graph);
      node.setIdentifier(id);
      return node;
    }) as [ElkNode, ElkNode, ElkNode];
    const edge = ElkGraphUtil.createHyperedge([a, b], [c]);
    edge.setIdentifier('e');
    expect(edge.toString()).toBe(
      'ElkEdge "e" [ElkNode "a" (0.0,0.0 | 0.0,0.0), ElkNode "b" (0.0,0.0 | 0.0,0.0)] -> [ElkNode "c" (0.0,0.0 | 0.0,0.0)]',
    );
  });
});

describe('model details not reached by graph.json', () => {
  it('ElkGraphFactory.eINSTANCE is an ElkGraphFactoryImpl creating every model class', () => {
    const factory = ElkGraphFactory.eINSTANCE;
    expect(factory).toBeInstanceOf(ElkGraphFactoryImpl);
    expect(isElkGraphFactory(factory)).toBe(true);
    expect(factory.getElkGraphPackage()).toBe(ElkGraphPackage);
    expect(
      [
        factory.createElkNode(),
        factory.createElkPort(),
        factory.createElkLabel(),
        factory.createElkEdge(),
        factory.createElkEdgeSection(),
        factory.createElkBendPoint(),
        (factory as ElkGraphFactoryImpl).createElkPropertyToValueMapEntry(),
      ].map((o) => o.eClass().getName()),
    ).toEqual([
      'ElkNode',
      'ElkPort',
      'ElkLabel',
      'ElkEdge',
      'ElkEdgeSection',
      'ElkBendPoint',
      'ElkPropertyToValueMapEntry',
    ]);
    expect(ElkGraphFactoryImpl.init()).toBeInstanceOf(ElkGraphFactoryImpl);
  });

  it('ElkGraphFactoryImpl serializes properties and values but deserializes nothing', () => {
    const factory = new ElkGraphFactoryImpl();
    expect(factory.convertIPropertyToString(null, new Property<string>('org.test.a'))).toBe('org.test.a');
    expect(factory.convertPropertyValueToString(null, 'v')).toBe('v');
    expect(() => factory.convertPropertyValueToString(null, null)).toThrow(TypeError);
    expect(factory.createIPropertyFromString(null, 'org.test.a')).toBeNull();
    expect(factory.createPropertyValueFromString(null, 'v')).toBeNull();
  });

  it('reports the EClass names and the abstract ElkConnectableShape class', () => {
    const node = ElkGraphUtil.createGraph();
    expect(node).toBeInstanceOf(ElkConnectableShapeImpl);
    expect(isElkConnectableShape(node)).toBe(true);
    expect(isElkConnectableShape(ElkGraphUtil.createLabel(null))).toBe(false);
    expect(node.isHierarchical()).toBe(false);
    ElkGraphUtil.createNode(node);
    expect(node.isHierarchical()).toBe(true);
  });

  it('removing from the containment lists clears the parent through the inverse', () => {
    const graph = ElkGraphUtil.createGraph();
    const node = ElkGraphUtil.createNode(graph);
    const port = ElkGraphUtil.createPort(node);
    const edge = ElkGraphUtil.createSimpleEdge(node, node);
    const section = ElkGraphUtil.createEdgeSection(edge);
    expect(node.getPorts().remove(port)).toBe(true);
    expect(edge.getSections().remove(section)).toBe(true);
    expect([port.getParent(), port.eContainer(), section.getParent(), section.eContainer()]).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('adding to the opposite lists fills sources and incoming sections', () => {
    const graph = ElkGraphUtil.createGraph();
    const node = ElkGraphUtil.createNode(graph);
    const edge = ElkGraphUtil.createEdge(graph);
    node.getOutgoingEdges().add(edge);
    expect(edge.getSources().toArray()).toEqual([node]);
    const s1 = ElkGraphUtil.createEdgeSection(edge);
    const s2 = ElkGraphUtil.createEdgeSection(edge);
    s1.getIncomingSections().add(s2);
    expect(s2.getOutgoingSections().toArray()).toEqual([s1]);
  });

  it('a section moves between edges through the sections list and the setter', () => {
    const graph = ElkGraphUtil.createGraph();
    const e1 = ElkGraphUtil.createEdge(graph);
    const e2 = ElkGraphUtil.createEdge(graph);
    const section = ElkGraphUtil.createEdgeSection(e1);
    e2.getSections().add(section);
    expect([e1.getSections().size(), section.getParent()]).toEqual([0, e2]);
    section.setParent(e2);
    section.setParent(e1);
    expect([e2.getSections().size(), e1.getSections().toArray(), section.getParent()]).toEqual([0, [section], e1]);
    section.setParent(null);
    expect([e1.getSections().size(), section.getParent()]).toEqual([0, null]);
  });

  it('a section reads its plain shape references and prints the generated text (D10)', () => {
    const graph = ElkGraphUtil.createGraph();
    const section = new ElkEdgeSectionImpl();
    section.setOutgoingShape(graph);
    section.setIncomingShape(graph);
    section.setStartLocation(1, 2.5);
    expect([section.basicGetOutgoingShape(), section.basicGetIncomingShape()]).toEqual([graph, graph]);
    expect(section.toString()).toBe(
      'org.eclipse.elk.graph.impl.ElkEdgeSectionImpl (startX: 1.0, startY: 2.5, endX: 0.0, endY: 0.0, identifier: null)',
    );
  });

  it('getParent and getContainingNode are null under another container feature', () => {
    const graph = ElkGraphUtil.createGraph();
    const node = ElkGraphUtil.createNode(null);
    const port = ElkGraphUtil.createPort(null);
    const edge = ElkGraphUtil.createEdge(null);
    const section = ElkGraphUtil.createEdgeSection(null);
    for (const o of [node, port, edge, section]) {
      o.eBasicSetContainer(graph, FOREIGN_FEATURE);
    }
    expect([node.getParent(), port.getParent(), edge.getContainingNode(), section.getParent()]).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('the generated setters reject a recursive containment, reachable only through a cast', () => {
    const port = ElkGraphUtil.createPort(null);
    const edge = ElkGraphUtil.createEdge(null);
    const section = ElkGraphUtil.createEdgeSection(null);
    expect(() => port.setParent(port as unknown as ElkNode)).toThrow(
      new IllegalArgumentException('Recursive containment not allowed for ElkPort (0.0,0.0 | 0.0,0.0)'),
    );
    expect(() => edge.setContainingNode(edge as unknown as ElkNode)).toThrow(
      new IllegalArgumentException('Recursive containment not allowed for ElkEdge  -> '),
    );
    expect(() => section.setParent(section as unknown as ElkEdge)).toThrow(IllegalArgumentException);
  });

  it('unhandled feature ids fall through to BasicEObjectImpl (D4)', () => {
    const graph = ElkGraphUtil.createGraph();
    const elements = [
      ElkGraphUtil.createNode(null),
      ElkGraphUtil.createPort(null),
      ElkGraphUtil.createEdge(null),
      ElkGraphUtil.createEdgeSection(null),
    ];
    for (const o of elements) {
      expect(() => o.eInverseAdd(graph, FOREIGN_FEATURE)).toThrow(UnsupportedOperationException);
      expect(() => o.eInverseRemove(graph, FOREIGN_FEATURE)).toThrow(UnsupportedOperationException);
      o.eBasicSetContainer(graph, FOREIGN_FEATURE);
      expect(() => o.eBasicRemoveFromContainer()).toThrow(UnsupportedOperationException);
    }
  });
});

/** A child kind with its generated container setter and the owner's containment list. */
interface ContainmentCase {
  name: string;
  child: () => InternalEObject;
  owner: () => InternalEObject;
  set: (child: InternalEObject, owner: InternalEObject | null) => void;
  list: (owner: InternalEObject) => EList<InternalEObject>;
  get: (child: InternalEObject) => InternalEObject | null;
}

const CONTAINMENT_CASES: ContainmentCase[] = [
  {
    name: 'node.parent',
    child: () => ElkGraphUtil.createNode(null),
    owner: () => ElkGraphUtil.createGraph(),
    set: (c, o) => (c as ElkNode).setParent(o as ElkNode | null),
    list: (o) => (o as ElkNode).getChildren() as EList<InternalEObject>,
    get: (c) => (c as ElkNode).getParent(),
  },
  {
    name: 'port.parent',
    child: () => ElkGraphUtil.createPort(null),
    owner: () => ElkGraphUtil.createGraph(),
    set: (c, o) => (c as ElkPort).setParent(o as ElkNode | null),
    list: (o) => (o as ElkNode).getPorts() as EList<InternalEObject>,
    get: (c) => (c as ElkPort).getParent(),
  },
  {
    name: 'edge.containingNode',
    child: () => ElkGraphUtil.createEdge(null),
    owner: () => ElkGraphUtil.createGraph(),
    set: (c, o) => (c as ElkEdge).setContainingNode(o as ElkNode | null),
    list: (o) => (o as ElkNode).getContainedEdges() as EList<InternalEObject>,
    get: (c) => (c as ElkEdge).getContainingNode(),
  },
  {
    name: 'section.parent',
    child: () => ElkGraphUtil.createEdgeSection(null),
    owner: () => ElkGraphUtil.createEdge(null),
    set: (c, o) => (c as ElkEdgeSection).setParent(o as ElkEdge | null),
    list: (o) => (o as ElkEdge).getSections() as EList<InternalEObject>,
    get: (c) => (c as ElkEdgeSection).getParent(),
  },
];

describe.each(CONTAINMENT_CASES.map((c) => [c.name, c] as const))('generated setter %s', (_name, c) => {
  it('adds an uncontained child through the list and ignores a repeated or null set', () => {
    const owner = c.owner();
    const child = c.child();
    c.set(child, null);
    expect(child.eContainer()).toBeNull();
    expect(c.list(owner).add(child)).toBe(true);
    c.set(child, owner);
    expect([c.get(child), c.list(owner).toArray()]).toEqual([owner, [child]]);
  });

  it('sets an uncontained child into the owner, then detaches it with null', () => {
    const owner = c.owner();
    const child = c.child();
    c.set(child, owner);
    expect([c.get(child), c.list(owner).toArray()]).toEqual([owner, [child]]);
    c.set(child, null);
    expect([c.get(child), child.eContainer(), c.list(owner).size()]).toEqual([null, null, 0]);
  });

  it('leaves a foreign container feature through eBasicRemoveFromContainer (D4: no generated case)', () => {
    const owner = c.owner();
    const child = c.child();
    child.eBasicSetContainer(owner, FOREIGN_FEATURE);
    expect(() => c.set(child, owner)).toThrow(UnsupportedOperationException);
  });
});

describe('ElkConnectableShapeImpl', () => {
  /** A concrete connectable shape that keeps the abstract class's EClass. */
  class TestShape extends ElkConnectableShapeImpl {}

  it('reports the ElkConnectableShape EClass', () => {
    expect(new TestShape().eClass().getName()).toBe('ElkConnectableShape');
  });
});
