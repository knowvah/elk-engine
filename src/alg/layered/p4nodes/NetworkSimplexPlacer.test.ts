// SPDX-License-Identifier: EPL-2.0
// Proof of NetworkSimplexPlacer (mission 7d, T7): every row of layered-placement.json whose stop is
// `P4_NODE_PLACEMENT NETWORK_SIMPLEX` (the 75 pipeline rows and the 17 step rows, the flexibility and favor-straight
// variants included), replayed with the placer injected through `Factories`. Expectations come only from the rows and
// the Java (L4, AD-13). The `NODE_PLACEMENT_REPEATER` rows belong to T4/T8. The `follow` twin (N6) runs inside the
// injected placer on the graph the placer receives, so it covers the graph of every row.
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { LGraph } from '../graph/LGraph.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LNode } from '../graph/LNode.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { HierarchicalPortDummySizeProcessor } from '../intermediate/HierarchicalPortDummySizeProcessor.js';
import { InLayerConstraintProcessor } from '../intermediate/InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from '../intermediate/InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LabelAndNodeSizeProcessor } from '../intermediate/LabelAndNodeSizeProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { LayerSweepCrossingMinimizer } from '../p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import {
  comparePlacement,
  comparePlacementFullDump,
} from '../../../../test/helpers/layered-placement-replay-compare.js';
import { placementDump } from '../../../../test/helpers/layered-placement-replay-dump.js';
import { runPlacementPrefix } from '../../../../test/helpers/layered-placement-replay-ops.js';
import { loadPlacementRows, type PlacementRow } from '../../../../test/helpers/layered-placement-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { NetworkSimplexPlacer } from './NetworkSimplexPlacer.js';
import { JUNCTION, VISITED } from './NetworkSimplexPlacerConstants.js';
import { Path } from './NetworkSimplexPlacerPath.js';
import { follow, getNodeState, identifyPaths, markEdgeCrossings } from './NetworkSimplexPlacerPaths.js';
import { NetworkSimplexPlacerState } from './NetworkSimplexPlacerState.js';
import { isHandledEdge } from './NetworkSimplexPlacerWeights.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const NETWORK_SIMPLEX = 'NETWORK_SIMPLEX';
const DEEP_CHAIN_LENGTH = 5000;

const PIPELINE_ROWS: readonly string[] = [
  'models/ptolemy-multicoreexecution/N2/P4/NETWORK_SIMPLEX',
  'models/ptolemy-multicoreexecution/N8/P4/NETWORK_SIMPLEX',
  'models/ptolemy-htvq4/N7/P4/NETWORK_SIMPLEX',
  'models/ptolemy-producer/root/P4/NETWORK_SIMPLEX',
  'models/ptolemy-producer/root/P4/favor-straight-edges-false-NETWORK_SIMPLEX',
  'models/ptolemy-producer/root/P4/flex-PORT_POSITION',
  'models/ptolemy-producer/root/P4/flex-PORT_POSITION-recompute',
  'models/ptolemy-producer/root/P4/flex-NODE_SIZE_WHERE_SPACE_PERMITS',
  'models/ptolemy-producer/root/P4/flex-NODE_SIZE_WHERE_SPACE_PERMITS-recompute',
  'models/ptolemy-producer/root/P4/flex-NODE_SIZE',
  'models/ptolemy-producer/root/P4/flex-NODE_SIZE-recompute',
  'models/layer_constraints-01/root/P4/NETWORK_SIMPLEX',
  'models/layer_constraints-02/root/P4/NETWORK_SIMPLEX',
  'models/layer_constraints-03/root/P4/NETWORK_SIMPLEX',
  'models/layer_constraints-emptyLayerFirst/root/P4/NETWORK_SIMPLEX',
  'models/layer_constraints-emptyLayerLast/root/P4/NETWORK_SIMPLEX',
  'models/layer_constraints-emptyLayerMid/root/P4/NETWORK_SIMPLEX',
  'models/partitioning-nonConsecutivePartitions/root/P4/NETWORK_SIMPLEX',
  'models/partitioning-partitions01/root/P4/NETWORK_SIMPLEX',
  'models/partitioning-partitions02/root/P4/NETWORK_SIMPLEX',
  'models/ticket-656/root/P4/NETWORK_SIMPLEX',
  'models/north_south_ports-linear_segments_cycle/root/P4/NETWORK_SIMPLEX',
  'models/north_south_ports-north_multiple/root/P4/NETWORK_SIMPLEX',
  'models/north_south_ports-north_south_fixed_side/root/P4/NETWORK_SIMPLEX',
  'models/north_south_ports-nsp1/root/P4/NETWORK_SIMPLEX',
  'models/north_south_ports-nsp2/root/P4/NETWORK_SIMPLEX',
  'models/north_south_ports-nsp3/root/P4/NETWORK_SIMPLEX',
  'models/north_south_ports-south_multiple/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/favor-straight-edges-false-NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/flex-PORT_POSITION',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/flex-PORT_POSITION-recompute',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/flex-NODE_SIZE_WHERE_SPACE_PERMITS',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/flex-NODE_SIZE_WHERE_SPACE_PERMITS-recompute',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/flex-NODE_SIZE',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/flex-NODE_SIZE-recompute',
  'models/node_placement-bk-classes-classes_leftup/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_rightdown/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_rightup/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_two_leftdown/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_two_leftup/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_two_rightdown/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_two_rightdown_surrounded/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_two_rightup/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-classes-classes_two_samesize/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-straightness-severalEdges/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-straightness-straightEdgesLeft/c1/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-straightness-straightEdgesLeft/c2/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-straightness-straightEdgesLeft/c3/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-straightness-straightEdgesLeft/c4/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-straightness-straightEdgesRight/c1/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-straightness-straightEdgesRight/c2/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-straightness-straightEdgesRight/c3/P4/NETWORK_SIMPLEX',
  'models/node_placement-bk-straightness-straightEdgesRight/c4/P4/NETWORK_SIMPLEX',
  'models/node_placement-compact-unbalanced/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-flexible_ports-graph01/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-flexible_ports-graph01/root/P4/favor-straight-edges-false-NETWORK_SIMPLEX',
  'models/node_placement-flexible_ports-graph01/root/P4/flex-PORT_POSITION',
  'models/node_placement-flexible_ports-graph01/root/P4/flex-PORT_POSITION-recompute',
  'models/node_placement-flexible_ports-graph01/root/P4/flex-NODE_SIZE_WHERE_SPACE_PERMITS',
  'models/node_placement-flexible_ports-graph01/root/P4/flex-NODE_SIZE_WHERE_SPACE_PERMITS-recompute',
  'models/node_placement-flexible_ports-graph01/root/P4/flex-NODE_SIZE',
  'models/node_placement-flexible_ports-graph01/root/P4/flex-NODE_SIZE-recompute',
  'models/node_placement-flexible_ports-graph02/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-flexible_ports-graph03/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-flexible_ports-graph03/root/P4/favor-straight-edges-false-NETWORK_SIMPLEX',
  'models/node_placement-flexible_ports-graph03/root/P4/flex-PORT_POSITION',
  'models/node_placement-flexible_ports-graph03/root/P4/flex-PORT_POSITION-recompute',
  'models/node_placement-flexible_ports-graph03/root/P4/flex-NODE_SIZE_WHERE_SPACE_PERMITS',
  'models/node_placement-flexible_ports-graph03/root/P4/flex-NODE_SIZE_WHERE_SPACE_PERMITS-recompute',
  'models/node_placement-flexible_ports-graph03/root/P4/flex-NODE_SIZE',
  'models/node_placement-flexible_ports-graph03/root/P4/flex-NODE_SIZE-recompute',
  'models/node_placement-flexible_ports-graph04/root/P4/NETWORK_SIMPLEX',
  'models/node_placement-flexible_ports-graph04/parent/P4/NETWORK_SIMPLEX',
];

const STEP_ROWS: readonly string[] = [
  'scenarios/p4-network_simplex/long-edges',
  'scenarios/p4-network_simplex/fan',
  'scenarios/p4-network_simplex/port-labels',
  'scenarios/p4-network_simplex/north-south',
  'scenarios/p4-network_simplex/external-chain',
  'scenarios/flexibility/graph-default-ports-port_position',
  'scenarios/flexibility/graph-default-fan-port_position',
  'scenarios/flexibility/node-level-ports-port_position',
  'scenarios/flexibility/node-level-fan-port_position',
  'scenarios/flexibility/graph-default-ports-node_size_where_space_permits',
  'scenarios/flexibility/graph-default-fan-node_size_where_space_permits',
  'scenarios/flexibility/node-level-ports-node_size_where_space_permits',
  'scenarios/flexibility/node-level-fan-node_size_where_space_permits',
  'scenarios/flexibility/graph-default-ports-node_size',
  'scenarios/flexibility/graph-default-fan-node_size',
  'scenarios/flexibility/node-level-ports-node_size',
  'scenarios/flexibility/node-level-fan-node_size',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/NetworkSimplex/inLayerEdges',
  'sites/NetworkSimplex/fractionalAnchor',
  'sites/NetworkSimplex/flexibleLabels/bottom',
  'sites/NetworkSimplex/flexibleLabels/center',
  'sites/NetworkSimplex/flexibleLabels/top',
  'sites/NetworkSimplex/flexiblePorts/unconnected',
  'sites/NetworkSimplex/flexiblePorts/overflow',
  'sites/NetworkSimplex/flexiblePorts/junctionPath',
  'sites/NetworkSimplex/inLayerEdges/westOutput',
  'sites/NetworkSimplex/twoPaths/crossingLeftEnd',
  'sites/NetworkSimplex/twoPaths/crossingLeftEnd/longEdge',
];

/** What the twin saw across the replayed rows (asserted non-vacuous below). */
const twinStats = { graphs: 0, paths: 0, longestPath: 0 };

/** The verbatim recursive Java `follow` (`NetworkSimplexPlacer.java:1248-1265`), the twin of the port's loop. */
function followRecursive(s: NetworkSimplexPlacerState, edge: LEdge, current: LNode, path: Path): Path {
  const other = edge.getOther(current)!;
  path.add(edge);

  // stop criteria
  if (s.nodeState![other.id] === VISITED || s.nodeState![other.id] === JUNCTION || s.crossing![edge.id]) {
    return path;
  }

  // recurse
  s.nodeState![other.id] = VISITED;
  for (const incident of other.getConnectedEdges()) {
    if (!isHandledEdge(incident) || incident === edge) {
      continue;
    }
    return followRecursive(s, incident, other, path);
  }

  return path;
}

/** The verbatim Java `identifyPaths` (`:1233-1246`) over a caller-chosen `follow`. */
function identifyPathsWith(s: NetworkSimplexPlacerState, followFn: typeof follow): Path[] {
  const paths: Path[] = [];
  s.lGraph!.getLayers()
    .flatMap((l) => l.getNodes())
    .filter((n) => s.nodeState![n.id] === JUNCTION)
    .forEach((junction) => {
      for (const e of junction.getConnectedEdges()) {
        if (!isHandledEdge(e)) {
          continue;
        }
        const path = followFn(s, e, junction, new Path());
        if (path.size() > 1) {
          paths.push(path);
        }
      }
    });
  return paths;
}

/** The state the placer's `prepare` and `preferStraightEdges` give `identifyPaths`: ids, node states, crossings. */
function pathState(graph: LGraph): NetworkSimplexPlacerState {
  const s = new NetworkSimplexPlacerState();
  s.lGraph = graph;
  let nodeIdx = 0;
  let edgeIdx = 0;
  for (const layer of graph) {
    for (const node of layer) {
      node.id = nodeIdx++;
      for (const e of node.getOutgoingEdges()) {
        e.id = edgeIdx++;
      }
    }
  }
  s.nodeCount = nodeIdx;
  s.edgeCount = edgeIdx;
  s.nodeState = new Array<number>(nodeIdx).fill(0);
  graph
    .getLayers()
    .flatMap((l) => l.getNodes())
    .forEach((n) => (s.nodeState![n.id] = getNodeState(n)));
  markEdgeCrossings(s);
  return s;
}

const edgeIds = (paths: Path[]): number[][] => paths.map((p) => [...p].map((e) => e.id));

/** Runs the port's loop and the recursive twin on `graph`; the paths and the final node states must be equal. */
function expectFollowTwin(graph: LGraph): { port: number[][]; twin: number[][] } {
  const portState = pathState(graph);
  const port = edgeIds(identifyPaths(portState));
  const twinState = pathState(graph);
  const twin = edgeIds(identifyPathsWith(twinState, followRecursive));
  expect(port).toEqual(twin);
  expect(portState.nodeState).toEqual(twinState.nodeState);
  return { port, twin };
}

/** The placer under test, checking the `follow` twin on the graph it receives before it runs. */
class TwinCheckingPlacer extends NetworkSimplexPlacer {
  override process(layeredGraph: LGraph, progressMonitor: IElkProgressMonitor): void {
    const { port } = expectFollowTwin(layeredGraph);
    twinStats.graphs++;
    twinStats.paths += port.length;
    twinStats.longestPath = Math.max(twinStats.longestPath, ...port.map((p) => p.length));
    super.process(layeredGraph, progressMonitor);
  }
}

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
        return new HierarchicalPortDummySizeProcessor();
      case 'TWO_SIDED_GREEDY_SWITCH':
        return new LayerSweepCrossingMinimizer(CrossMinType.TWO_SIDED_GREEDY_SWITCH);
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case 'P4_NODE_PLACEMENT':
        // T8 wires the enum arm; until then the placer is injected here
        expect(strategy).toBe(NETWORK_SIMPLEX);
        return new TwinCheckingPlacer();
      default:
        throw new Error(`unexpected phase ${phase}`);
    }
  },
};

const allRows = loadPlacementRows(ROWS_FILE);

function rowById(id: string): PlacementRow {
  return allRows.find((candidate) => candidate.id === id)!;
}

/** True when the row stops at `P4_NODE_PLACEMENT NETWORK_SIMPLEX` in a pipeline prefix (`steps` is `null`). */
function isPipelineRow(row: PlacementRow): boolean {
  return row.steps === null && row.prefix?.at(-1) === `P4_NODE_PLACEMENT/${NETWORK_SIMPLEX}`;
}

/** True when the last `runPhase` step is `P4_NODE_PLACEMENT NETWORK_SIMPLEX` and no `runProcessor` follows it. */
function isStepRow(row: PlacementRow): boolean {
  const steps = row.steps;
  if (steps === null || steps === undefined) {
    return false;
  }
  const at = steps.map(([op]) => op).lastIndexOf('runPhase');
  const last = steps[at];
  return (
    last !== undefined &&
    last[1] === 'P4_NODE_PLACEMENT' &&
    last[2] === NETWORK_SIMPLEX &&
    !steps.slice(at + 1).some(([op]) => op === 'runProcessor')
  );
}

function replay(row: PlacementRow): LGraph {
  return isPipelineRow(row) ? runPlacementPrefix(row, factories) : runSteps(row, factories);
}

const FLEXIBILITY_ROWS = STEP_ROWS.filter((id) => id.startsWith('scenarios/flexibility/'));

describe('NetworkSimplexPlacer (oracle rows)', () => {
  beforeAll(() => LayoutMetaDataService.initElkReflect());

  it('finds the recorded pipeline rows', () => {
    expect(allRows.filter(isPipelineRow).map((row) => row.id)).toEqual([...PIPELINE_ROWS]);
  });

  it('finds the recorded step rows', () => {
    expect(allRows.filter(isStepRow).map((row) => row.id)).toEqual([...STEP_ROWS]);
  });

  it('pins the 12 flexibility scenarios and the 5 p4-network_simplex scenarios among the step rows', () => {
    expect(FLEXIBILITY_ROWS).toHaveLength(12);
    expect(STEP_ROWS.filter((id) => id.startsWith('scenarios/p4-network_simplex/'))).toHaveLength(5);
    expect(PIPELINE_ROWS.filter((id) => /\/P4\/(flex-|favor-)/.test(id))).toHaveLength(28);
  });

  it.each([...PIPELINE_ROWS, ...STEP_ROWS].map((id) => [id] as const))('replays %s', (id) => {
    const row = rowById(id);
    const graph = replay(row);
    const actual = placementDump(graph, importRow(row).importDump);
    expect(comparePlacement(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(comparePlacementFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
    }
  });

  it('the flexibility rows carry port and label geometry that the placer produced', () => {
    for (const id of FLEXIBILITY_ROWS) {
      const row = rowById(id);
      expect(Object.keys(row.expected.geometry.ports ?? {}).length).toBeGreaterThan(0);
    }
  });

  it('the twin saw every replayed graph and a non-trivial path', () => {
    expect(twinStats.graphs).toBeGreaterThanOrEqual(PIPELINE_ROWS.length + STEP_ROWS.length);
    expect(twinStats.paths).toBeGreaterThan(0);
    expect(twinStats.longestPath).toBeGreaterThan(1);
  });
});

/** A chain `n0 -> n1 -> ... -> n(length-1)`, one node per layer, east port to west port; both ends are leaves. */
function buildChain(length: number): LGraph {
  const graph = new LGraph();
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
  let previousEast = null;
  for (let i = 0; i < length; i++) {
    const layer = addLayer(graph);
    const node = addNode(graph);
    node.setLayer(layer);
    graph.getLayerlessNodes().pop();
    const west = addPort(node, PortSide.WEST);
    const east = addPort(node, PortSide.EAST);
    if (previousEast !== null) {
      connect(previousEast, west);
    }
    previousEast = east;
  }
  return graph;
}

describe('NetworkSimplexPlacer.follow (N6)', () => {
  it('follows a short chain from one leaf to the other like the twin', () => {
    const { port, twin } = expectFollowTwin(buildChain(6));
    // the walk from the first leaf marks every inner node VISITED, so the second leaf's one-edge path is dropped
    expect(port).toEqual([[0, 1, 2, 3, 4]]);
    expect(twin).toEqual(port);
  });

  it(`${String(DEEP_CHAIN_LENGTH)}-layer chain: no stack overflow in the port, paths equal the twin`, () => {
    const graph = buildChain(DEEP_CHAIN_LENGTH);
    const portState = pathState(graph);
    const port = edgeIds(identifyPaths(portState));
    expect(port).toHaveLength(1);
    expect(port[0]).toEqual(Array.from({ length: DEEP_CHAIN_LENGTH - 1 }, (_, i) => i));
    let twin: number[][] | null = null;
    try {
      twin = edgeIds(identifyPathsWith(pathState(graph), followRecursive));
    } catch (e) {
      // the recursive twin itself may overflow the interpreter's stack under --jitless; the port must not
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(port).toEqual(twin);
    }
  });

  it('stops at a crossing edge and at a visited node like the twin', () => {
    // two crossing edges between two layers: a1-b2 and a2-b1, each node a leaf, so every path has length one
    const graph = new LGraph();
    graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
    const left = addLayer(graph);
    const right = addLayer(graph);
    const make = (layer: typeof left, side: PortSide) => {
      const node = addNode(graph);
      node.setLayer(layer);
      graph.getLayerlessNodes().pop();
      return addPort(node, side);
    };
    const a1 = make(left, PortSide.EAST);
    const a2 = make(left, PortSide.EAST);
    const b1 = make(right, PortSide.WEST);
    const b2 = make(right, PortSide.WEST);
    connect(a1, b2);
    connect(a2, b1);
    const s = pathState(graph);
    expect(s.crossing).toEqual([true, true]);
    expectFollowTwin(graph);
  });
});

describe('NetworkSimplexPlacer (configuration and Path)', () => {
  beforeAll(() => LayoutMetaDataService.initElkReflect());

  it('adds HIERARCHICAL_PORT_POSITION_PROCESSOR before P5 for graphs with external ports only', () => {
    const graph = new LGraph();
    graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
    const placer = new NetworkSimplexPlacer();
    expect(placer.getLayoutProcessorConfiguration(graph)).toBeNull();
    graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.of(GraphProperties.EXTERNAL_PORTS));
    const configuration = placer.getLayoutProcessorConfiguration(graph)!;
    expect([...configuration.processorsBefore(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR,
    ]);
    expect(placer.getLayoutProcessorConfiguration(graph)).toBe(configuration);
  });

  it('Path.orderTwoPath swaps an unordered pair and rejects other sizes', () => {
    const graph = buildChain(3);
    const [first, second] = graph.getLayers().flatMap((l) => l.getNodes().flatMap((n) => [...n.getOutgoingEdges()]));
    const path = new Path();
    path.add(second!);
    path.add(first!);
    path.orderTwoPath();
    expect([path.get(0), path.get(1)]).toEqual([first, second]);
    expect(() => new Path().orderTwoPath()).toThrow('Order only allowed for two paths.');
  });

  it('an empty Path contains no long edge dummy and no flexible node', () => {
    const path = new Path();
    expect(path.containsLongEdgeDummy()).toBe(false);
    expect(path.containsFlexibleNode(() => true)).toBe(false);
  });
});
