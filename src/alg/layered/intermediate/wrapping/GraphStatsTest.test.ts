// SPDX-License-Identifier: EPL-2.0
/*
 * Port of GraphStatsTest: which cut indices GraphStats allows, with and without `WRAPPING_VALIDIFY_FORBIDDEN_INDICES`, and
 * that a wrapped layout keeps the cuts that are not forbidden. The Java's `PlainJavaInitialization.initializePlainJavaLayout()`
 * is the explicit layered registration; `assertArrayEquals` on `boolean[]` is `toEqual` on arrays.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/wrapping/GraphStatsTest.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../../test/helpers/layered-framework-replay.js';
import { RecursiveGraphLayoutEngine } from '../../../../core/RecursiveGraphLayoutEngine.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { LEdge } from '../../graph/LEdge.js';
import { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { LPort } from '../../graph/LPort.js';
import { Layer } from '../../graph/Layer.js';
import { CuttingStrategy } from '../../options/CuttingStrategy.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { WrappingStrategy } from '../../options/WrappingStrategy.js';
import { GraphStats } from './GraphStats.js';

function layer(graph: LGraph): Layer {
  const result = new Layer(graph);
  graph.getLayers().push(result);
  return result;
}

function node(graph: LGraph, layerOfNode: Layer): LNode {
  const result = new LNode(graph);
  result.setLayer(layerOfNode);
  return result;
}

function edge(source: LNode, target: LNode): void {
  const sourcePort = new LPort();
  sourcePort.setNode(source);
  const targetPort = new LPort();
  targetPort.setNode(target);
  const lEdge = new LEdge();
  lEdge.setSource(sourcePort);
  lEdge.setTarget(targetPort);
}

/** A path `n0 -> n1 -> n2 -> n3 -> n4` with one node per layer: every cut but the first is allowed. */
function pathGraph(): LGraph {
  const graph = new LGraph();
  let previous = node(graph, layer(graph));
  for (let i = 1; i < 5; i++) {
    const next = node(graph, layer(graph));
    edge(previous, next);
    previous = next;
  }
  return graph;
}

/**
 * `a -> b, a -> c, b -> d, c -> d, d -> e, e -> f` in the layers `[a] [b, c] [d] [e] [f]`: the edges into layers 1 and 2
 * have different sources or targets, so only cuts before layers 3 and 4 are allowed.
 */
function diamondGraph(): LGraph {
  const graph = new LGraph();
  const a = node(graph, layer(graph));
  const layer1 = layer(graph);
  const b = node(graph, layer1);
  const c = node(graph, layer1);
  const d = node(graph, layer(graph));
  const e = node(graph, layer(graph));
  const f = node(graph, layer(graph));
  edge(a, b);
  edge(a, c);
  edge(b, d);
  edge(c, d);
  edge(d, e);
  edge(e, f);
  return graph;
}

/**
 * Lays out a path of six nodes with `SINGLE_EDGE` wrapping and a manual cut before the fourth node, with the given
 * forbidden indices if they are not `null`.
 */
function layoutWrappedPath(forbiddenIndices: number[] | null): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  graph.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  graph.setProperty(LayeredOptions.WRAPPING_STRATEGY, WrappingStrategy.SINGLE_EDGE);
  graph.setProperty(LayeredOptions.WRAPPING_CUTTING_STRATEGY, CuttingStrategy.MANUAL);
  graph.setProperty(LayeredOptions.WRAPPING_CUTTING_CUTS, [3]);
  if (forbiddenIndices !== null) {
    graph.setProperty(LayeredOptions.WRAPPING_VALIDIFY_FORBIDDEN_INDICES, forbiddenIndices);
  }

  let previous: ElkNode | null = null;
  for (let i = 0; i < 6; i++) {
    const elkNode = ElkGraphUtil.createNode(graph);
    elkNode.setDimensions(30, 30);
    if (previous !== null) {
      ElkGraphUtil.createSimpleEdge(previous, elkNode);
    }
    previous = elkNode;
  }

  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return graph;
}

/** Whether the fourth node of a path laid out by `layoutWrappedPath` starts a new chunk. */
function isWrappedBeforeFourthNode(graph: ElkNode): boolean {
  const third = graph.getChildren().get(2);
  const fourth = graph.getChildren().get(3);
  return fourth.getX() < third.getX() && fourth.getY() > third.getY();
}

describe('GraphStatsTest', () => {
  beforeAll(() => {
    registerLayered();
  });

  it('testCutsAllowedWithoutForbiddenIndices', () => {
    expect(new GraphStats(pathGraph()).getCutsAllowed()).toEqual([false, true, true, true, true]);
    expect(new GraphStats(diamondGraph()).getCutsAllowed()).toEqual([false, false, false, true, true]);
  });

  it('testForbiddenIndicesForbidOnlyTheListedCuts', () => {
    const graph = pathGraph();
    graph.setProperty(LayeredOptions.WRAPPING_VALIDIFY_FORBIDDEN_INDICES, [2, 4]);
    expect(new GraphStats(graph).getCutsAllowed()).toEqual([false, true, false, true, false]);
  });

  it('testForbiddenIndicesKeepCutsForbiddenByTheGraph', () => {
    const graph = diamondGraph();
    graph.setProperty(LayeredOptions.WRAPPING_VALIDIFY_FORBIDDEN_INDICES, [3]);
    expect(new GraphStats(graph).getCutsAllowed()).toEqual([false, false, false, false, true]);
  });

  it('testForbiddenIndicesOutsideTheLayeringAreIgnored', () => {
    const graph = pathGraph();
    graph.setProperty(LayeredOptions.WRAPPING_VALIDIFY_FORBIDDEN_INDICES, [-1, 0, 5]);
    expect(new GraphStats(graph).getCutsAllowed()).toEqual([false, true, true, true, true]);
  });

  it('testManualCutWithoutForbiddenIndices', () => {
    expect(isWrappedBeforeFourthNode(layoutWrappedPath(null))).toBe(true);
  });

  it('testManualCutAllowedNextToForbiddenIndex', () => {
    expect(isWrappedBeforeFourthNode(layoutWrappedPath([1]))).toBe(true);
  });

  it('testManualCutAtForbiddenIndexIsMoved', () => {
    // The greedy validify strategy moves the cut to the next allowed index
    const graph = layoutWrappedPath([3]);
    expect(isWrappedBeforeFourthNode(graph)).toBe(false);
    const fourth = graph.getChildren().get(3);
    const fifth = graph.getChildren().get(4);
    expect(fifth.getX() < fourth.getX() && fifth.getY() > fourth.getY()).toBe(true);
  });
});
