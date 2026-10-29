// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import {
  importRow,
  loadRows,
  type Expected,
  type PhaseRow,
} from '../../../../test/helpers/layered-phase-replay-rows.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { Pair } from '../../../core/util/Pair.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { NodePromotionStrategy } from '../options/NodePromotionStrategy.js';
import { LongestPathLayerer } from '../p2layers/LongestPathLayerer.js';
import { LongestPathSourceLayerer } from '../p2layers/LongestPathSourceLayerer.js';
import { NodePromotion } from './NodePromotion.js';
import { promoteNode } from './NodePromotionHeuristic.js';
import { precalculateAndSetInformation } from './NodePromotionPrecalculation.js';
import { NodePromotionState } from './NodePromotionState.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/NodePromotion/';
const PROCESSOR_NAME = 'NODE_PROMOTION';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX) && row.steps !== null);
const DEEP_NODE_COUNT = 5000;
const WIDTH_STRATEGIES = [
  NodePromotionStrategy.NIKOLOV,
  NodePromotionStrategy.NIKOLOV_PIXEL,
  NodePromotionStrategy.NO_BOUNDARY,
];

function factories(createProcessor: () => ILayoutProcessor<LGraph>): Factories {
  return {
    createProcessor(name) {
      if (name !== PROCESSOR_NAME) {
        throw new Error(`unexpected processor ${name}`);
      }
      return createProcessor();
    },
    createPhase(phase, strategy) {
      throw new Error(`unexpected phase ${phase}/${strategy}`);
    },
  };
}

function replay(row: PhaseRow): Expected {
  const graph = runSteps(
    row,
    factories(() => new NodePromotion()),
  );
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('NodePromotion (oracle rows)', () => {
  it('has the ten recorded rows, one per strategy arm plus the chain', () => {
    expect(rows.map((row) => row.id.slice(ROW_PREFIX.length))).toEqual([
      'NIKOLOV',
      'NIKOLOV_PIXEL',
      'NIKOLOV_IMPROVED',
      'NIKOLOV_IMPROVED_PIXEL',
      'DUMMYNODE_PERCENTAGE',
      'NODECOUNT_PERCENTAGE',
      'NO_BOUNDARY',
      'MODEL_ORDER_LEFT_TO_RIGHT',
      'MODEL_ORDER_RIGHT_TO_LEFT',
      'chain',
    ]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('replays %s', (_id, row) => {
    const actual = replay(row);
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });

  it('compares the full 7a dump for every row with fewer than ten nodes', () => {
    expect(rows.filter((row) => row.expected.dump !== undefined).length).toBe(rows.length - 1);
  });
});

// ------------------------------------------------------------------------------------------------------------
// B8 twin: a verbatim recursive transcription of NodePromotion.promoteNode (J:629-687)

function recursivePromoteNode(s: NodePromotionState, node: LNode): Pair<number, boolean> {
  let maxWidthNotExceeded = true;
  let dummydiff = 0;
  let nodeLayerPos = s.layers[node.id]!;
  const nodeSize = node.getSize().y + s.nodeSizeAffix;
  const dummiesBuilt = s.degreeDiff[node.id]![2]!;

  s.currentWidth[nodeLayerPos] = s.currentWidth[nodeLayerPos]! - 1 + dummiesBuilt;
  s.currentWidthPixel[nodeLayerPos] = s.currentWidthPixel[nodeLayerPos]! - nodeSize + dummiesBuilt * s.dummySize;

  nodeLayerPos++;
  if (nodeLayerPos >= s.maxHeight) {
    s.maxHeight++;
    s.currentWidth.push(1);
    s.currentWidthPixel.push(nodeSize);
  } else {
    const dummiesReduced = s.degreeDiff[node.id]![1]!;
    s.currentWidth[nodeLayerPos] = s.currentWidth[nodeLayerPos]! + 1 - dummiesReduced;
    s.currentWidthPixel[nodeLayerPos] = s.currentWidthPixel[nodeLayerPos]! + nodeSize - dummiesReduced * s.dummySize;
  }

  if (
    (s.promotionStrategy === NodePromotionStrategy.NIKOLOV &&
      (s.currentWidth[nodeLayerPos]! > s.maxWidth || s.currentWidth[nodeLayerPos - 1]! > s.maxWidth)) ||
    (s.promotionStrategy === NodePromotionStrategy.NIKOLOV_PIXEL &&
      (s.currentWidthPixel[nodeLayerPos]! > s.maxWidthPixel ||
        s.currentWidthPixel[nodeLayerPos - 1]! > s.maxWidthPixel))
  ) {
    maxWidthNotExceeded = false;
  }

  for (const edge of node.getIncomingEdges()) {
    const masterNode = edge.getSource()!.getNode()!;
    if (s.layers[masterNode.id] === nodeLayerPos) {
      const promotion = recursivePromoteNode(s, masterNode);
      dummydiff = dummydiff + promotion.getFirst()!;
      maxWidthNotExceeded = maxWidthNotExceeded && promotion.getSecond()!;
    }
  }

  s.layers[node.id] = nodeLayerPos;
  dummydiff = dummydiff + s.degreeDiff[node.id]![0]!;

  return new Pair<number, boolean>(dummydiff, maxWidthNotExceeded);
}

/** Everything `promoteNode` can change besides its result. */
function snapshot(s: NodePromotionState): unknown {
  return {
    layers: [...s.layers],
    currentWidth: [...s.currentWidth],
    currentWidthPixel: [...s.currentWidthPixel],
    maxHeight: s.maxHeight,
  };
}

function preparedState(graph: LGraph, strategy: NodePromotionStrategy): NodePromotionState {
  const state = new NodePromotionState();
  state.masterGraph = graph;
  state.promotionStrategy = strategy;
  precalculateAndSetInformation(state);
  return state;
}

/** The row's graph in its pre-state: every step but the processor run and the dump. */
function preState(row: PhaseRow): LGraph {
  const steps = row.steps!.filter(([op]) => op !== 'runProcessor' && op !== 'dump');
  return runSteps(
    { ...row, steps },
    factories(() => new NodePromotion()),
  );
}

function deepChain(nodeCount: number): LGraph {
  const graph = new LGraph();
  let previous: LNode | null = null;
  for (let i = 0; i < nodeCount; i++) {
    const node = addNode(graph);
    node.setLayer(addLayer(graph));
    graph.getLayerlessNodes().pop();
    if (previous !== null) {
      connect(addPort(previous), addPort(node));
    }
    previous = node;
  }
  return graph;
}

describe('NodePromotion.promoteNode (B8 twin)', () => {
  const cases = rows.flatMap((row) => WIDTH_STRATEGIES.map((strategy) => [row.id, strategy.name(), row] as const));

  it.each(cases)('%s with %s: the loop and the recursive twin agree on every call', (_id, name, row) => {
    const strategy = NodePromotionStrategy.valueOf(name);
    const graph = preState(row);
    const port = preparedState(graph, strategy);
    const twin = preparedState(graph, strategy);
    expect(port.nodesWithIncomingEdges.length).toBeGreaterThan(0);
    for (const node of port.nodesWithIncomingEdges) {
      const portResult = promoteNode(port, node);
      const twinResult = recursivePromoteNode(twin, node);
      expect([portResult.getFirst(), portResult.getSecond()]).toEqual([twinResult.getFirst(), twinResult.getSecond()]);
      expect(snapshot(port)).toEqual(snapshot(twin));
    }
  });

  it('the loop equals the twin on a fan-in under NIKOLOV', () => {
    const graph = new LGraph();
    const nodes = [0, 1, 2, 3].map(() => addNode(graph));
    nodes[0]!.setLayer(addLayer(graph));
    nodes[1]!.setLayer(graph.getLayers()[0]!);
    nodes[2]!.setLayer(addLayer(graph));
    nodes[3]!.setLayer(graph.getLayers()[1]!);
    connect(addPort(nodes[0]!), addPort(nodes[2]!));
    connect(addPort(nodes[1]!), addPort(nodes[2]!));
    const state = preparedState(graph, NodePromotionStrategy.NIKOLOV);
    const twin = preparedState(graph, NodePromotionStrategy.NIKOLOV);
    const results = state.nodesWithIncomingEdges.map((node) => promoteNode(state, node).getSecond());
    const twinResults = twin.nodesWithIncomingEdges.map((node) => recursivePromoteNode(twin, node).getSecond());
    expect(results).toEqual(twinResults);
    expect(snapshot(state)).toEqual(snapshot(twin));
  });

  it(`runs a chain of ${String(DEEP_NODE_COUNT)} nodes without a stack overflow, equal to the twin`, () => {
    const graph = deepChain(DEEP_NODE_COUNT);
    const port = preparedState(graph, NodePromotionStrategy.NO_BOUNDARY);
    const last = port.nodes[DEEP_NODE_COUNT - 1]!;
    const result = promoteNode(port, last);
    let twinResult: Pair<number, boolean> | null = null;
    const twin = preparedState(graph, NodePromotionStrategy.NO_BOUNDARY);
    try {
      twinResult = recursivePromoteNode(twin, last);
    } catch (e) {
      // the recursive reference itself overflows the interpreter's stack under --jitless (AC6); the port must not
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twinResult !== null) {
      expect(result.getFirst()).toBe(twinResult.getFirst());
      expect(snapshot(port)).toEqual(snapshot(twin));
    }
  });
});

// ------------------------------------------------------------------------------------------------------------
// Behaviour the rows do not reach (structure, not oracle numbers)

function layered(layerNodes: readonly (readonly LNode[])[], graph: LGraph): void {
  layerNodes.forEach((nodes) => {
    const layer = addLayer(graph);
    nodes.forEach((node) => {
      node.setLayer(layer);
      graph.getLayerlessNodes().splice(graph.getLayerlessNodes().indexOf(node), 1);
    });
  });
}

function run(graph: LGraph, strategy: NodePromotionStrategy): void {
  graph.setProperty(LayeredOptions.LAYERING_NODE_PROMOTION_STRATEGY, strategy);
  new NodePromotion().process(graph, new NullElkProgressMonitor());
}

function layerIndices(graph: LGraph, nodes: readonly LNode[]): number[] {
  return nodes.map((node) => graph.getLayers().indexOf(node.getLayer()!));
}

function withModelOrder(graph: LGraph, orders: readonly (number | null)[]): LNode[] {
  return orders.map((order) => {
    const node = addNode(graph);
    if (order !== null) {
      node.setProperty(InternalProperties.MODEL_ORDER, order);
    }
    return node;
  });
}

describe('NodePromotion strategies', () => {
  it('runs the default arm for NONE exactly like NO_BOUNDARY', () => {
    const build = (): { graph: LGraph; nodes: LNode[] } => {
      const graph = new LGraph();
      const nodes = [0, 1, 2, 3].map(() => addNode(graph));
      layered([[nodes[0]!], [nodes[1]!], [nodes[2]!, nodes[3]!]], graph);
      connect(addPort(nodes[0]!), addPort(nodes[2]!));
      connect(addPort(nodes[1]!), addPort(nodes[3]!));
      return { graph, nodes };
    };
    const none = build();
    const unbounded = build();
    run(none.graph, NodePromotionStrategy.NONE);
    run(unbounded.graph, NodePromotionStrategy.NO_BOUNDARY);
    expect(layerIndices(none.graph, none.nodes)).toEqual(layerIndices(unbounded.graph, unbounded.nodes));
  });

  it('throws when a label node of the next layer has no incoming edge', () => {
    const graph = new LGraph();
    const [a] = withModelOrder(graph, [5]) as [LNode];
    const label = addNode(graph, NodeType.LABEL);
    layered([[a], [label]], graph);
    expect(() => {
      run(graph, NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT);
    }).toThrow();
  });
});

// ------------------------------------------------------------------------------------------------------------
// Site rows (T11): the model-order branches the generic replay leaves untaken (S4)

const SITE_PREFIX = 'sites/ModelOrderLayerers/externalPorts/NODE_PROMOTION_MODEL_ORDER_';
const SITE_ROWS = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(SITE_PREFIX));

function siteRow(name: string): PhaseRow {
  const row = SITE_ROWS.find((candidate) => candidate.id === `${SITE_PREFIX}${name}`);
  if (row === undefined) {
    throw new Error(`no site row ${SITE_PREFIX}${name}`);
  }
  return row;
}

/** The row's steps run a layerer first, then NODE_PROMOTION: both are injected. */
function replaySite(row: PhaseRow): Expected {
  const graph = runSteps(row, {
    createProcessor(name) {
      if (name !== PROCESSOR_NAME) {
        throw new Error(`unexpected processor ${name}`);
      }
      return new NodePromotion();
    },
    createPhase(phase, strategy) {
      if (phase === 'P2_LAYERING' && strategy === 'LONGEST_PATH_SOURCE') {
        return new LongestPathSourceLayerer();
      }
      if (phase === 'P2_LAYERING' && strategy === 'LONGEST_PATH') {
        return new LongestPathLayerer();
      }
      throw new Error(`unexpected phase ${phase}/${strategy}`);
    },
  });
  return phaseDump(graph, importRow(row).importDump);
}

describe('NodePromotion model order (site rows)', () => {
  // oracle: sites/ModelOrderLayerers/externalPorts/NODE_PROMOTION_MODEL_ORDER_LEFT_TO_RIGHT; NodePromotion.java:396
  // (EXTERNAL_PORT dummies have no MODEL_ORDER: not candidates; the comparators at :74 return 0 for them)
  it('promotes left to right around nodes without a model order', () => {
    const actual = replaySite(siteRow('LEFT_TO_RIGHT'));
    expect(actual.layers).toEqual([
      ['g0/n0'],
      ['g0/n2'],
      ['g0/n3'],
      ['g0/n4'],
      ['g0/n1', 'g0/n6', 'g0/n7', 'g0/n5', 'g0/n8'],
    ]);
    expect(actual.layerless).toEqual([]);
  });

  // oracle: sites/ModelOrderLayerers/externalPorts/NODE_PROMOTION_MODEL_ORDER_RIGHT_TO_LEFT; NodePromotion.java:396
  // (comparator :87 and the minimal-key test at :402-403 for the opposite direction)
  it('promotes right to left around nodes without a model order', () => {
    const actual = replaySite(siteRow('RIGHT_TO_LEFT'));
    expect(actual.layers).toEqual([
      ['g0/n0'],
      ['g0/n2'],
      ['g0/n3', 'g0/n4', 'g0/n8'],
      ['g0/n5'],
      ['g0/n6'],
      ['g0/n7'],
      ['g0/n1'],
    ]);
    expect(actual.layerless).toEqual([]);
  });

  // J: firstEdge on an empty iterable is Iterator.next() on an exhausted iterator (NodePromotion.java:485)
  it('throws NoSuchElementException when a label node of the next layer has no incoming edge', () => {
    const graph = new LGraph();
    const [a] = withModelOrder(graph, [5]) as [LNode];
    const label = addNode(graph, NodeType.LABEL);
    layered([[a], [label]], graph);
    expect(() => {
      run(graph, NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT);
    }).toThrow(NoSuchElementException);
  });
});
