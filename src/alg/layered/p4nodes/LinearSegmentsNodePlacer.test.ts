// SPDX-License-Identifier: EPL-2.0
// Proof of LinearSegmentsNodePlacer (mission 7d, T5): every row of layered-placement.json whose last replayed entry is
// `P4_NODE_PLACEMENT/LINEAR_SEGMENTS` (pipeline rows by their prefix, step rows by their last runPhase; the NODE_PLACEMENT_REPEATER
// rows end with the repeater and belong to T4/T8), with the placer injected through `createPhase` (T8 wires the enum
// arm) and the 7d processors injected through `createProcessor`. Expectations come only from the rows and the Java (L4).
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import {
  comparePlacement,
  comparePlacementFullDump,
} from '../../../../test/helpers/layered-placement-replay-compare.js';
import { placementDump } from '../../../../test/helpers/layered-placement-replay-dump.js';
import { runPlacementPrefix } from '../../../../test/helpers/layered-placement-replay-ops.js';
import { loadPlacementRows, type PlacementRow } from '../../../../test/helpers/layered-placement-replay-rows.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { DotDebugUtil } from '../DotDebugUtil.js';
import { JsonDebugUtil } from '../JsonDebugUtil.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { HierarchicalPortDummySizeProcessor } from '../intermediate/HierarchicalPortDummySizeProcessor.js';
import { InLayerConstraintProcessor } from '../intermediate/InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from '../intermediate/InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LabelAndNodeSizeProcessor } from '../intermediate/LabelAndNodeSizeProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { LinearSegmentsNodePlacer } from './LinearSegmentsNodePlacer.js';
import { fillSegment, sortLinearSegments } from './LinearSegmentsNodePlacerCreation.js';
import { LinearSegmentsNodePlacerLinearSegment as LinearSegment } from './LinearSegmentsNodePlacerLinearSegment.js';
import { LinearSegmentsNodePlacerMode as Mode } from './LinearSegmentsNodePlacerMode.js';
import { INPUT_PRIO, OUTPUT_PRIO } from './LinearSegmentsNodePlacerProperties.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const LAST_ENTRY = 'P4_NODE_PLACEMENT/LINEAR_SEGMENTS';

/** The recorded rows, pinned by id so a missing row fails loudly. */
const ROW_IDS: readonly string[] = [
  'models/ptolemy-multicoreexecution/N2/P4/LINEAR_SEGMENTS',
  'models/ptolemy-multicoreexecution/N8/P4/LINEAR_SEGMENTS',
  'models/ptolemy-htvq4/N7/P4/LINEAR_SEGMENTS',
  'models/ptolemy-producer/root/P4/LINEAR_SEGMENTS',
  'models/ptolemy-producer/root/P4/deflection-dampening-0.7',
  'models/layer_constraints-01/root/P4/LINEAR_SEGMENTS',
  'models/layer_constraints-02/root/P4/LINEAR_SEGMENTS',
  'models/layer_constraints-03/root/P4/LINEAR_SEGMENTS',
  'models/layer_constraints-emptyLayerFirst/root/P4/LINEAR_SEGMENTS',
  'models/layer_constraints-emptyLayerLast/root/P4/LINEAR_SEGMENTS',
  'models/layer_constraints-emptyLayerMid/root/P4/LINEAR_SEGMENTS',
  'models/partitioning-nonConsecutivePartitions/root/P4/LINEAR_SEGMENTS',
  'models/partitioning-partitions01/root/P4/LINEAR_SEGMENTS',
  'models/partitioning-partitions02/root/P4/LINEAR_SEGMENTS',
  'models/ticket-656/root/P4/LINEAR_SEGMENTS',
  'models/north_south_ports-linear_segments_cycle/root/P4/LINEAR_SEGMENTS',
  'models/north_south_ports-north_multiple/root/P4/LINEAR_SEGMENTS',
  'models/north_south_ports-north_south_fixed_side/root/P4/LINEAR_SEGMENTS',
  'models/north_south_ports-nsp1/root/P4/LINEAR_SEGMENTS',
  'models/north_south_ports-nsp2/root/P4/LINEAR_SEGMENTS',
  'models/north_south_ports-nsp3/root/P4/LINEAR_SEGMENTS',
  'models/north_south_ports-south_multiple/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/deflection-dampening-0.7',
  'models/node_placement-bk-classes-classes_leftup/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_rightdown/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_rightup/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_two_leftdown/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_two_leftup/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_two_rightdown/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_two_rightdown_surrounded/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_two_rightup/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-classes-classes_two_samesize/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-straightness-severalEdges/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-straightness-straightEdgesLeft/c1/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-straightness-straightEdgesLeft/c2/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-straightness-straightEdgesLeft/c3/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-straightness-straightEdgesLeft/c4/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-straightness-straightEdgesRight/c1/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-straightness-straightEdgesRight/c2/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-straightness-straightEdgesRight/c3/P4/LINEAR_SEGMENTS',
  'models/node_placement-bk-straightness-straightEdgesRight/c4/P4/LINEAR_SEGMENTS',
  'models/node_placement-compact-unbalanced/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-flexible_ports-graph01/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-flexible_ports-graph01/root/P4/deflection-dampening-0.7',
  'models/node_placement-flexible_ports-graph02/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-flexible_ports-graph03/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-flexible_ports-graph03/root/P4/deflection-dampening-0.7',
  'models/node_placement-flexible_ports-graph04/root/P4/LINEAR_SEGMENTS',
  'models/node_placement-flexible_ports-graph04/parent/P4/LINEAR_SEGMENTS',
  'scenarios/p4-linear_segments/long-edges',
  'scenarios/p4-linear_segments/fan',
  'scenarios/p4-linear_segments/port-labels',
  'scenarios/p4-linear_segments/north-south',
  'scenarios/p4-linear_segments/external-chain',
  'scenarios/p4-linear_segments/deflection-dampening',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/LinearSegments/dependencyCycle/firstInLayer',
  'sites/LinearSegments/dependencyCycle/behindNode',
  'sites/LinearSegments/invertedPorts',
  'sites/LinearSegments/straightnessPriority',
];

/** The 7d processors and the placer are injected (T8 wires their enum arms); every other name goes through the enums. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
        return new HierarchicalPortDummySizeProcessor();
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase(phase, strategy) {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        return new LinearSegmentsNodePlacer();
    }
  },
};

/** The entries a row replays, spelled like prefix entries (`NAME` or `PHASE/STRATEGY`). */
function entriesOf(row: PlacementRow): readonly string[] {
  return row.prefix !== null
    ? row.prefix
    : row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase').map((step) => step.slice(1).join('/'));
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows = loadPlacementRows(ROWS_FILE).filter((row) => entriesOf(row).at(-1) === LAST_ENTRY);

function replay(row: PlacementRow): LGraph {
  return row.steps === null ? runPlacementPrefix(row, factories) : runSteps(row, factories);
}

describe('LinearSegmentsNodePlacer (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual([...ROW_IDS]);
  });

  it.each(ROW_IDS.map((id) => [id] as const))('replays %s', (id) => {
    const row = rows.find((candidate) => candidate.id === id)!;
    const graph = replay(row);
    const actual = placementDump(graph, importRow(row).importDump);
    expect(comparePlacement(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(comparePlacementFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
    }
  });
});

describe('LinearSegmentsNodePlacer.getLayoutProcessorConfiguration', () => {
  it('is null without external ports', () => {
    expect(new LinearSegmentsNodePlacer().getLayoutProcessorConfiguration(new LGraph())).toBeNull();
  });

  it('adds HIERARCHICAL_PORT_POSITION_PROCESSOR before P5 for external ports, as one cached configuration', () => {
    const graph = new LGraph();
    graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.of(GraphProperties.EXTERNAL_PORTS));
    const placer = new LinearSegmentsNodePlacer();
    const configuration = placer.getLayoutProcessorConfiguration(graph)!;
    expect([...configuration.processorsBefore(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR,
    ]);
    expect([...configuration.processorsBefore(LayeredPhases.P4_NODE_PLACEMENT)]).toEqual([]);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([]);
    expect(new LinearSegmentsNodePlacer().getLayoutProcessorConfiguration(graph)).toBe(configuration);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// N6: fillSegment (LinearSegmentsNodePlacer.java:466) as a loop, against its verbatim recursive twin

const DEEP_CHAIN_LENGTH = 5000;

/** The verbatim Java `fillSegment` (recursion along a long edge's dummies), the oracle of the loop in the port. */
function fillSegmentRecursive(node: LNode, segment: LinearSegment): boolean {
  const nodeType = node.getType();

  if (node.id >= 0) {
    // The node is already part of another linear segment
    return false;
  } else {
    // Add the node to the given linear segment
    node.id = segment.id;
    segment.nodes.push(node);
  }
  segment.nodeType = nodeType;

  if (nodeType === NodeType.LONG_EDGE || nodeType === NodeType.NORTH_SOUTH_PORT) {
    for (const sourcePort of node.getPorts()) {
      for (const targetPort of sourcePort.getSuccessorPorts()) {
        const targetNode = targetPort.getNode()!;
        const targetNodeType = targetNode.getType();

        if (node.getLayer() !== targetNode.getLayer()) {
          if (targetNodeType === NodeType.LONG_EDGE || targetNodeType === NodeType.NORTH_SOUTH_PORT) {
            if (fillSegmentRecursive(targetNode, segment)) {
              return true;
            }
          }
        }
      }
    }
  }

  return true;
}

/** What `sortLinearSegments`' segment loop leaves behind: each segment's nodes as traversal indices, and the node ids. */
interface FilledSegments {
  readonly segments: readonly (readonly number[])[];
  readonly nodeIds: readonly number[];
  readonly nodeTypes: readonly (string | null)[];
}

function fillAll(graph: LGraph, fill: (node: LNode, segment: LinearSegment) => boolean): FilledSegments {
  const index = new Map<LNode, number>();
  for (const layer of graph) {
    for (const node of layer) {
      node.id = -1;
      index.set(node, index.size);
    }
  }
  const segments: LinearSegment[] = [];
  for (const layer of graph) {
    for (const node of layer) {
      if (node.id < 0) {
        const segment = new LinearSegment();
        segment.id = segments.length;
        fill(node, segment);
        segments.push(segment);
      }
    }
  }
  return {
    segments: segments.map((segment) => segment.nodes.map((node) => index.get(node)!)),
    nodeIds: [...index.keys()].map((node) => node.id),
    nodeTypes: segments.map((segment) => segment.nodeType?.toString() ?? null),
  };
}

/** A chain of `length` LONG_EDGE dummies, one per layer, each connected to the next. */
function longEdgeChain(length: number): LGraph {
  const graph = new LGraph();
  let previousOut = null;
  for (let i = 0; i < length; i++) {
    const node = addNode(graph, NodeType.LONG_EDGE);
    node.setLayer(addLayer(graph));
    const input = addPort(node);
    const output = addPort(node);
    if (previousOut !== null) {
      connect(previousOut, input);
    }
    previousOut = output;
  }
  return graph;
}

describe('LinearSegmentsNodePlacer.fillSegment (N6)', () => {
  it.each(ROW_IDS.map((id) => [id] as const))('the loop equals the recursive twin on the graph of %s', (id) => {
    const graph = replay(rows.find((candidate) => candidate.id === id)!);
    const loop = fillAll(graph, fillSegment);
    const twin = fillAll(graph, fillSegmentRecursive);
    expect(loop.segments.length).toBeGreaterThan(0);
    expect(loop).toEqual(twin);
  });

  it('a long edge of dummies in consecutive layers: the loop equals the twin', () => {
    const loop = fillAll(longEdgeChain(4), fillSegment);
    expect(loop).toEqual(fillAll(longEdgeChain(4), fillSegmentRecursive));
  });

  it('a node that already has an id: the loop returns what the twin returns and changes what it changes', () => {
    const outcome = (fill: (node: LNode, segment: LinearSegment) => boolean): unknown => {
      const first = longEdgeChain(2).getLayers()[0]!.getNodes()[0]!;
      first.id = 7;
      const segment = new LinearSegment();
      return { returned: fill(first, segment), nodes: segment.nodes.length, nodeType: segment.nodeType, id: first.id };
    };
    expect(outcome(fillSegment)).toEqual(outcome(fillSegmentRecursive));
  });

  it('a NORMAL successor, a successor in the same layer and one that has an id: the loop equals the twin', () => {
    const outcome = (fill: (node: LNode, segment: LinearSegment) => boolean): unknown => {
      const graph = new LGraph();
      const layer = addLayer(graph);
      const head = addNode(graph, NodeType.LONG_EDGE);
      head.setLayer(layer);
      const sameLayer = addNode(graph, NodeType.LONG_EDGE);
      sameLayer.setLayer(layer);
      const nextLayer = addLayer(graph);
      const targets = [sameLayer];
      for (const type of [NodeType.NORMAL, NodeType.NORTH_SOUTH_PORT, NodeType.NORTH_SOUTH_PORT]) {
        const target = addNode(graph, type);
        target.setLayer(nextLayer);
        targets.push(target);
      }
      const out = addPort(head);
      for (const target of targets) {
        connect(out, addPort(target));
      }
      const all = [head, ...targets];
      for (const node of all) {
        node.id = -1;
      }
      targets[2]!.id = 5;
      const segment = new LinearSegment();
      segment.id = 3;
      const returned = fill(head, segment);
      return {
        returned,
        members: segment.nodes.map((node) => all.indexOf(node)),
        ids: all.map((node) => node.id),
        nodeType: segment.nodeType,
      };
    };
    expect(outcome(fillSegment)).toEqual(outcome(fillSegmentRecursive));
  });

  it(`a ${String(DEEP_CHAIN_LENGTH)}-layer chain: the loop does not overflow and equals the twin`, () => {
    const loop = fillAll(longEdgeChain(DEEP_CHAIN_LENGTH), fillSegment);
    expect(loop.segments).toEqual([Array.from({ length: DEEP_CHAIN_LENGTH }, (_, i) => i)]);
    expect(new Set(loop.nodeIds)).toEqual(new Set([0]));
    let twin: FilledSegments | null = null;
    try {
      twin = fillAll(longEdgeChain(DEEP_CHAIN_LENGTH), fillSegmentRecursive);
    } catch (e) {
      // the recursive twin itself overflows the interpreter's stack under --jitless (AC6); the port must not
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(loop).toEqual(twin);
    }
  });
});

describe('LinearSegmentsNodePlacerLinearSegment', () => {
  function segmentOf(id: number, count: number): LinearSegment {
    const graph = longEdgeChain(count);
    const segment = new LinearSegment();
    segment.id = id;
    segment.nodes = graph.getLayers().map((layer) => layer.getNodes()[0]!);
    return segment;
  }

  it('defaults like the Java fields', () => {
    const segment = new LinearSegment();
    expect([segment.nodes, segment.id, segment.indexInLastLayer, segment.lastLayer]).toEqual([[], 0, -1, -1]);
    expect([segment.deflection, segment.weight, segment.refSegment, segment.nodeType]).toEqual([0, 0, null, null]);
  });

  it('region follows the reference chain to its end', () => {
    const [a, b, c] = [new LinearSegment(), new LinearSegment(), new LinearSegment()];
    a.refSegment = b;
    b.refSegment = c;
    expect(a.region()).toBe(c);
    expect(c.region()).toBe(c);
  });

  it('split moves the nodes from the given node onward into a new segment with the new id', () => {
    const segment = segmentOf(1, 4);
    const [n0, n1, n2, n3] = segment.nodes as [LNode, LNode, LNode, LNode];
    const tail = segment.split(n2, 9);
    expect(segment.nodes).toEqual([n0, n1]);
    expect(tail.nodes).toEqual([n2, n3]);
    expect([tail.id, n2.id, n3.id]).toEqual([9, 9, 9]);
    expect([n0.id, n1.id]).not.toEqual([9, 9]);
  });

  it('compareTo, equals and hashCode work on the id', () => {
    const a = segmentOf(2, 1);
    const b = segmentOf(5, 1);
    expect(a.compareTo(b)).toBe(-3);
    expect(b.compareTo(a)).toBe(3);
    expect(a.equals(b)).toBe(false);
    expect(a.equals(segmentOf(2, 3))).toBe(true);
    expect(a.equals('ls')).toBe(false);
    expect(b.hashCode()).toBe(5);
  });

  it('toString is "ls" and the node list', () => {
    const segment = segmentOf(0, 2);
    expect(segment.toString()).toBe(`ls[${segment.nodes[0]!.toString()}, ${segment.nodes[1]!.toString()}]`);
    expect(new LinearSegment().toString()).toBe('ls[]');
  });
});

describe('LinearSegmentsNodePlacerMode and the private properties', () => {
  it('names and orders the three modes', () => {
    expect([Mode.FORW_PENDULUM, Mode.BACKW_PENDULUM, Mode.RUBBER].map((mode) => mode.name())).toEqual([
      'FORW_PENDULUM',
      'BACKW_PENDULUM',
      'RUBBER',
    ]);
    expect([Mode.FORW_PENDULUM, Mode.BACKW_PENDULUM, Mode.RUBBER].map((mode) => mode.ordinal())).toEqual([0, 1, 2]);
    expect(Mode.RUBBER.toString()).toBe('RUBBER');
  });

  it('keeps the Java property ids and the default 0 (they appear in the recorded `changed` lists)', () => {
    expect([INPUT_PRIO.getId(), OUTPUT_PRIO.getId()]).toEqual([
      'linearSegments.inputPrio',
      'linearSegments.outputPrio',
    ]);
    expect([INPUT_PRIO.getDefault(), OUTPUT_PRIO.getDefault()]).toEqual([0, 0]);
  });
});

describe('LinearSegmentsNodePlacerCreation with DebugUtil', () => {
  it('logs the segment graph (DOT then JSON) only when the monitor has logging enabled', () => {
    const monitor = new BasicProgressMonitor().withLogging(true);
    const graph = longEdgeChain(2);
    const segments = sortLinearSegments(graph, monitor);
    expect(
      monitor.getLoggedGraphs()!.map((logged) => [logged.getTag(), logged.getGraphType().name(), logged.getGraph()]),
    ).toEqual([
      ['segment graph', 'DOT', DotDebugUtil.createDebugGraphSegments(graph, segments, [[]])],
      ['segment graph', 'JSON', JsonDebugUtil.createDebugGraphSegments(graph, segments, [[]])],
    ]);
    expect(sortLinearSegments(longEdgeChain(2), new NullElkProgressMonitor())).toHaveLength(1);
  });
});
