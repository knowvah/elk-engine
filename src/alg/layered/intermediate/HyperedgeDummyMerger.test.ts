// SPDX-License-Identifier: EPL-2.0
// Proof of HyperedgeDummyMerger (mission 7e, T5): every row that stops at `HYPEREDGE_DUMMY_MERGER`, the `P4`/`BRANDES_KOEPF` rows of the hyperedge levels (the merger inside a BK prefix) and the merger scenarios replayed with the full plan built from the real enums
// (`IntermediateProcessorStrategy`, the phase strategies) and the routers injected for `P5_EDGE_ROUTING`
// (`PolylineEdgeRouter` for POLYLINE, `OrthogonalEdgeRouter` for ORTHOGONAL). Expectations come only from the rows and the Java (L4, AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { compareRouting, compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingPrefix, runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { OrthogonalEdgeRouter } from '../p5edges/OrthogonalEdgeRouter.js';
import { PolylineEdgeRouter } from '../p5edges/PolylineEdgeRouter.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { HyperedgeDummyMerger } from './HyperedgeDummyMerger.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const STOP = 'HYPEREDGE_DUMMY_MERGER';
const SCENARIO_PREFIX = 'scenarios/HyperedgeDummyMerger/';

/** The stop of a `models` row id `models/<model>/<level>/<stop>/<variant>`. */
const stopOf = (row: RoutingRow): string | undefined => row.id.split('/')[3];

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return IntermediateProcessorStrategy.valueOf(name).create();
  },
  createPhase(phase, strategy): ILayoutProcessor<LGraph> {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case 'P4_NODE_PLACEMENT':
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        // P5_EDGE_ROUTING: the EdgeRouterFactory arm is T10's; the routers under test are injected
        expect(phase).toBe(ROUTING_PHASE);
        expect(['POLYLINE', 'ORTHOGONAL']).toContain(strategy);
        return strategy === 'POLYLINE' ? new PolylineEdgeRouter() : new OrthogonalEdgeRouter();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** The rows that prove the merger: its stop, the `P4` stop of the hyperedge levels (the merger runs in the BK prefix), its scenarios. */
const rows: RoutingRow[] = loadRoutingRows(MODELS_FILE, STEPS_FILE)
  .filter(isGeometryRow)
  .filter(
    (row) =>
      stopOf(row) === STOP ||
      (stopOf(row) === 'P4' && row.prefix!.includes(STOP)) ||
      row.id.startsWith(SCENARIO_PREFIX),
  );

function replay(row: RoutingRow): LGraph {
  return row.steps === null ? runRoutingPrefix(row, factories) : runRoutingSteps(row, factories);
}

/** The rows by group, for the pinned inventory. */
function tally(selected: readonly RoutingRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of selected) {
    const key = row.group;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

describe('HyperedgeDummyMerger (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(tally(rows)).toEqual({ models: 48, scenarios: 3 });
  });

  for (const row of rows) {
    it(`replays ${row.id}`, () => {
      const graph = replay(row);
      const actual = routingDump(graph, importRow(row).importDump);
      expect(compareRouting(actual, row.expected)).toEqual([]);
      if (row.expected.dump !== undefined) {
        expect(compareRoutingFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
      }
    });
  }
});

/** The model rows whose graph the merger changes (the other rows hold no mergeable adjacent dummies). */
const MERGING_ROWS = [
  'models/hyperedge_merging-hyperedges01/root/HYPEREDGE_DUMMY_MERGER/default',
  'models/hyperedge_merging-inverted_ports/root/HYPEREDGE_DUMMY_MERGER/default',
  'models/hyperedge_merging-unequal_src_tgt/root/HYPEREDGE_DUMMY_MERGER/default',
] as const;

describe('HyperedgeDummyMerger (the rows are not vacuous)', () => {
  it.each(MERGING_ROWS.map((id) => [id] as const))('the state without the merger differs from the row %s', (id) => {
    const row = rows.find((r) => r.id === id)!;
    const without = { ...row, prefix: row.prefix!.filter((entry) => entry !== STOP) };
    const before = routingDump(runRoutingPrefix(without, factories), importRow(row).importDump);
    expect(compareRouting(before, row.expected).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// R8: dfs (HyperedgeDummyMerger.java:238, self-calls :243,:250) as a loop, against its verbatim recursive twin

const MERGER = 'HYPEREDGE_DUMMY_MERGER';
const DEEP_CHAIN_DUMMIES = 2500; // two ports each: a 5,000-port chain
const SHALLOW_CHAIN_DUMMIES = 100;

/** The private `identifyHyperedges` of the port (it calls the loop `dfs`), read through a structural cast. */
interface Identifying {
  identifyHyperedges(graph: LGraph): void;
}

/** The verbatim Java `dfs` (recursion over the connected ports and over the ports of a long edge dummy). */
function dfsRecursive(p: LPort, index: number): void {
  p.id = index;
  // follow edges connected to the same port
  for (const p2 of p.getConnectedPorts()) {
    if (p2.id === -1) {
      dfsRecursive(p2, index);
    }
  }
  // follow edges connected to the same long edge dummy
  if (p.getNode()!.getType() === NodeType.LONG_EDGE) {
    for (const p2 of p.getNode()!.getPorts()) {
      if (p2 !== p && p2.id === -1) {
        dfsRecursive(p2, index);
      }
    }
  }
}

/** The Java `identifyHyperedges` with the recursive `dfs`. */
function identifyHyperedgesRecursive(lGraph: LGraph): void {
  const ports = lGraph
    .getLayers()
    .flatMap((l) => l.getNodes())
    .flatMap((n) => n.getPorts());
  ports.forEach((p) => {
    p.id = -1;
  });
  let index = 0;
  for (const p of ports) {
    if (p.id === -1) {
      dfsRecursive(p, index++);
    }
  }
}

/** Every port of the graph in layer, node, port order. */
const portsOf = (graph: LGraph): LPort[] =>
  graph
    .getLayers()
    .flatMap((l) => l.getNodes())
    .flatMap((n) => n.getPorts());

/** What an identification did: every write to a port's `id` in order (port position, value), and the final ids. */
interface Identification {
  readonly writes: ReadonlyArray<readonly [number, number]>;
  readonly ids: readonly number[];
}

/** Runs `identify` on the graph and records the writes to the ports' `id` fields (an own accessor per port). */
function identification(graph: LGraph, identify: (g: LGraph) => void): Identification {
  const ports = portsOf(graph);
  const position = new Map(ports.map((p, i) => [p, i] as const));
  const writes: Array<readonly [number, number]> = [];
  for (const port of ports) {
    let value = port.id;
    Object.defineProperty(port, 'id', {
      configurable: true,
      enumerable: true,
      get: () => value,
      set: (next: number) => {
        value = next;
        writes.push([position.get(port)!, next]);
      },
    });
  }
  identify(graph);
  const ids = ports.map((p) => p.id);
  for (const port of ports) {
    Object.defineProperty(port, 'id', { configurable: true, enumerable: true, writable: true, value: port.id });
  }
  return { writes, ids };
}

const identifyWithLoop = (graph: LGraph): void =>
  (new HyperedgeDummyMerger() as unknown as Identifying).identifyHyperedges(graph);

/** The graph of a row right before the merger runs (the row's plan up to, and without, the merger). */
function graphBeforeMerger(row: RoutingRow): LGraph {
  if (row.steps === null) {
    const prefix = row.prefix!.slice(0, row.prefix!.indexOf(MERGER));
    return runRoutingPrefix({ ...row, prefix }, factories);
  }
  const end = row.steps.findIndex(([op, arg]) => op === 'runProcessor' && arg === MERGER);
  return runRoutingSteps({ ...row, steps: row.steps.slice(0, end).filter(([op]) => op !== 'dump') }, factories);
}

/** A chain of long edge dummies, one per layer, each with an input and an output port, the outputs wired to the next inputs. */
function dummyChain(dummies: number): LGraph {
  const graph = new LGraph();
  let previousOut: LPort | null = null;
  for (let i = 0; i < dummies; i++) {
    const node = addNode(graph, NodeType.LONG_EDGE);
    node.setLayer(addLayer(graph));
    const input = addPort(node, PortSide.WEST);
    const output = addPort(node, PortSide.EAST);
    if (previousOut !== null) {
      connect(previousOut, input);
    }
    previousOut = output;
  }
  return graph;
}

describe('HyperedgeDummyMerger.dfs (the loop against its recursive twin)', () => {
  it('visits the ports and sets the indices in the order of the recursion on every row of the stop', () => {
    expect(rows).toHaveLength(51);
    for (const row of rows) {
      const graph = graphBeforeMerger(row);
      const loop = identification(graph, identifyWithLoop);
      const twin = identification(graph, identifyHyperedgesRecursive);
      expect({ id: row.id, ...loop }).toEqual({ id: row.id, ...twin });
      // the identification is not vacuous: it numbers every port
      expect(loop.ids.every((id) => id >= 0)).toBe(true);
    }
  });

  it(`a ${String(SHALLOW_CHAIN_DUMMIES)}-dummy chain: one hyperedge, loop and twin agree`, () => {
    const loop = identification(dummyChain(SHALLOW_CHAIN_DUMMIES), identifyWithLoop);
    const twin = identification(dummyChain(SHALLOW_CHAIN_DUMMIES), identifyHyperedgesRecursive);
    expect(loop).toEqual(twin);
    expect(new Set(loop.ids)).toEqual(new Set([0]));
  });

  it(`a ${String(DEEP_CHAIN_DUMMIES * 2)}-port chain: the loop does not overflow and equals the twin`, () => {
    const loop = identification(dummyChain(DEEP_CHAIN_DUMMIES), identifyWithLoop);
    expect(loop.ids).toHaveLength(DEEP_CHAIN_DUMMIES * 2);
    expect(new Set(loop.ids)).toEqual(new Set([0]));
    let twin: Identification | null = null;
    try {
      twin = identification(dummyChain(DEEP_CHAIN_DUMMIES), identifyHyperedgesRecursive);
    } catch (e) {
      // the recursive twin itself overflows the stack at this depth; the port must not (7d precedent, N6)
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(loop).toEqual(twin);
    }
  });

  it('process leaves a chain with one dummy per layer alone (no adjacent dummies to merge)', () => {
    const graph = dummyChain(SHALLOW_CHAIN_DUMMIES);
    const layerSizes = (): number[] => graph.getLayers().map((layer) => layer.getNodes().length);
    const before = layerSizes();
    new HyperedgeDummyMerger().process(graph, new NullElkProgressMonitor());
    expect(layerSizes()).toEqual(before);
  });
});

describe('HyperedgeDummyMerger.process (the Java NoSuchElementException)', () => {
  it('throws when two adjacent long edge dummies have no ports (`getPorts().iterator().next()` of an empty list)', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    addNode(graph, NodeType.LONG_EDGE).setLayer(layer);
    addNode(graph, NodeType.LONG_EDGE).setLayer(layer);
    expect(() => new HyperedgeDummyMerger().process(graph, new NullElkProgressMonitor())).toThrow(
      NoSuchElementException,
    );
  });
});
