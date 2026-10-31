// SPDX-License-Identifier: EPL-2.0
// Unit cases of ModelOrderBarycenterHeuristic (mission 7c, T6): layers from the structural builders, expectations are
// the orders the Java comparator defines (model order first, transitive memory, barycenters as the fallback). The
// oracle rows with the model order options are proven by T7's replay of the sweep.
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { Random } from '../../../java/util/Random.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { init } from './counting/IInitializable.js';
import { ForsterConstraintResolver } from './ForsterConstraintResolver.js';
import { BarycenterHeuristic } from './BarycenterHeuristic.js';
import { ModelOrderBarycenterHeuristic } from './ModelOrderBarycenterHeuristic.js';
import { NodeRelativePortDistributor } from './NodeRelativePortDistributor.js';

const SEED = 1;

class Probe extends ModelOrderBarycenterHeuristic {
  compare(n1: LNode, n2: LNode): number {
    return this.barycenterStateComparator(n1, n2);
  }

  setBarycenter(node: LNode, value: number | null): void {
    this.stateOf(node).barycenter = value;
  }

  barycenterOf(node: LNode): number | null {
    return this.stateOf(node).barycenter;
  }
}

interface Setup {
  readonly graph: LGraph;
  readonly nodes: LNode[];
  readonly order: LNode[][];
  readonly heuristic: Probe;
}

/** One layer of `count` nodes with a model order of their index, initialised as `GraphInfoHolder` does. */
function layerOf(count: number, options: { force?: boolean; strategy?: GroupOrderStrategy } = {}): Setup {
  const graph = new LGraph();
  graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER, options.force ?? true);
  graph.setProperty(
    LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_GROUP_ORDER_STRATEGY,
    options.strategy ?? GroupOrderStrategy.MODEL_ORDER,
  );
  // list defaults need `LayoutMetaDataService.initElkReflect()`; the graph and the nodes carry the empty lists
  graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_ENFORCED_GROUP_ORDERS, []);
  const layer = addLayer(graph);
  const nodes = Array.from({ length: count }, (_, i) => {
    const node = addNode(graph);
    node.setLayer(layer);
    addPort(node);
    node.setProperty(InternalProperties.MODEL_ORDER, i);
    node.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, []);
    return node;
  });
  const order = [nodes];
  const distributor = new NodeRelativePortDistributor(1);
  const resolver = new ForsterConstraintResolver(order);
  const heuristic = new Probe(resolver, new Random(SEED), distributor, order);
  init([distributor, resolver, heuristic], order);
  return { graph, nodes, order, heuristic };
}

describe('ModelOrderBarycenterHeuristic: comparator', () => {
  it.each([
    ['the first node', FIRST_SEPARATE_FIRST],
    ['the second node', FIRST_SEPARATE_SECOND],
  ])('answers 0 when a separate layer constraint sits on %s', (_name, constrain) => {
    const { nodes, heuristic } = layerOf(2);
    constrain(nodes);
    expect([heuristic.compare(nodes[0]!, nodes[1]!), heuristic.compare(nodes[1]!, nodes[0]!)]).toEqual([0, 0]);
  });

  // Java quirk, kept verbatim: when `value < 0` (n1 sorts before n2) the comparator registers n1 as the `bigger` node
  // (`updateBiggerAndSmallerAssociations(n1, n2)`), and `compareBasedOnTansitiveDependencies` answers 1 for "n1 is
  // bigger than n2": a pair compared a second time is answered from the memory with the opposite sign.
  it('orders nodes with a model order by it, ignores the barycenters, and answers a repeated pair from memory', () => {
    const { nodes, heuristic } = layerOf(2);
    const [a, b] = nodes as [LNode, LNode];
    heuristic.setBarycenter(a, 9);
    heuristic.setBarycenter(b, 1);
    expect(heuristic.compare(a, b)).toBe(-1);
    expect(heuristic.compare(a, b)).toBe(1);
    expect(heuristic.compare(b, a)).toBe(-1);
    heuristic.clearTransitiveOrdering();
    expect(heuristic.compare(b, a)).toBe(1);
    expect(heuristic.compare(b, a)).toBe(-1);
  });

  it('carries the memory over a chain to the pair of its ends (transitive associations)', () => {
    const { nodes, heuristic } = layerOf(3);
    const [a, b, c] = nodes as [LNode, LNode, LNode];
    // c has no model order: barycenters decide between b and c
    c.setProperty(InternalProperties.MODEL_ORDER, null);
    heuristic.setBarycenter(a, 1);
    heuristic.setBarycenter(b, 5);
    heuristic.setBarycenter(c, 10);
    expect(heuristic.compare(a, b)).toBe(-1);
    expect(heuristic.compare(b, c)).toBe(-1);
    // a and c were never compared: the remembered chain answers; the barycenters alone would say -1
    expect(heuristic.compare(a, c)).toBe(1);
    heuristic.clearTransitiveOrdering();
    expect(heuristic.compare(a, c)).toBe(-1);
  });

  it('orders a node without a model order by barycenter against one with, and knows the unknown ones', () => {
    const { nodes, heuristic } = layerOf(3);
    const [a, b, c] = nodes as [LNode, LNode, LNode];
    [a, b, c].forEach((node) => node.setProperty(InternalProperties.MODEL_ORDER, null));
    heuristic.setBarycenter(a, 2);
    heuristic.setBarycenter(b, 2);
    heuristic.setBarycenter(c, null);
    expect(heuristic.compare(a, b)).toBe(0);
    expect(heuristic.compare(a, c)).toBe(-1);
    heuristic.clearTransitiveOrdering();
    expect(heuristic.compare(c, a)).toBe(1);
    heuristic.clearTransitiveOrdering();
    expect(heuristic.compare(c, c)).toBe(0);
  });

  it('leaves two nodes of different model order groups to their barycenters under ONLY_WITHIN_GROUP', () => {
    const { nodes, heuristic } = layerOf(2, { strategy: GroupOrderStrategy.ONLY_WITHIN_GROUP });
    const [a, b] = nodes as [LNode, LNode];
    heuristic.setBarycenter(a, 5);
    heuristic.setBarycenter(b, 3);
    a.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID, 1);
    b.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID, 2);
    // the model order says a < b, the barycenters b < a: separate groups follow the barycenters
    expect(heuristic.compare(a, b)).toBe(1);
    heuristic.clearTransitiveOrdering();
    b.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID, 1);
    // the same group (the shared small boxes are identical): the model order decides
    expect(heuristic.compare(a, b)).toBe(-1);
  });
});

function FIRST_SEPARATE_FIRST(nodes: LNode[]): void {
  nodes[0]!.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.FIRST_SEPARATE);
}

function FIRST_SEPARATE_SECOND(nodes: LNode[]): void {
  nodes[1]!.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST_SEPARATE);
}

describe('ModelOrderBarycenterHeuristic: insertionSort', () => {
  it('sorts by the comparator, keeps equal elements in place, and clears the transitive ordering afterwards', () => {
    const { nodes, heuristic } = layerOf(3);
    const [a, b, c] = nodes as [LNode, LNode, LNode];
    [a, b, c].forEach((node) => node.setProperty(InternalProperties.MODEL_ORDER, null));
    heuristic.setBarycenter(a, 3);
    heuristic.setBarycenter(b, 1);
    heuristic.setBarycenter(c, 3);
    const layer = [a, b, c];
    ModelOrderBarycenterHeuristic.insertionSort(layer, (x, y) => heuristic.compare(x, y), heuristic);
    expect(layer).toEqual([b, a, c]);
    // a remembered a < c from the sort; cleared, the equal barycenters give 0 again
    expect(heuristic.compare(a, c)).toBe(0);
  });
});

describe('ModelOrderBarycenterHeuristic: minimizeCrossingsInLayer', () => {
  it('keeps the model order of the real nodes whatever the barycenters say and skips the constraint resolver', () => {
    const { nodes, heuristic } = layerOf(3);
    const [n0, n1, n2] = nodes as [LNode, LNode, LNode];
    n2.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [n0]);
    const layer = [n2, n0, n1];
    heuristic.minimizeCrossingsInLayer(layer, false, false, true);
    expect(layer).toEqual([n0, n1, n2]);
  });

  it('applies the in-layer constraints of the resolver when the model order is not forced', () => {
    const { nodes, heuristic } = layerOf(3, { force: false });
    const [n0, n1, n2] = nodes as [LNode, LNode, LNode];
    n2.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [n0]);
    const layer = [n0, n1, n2];
    heuristic.minimizeCrossingsInLayer(layer, true, false, true);
    expect(layer.indexOf(n2)).toBeLessThan(layer.indexOf(n0));
    expect([...layer].sort((x, y) => x.id - y.id)).toEqual([n0, n1, n2]);
  });

  it('randomizes the barycenters of a layer, one double per node, and sorts by model order', () => {
    const { nodes, heuristic } = layerOf(2);
    const layer = [nodes[1]!, nodes[0]!];
    heuristic.minimizeCrossingsInLayer(layer, false, true, true);
    const draws = new Random(SEED);
    expect([heuristic.barycenterOf(nodes[1]!), heuristic.barycenterOf(nodes[0]!)]).toEqual([
      draws.nextDouble(),
      draws.nextDouble(),
    ]);
    expect(layer).toEqual(nodes);
  });

  it('does not sort a layer of one node', () => {
    const { nodes, heuristic } = layerOf(1);
    const layer = [nodes[0]!];
    heuristic.minimizeCrossingsInLayer(layer, true, false, true);
    expect(layer).toEqual(nodes);
  });

  it('is the heuristic that the force-model-order cast of BarycenterHeuristic accepts', () => {
    const { heuristic, order } = layerOf(2);
    expect(heuristic).toBeInstanceOf(BarycenterHeuristic);
    expect(heuristic.minimizeCrossings(order, 0, true, true)).toBe(false);
  });
});
