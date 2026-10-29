// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump, type Expected } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { buildTarjanGraph, chainSpec, randomSpec, type TarjanSpec } from '../../../../test/helpers/tarjan-graphs.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LPort } from '../graph/LPort.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NetworkSimplexLayerer } from './NetworkSimplexLayerer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/NetworkSimplexLayerer/';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX));

interface Replayed {
  readonly expected: Expected;
  readonly layerer: ILayoutPhase<LayeredPhases, LGraph>;
}

/** Interprets the row's steps with `createLayerer` as the P2 phase and dumps the result. */
function replay(row: PhaseRow, createLayerer: () => ILayoutPhase<LayeredPhases, LGraph>): Replayed {
  let layerer: ILayoutPhase<LayeredPhases, LGraph> | null = null;
  const factories: Factories = {
    createProcessor: (name) => {
      throw new Error(`row ${row.id}: unexpected processor ${name}`);
    },
    createPhase: (phase, strategy) => {
      expect([phase, strategy]).toEqual(['P2_LAYERING', 'NETWORK_SIMPLEX']);
      layerer = createLayerer();
      return layerer;
    },
  };
  const graph = runSteps(row, factories);
  const dump = phaseDump(graph, importRow(row).importDump);
  return { expected: { ...dump, dump: dumpLGraph(graph) }, layerer: layerer! };
}

describe('NetworkSimplexLayerer on the oracle rows', () => {
  it('has the dag and the chain row', () => {
    expect(rows.map((row) => row.id)).toEqual([`${ROW_PREFIX}dag`, `${ROW_PREFIX}chain`]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const { expected } = replay(row, () => LayeringStrategy.NETWORK_SIMPLEX.create());
    expect(compareExpected(expected, row.expected)).toEqual([]);
    expect(compareFullDump(expected, row.expected)).toEqual([]);
  });
});

describe('NetworkSimplexLayerer configuration', () => {
  it('declares the edge reverser before P1 and the layer constraint processors before P2 and P3', () => {
    const configuration = new NetworkSimplexLayerer().getLayoutProcessorConfiguration(new LGraph());
    const before = (phase: LayeredPhases): unknown[] => [...configuration.processorsBefore(phase)];
    expect(before(LayeredPhases.P1_CYCLE_BREAKING)).toEqual([
      IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER,
    ]);
    expect(before(LayeredPhases.P2_LAYERING)).toEqual([IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR]);
    expect(before(LayeredPhases.P3_NODE_ORDERING)).toEqual([
      IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR,
    ]);
  });
});

/** Runs `layerer` on `graph` with a null monitor. */
function run(layerer: ILayoutPhase<LayeredPhases, LGraph>, graph: LGraph): void {
  layerer.process(graph, new NullElkProgressMonitor());
}

/** The private state and methods the twin below reaches into (B8 twin of `connectedComponentsDFS`, Java `:153`). */
interface NetworkSimplexInternals {
  connectedComponentsDFS(node: LNode): void;
  connectedComponents(nodes: LNode[]): LNode[][];
  getOpposite(port: LPort, edge: LEdge): LPort;
  nodeVisited: boolean[];
  componentNodes: LNode[];
}

const internalsOf = (layerer: NetworkSimplexLayerer): NetworkSimplexInternals =>
  layerer as unknown as NetworkSimplexInternals;

/** Verbatim recursive transcription of `NetworkSimplexLayerer.connectedComponentsDFS` (Java `:153-169`). */
function recursiveDfs(this: NetworkSimplexInternals, node: LNode): void {
  this.nodeVisited[node.id] = true;

  // node is part of the current connected component
  this.componentNodes.push(node);

  // continue with next nodes, if not already visited
  for (const port of node.getPorts()) {
    for (const edge of port.getConnectedEdges()) {
      const opposite = this.getOpposite(port, edge).getNode()!;
      if (!this.nodeVisited[opposite.id]) {
        recursiveDfs.call(this, opposite);
      }
    }
  }
}

/** A layerer whose component search is the recursive twin. */
function withRecursiveDfs(): NetworkSimplexLayerer {
  const layerer = new NetworkSimplexLayerer();
  internalsOf(layerer).connectedComponentsDFS = recursiveDfs;
  return layerer;
}

describe('NetworkSimplexLayerer against the recursive twin', () => {
  it.each(rows.map((row) => [row.id, row] as const))('%s: the twin shows the same result', (_id, row) => {
    const port = replay(row, () => new NetworkSimplexLayerer()).expected;
    expect(replay(row, withRecursiveDfs).expected).toEqual(port);
  });

  it.each(Array.from({ length: 30 }, (_, i) => i + 1))('random graph with several components, seed %i', (seed) => {
    const spec = randomSpec(seed, 4 + (seed % 17), 2 + (seed % 9), 0);
    const acyclic = { ...spec, edges: spec.edges.filter(([s, t]) => s < t) };
    expect(layerIndices(new NetworkSimplexLayerer(), acyclic)).toEqual(layerIndices(withRecursiveDfs(), acyclic));
  });

  it('5,000-node chain: no stack overflow in the port, layers equal the twin', () => {
    const spec = chainSpec(5000, false);
    const port = layerIndices(new NetworkSimplexLayerer(), spec);
    expect(port.layers).toEqual(Array.from({ length: 5000 }, (_, i) => i));
    expect(port.layerless).toBe(0);
    let twin: ReturnType<typeof layerIndices> | null = null;
    try {
      twin = layerIndices(withRecursiveDfs(), spec);
    } catch (e) {
      // the recursive twin itself overflows the interpreter's stack under --jitless (AC6); the port must not
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(port).toEqual(twin);
    }
  });
});

/** Layer index of every node of a built spec after `layerer` ran (node ids are overwritten by the layerer). */
function layerIndices(layerer: NetworkSimplexLayerer, spec: TarjanSpec): { layers: number[]; layerless: number } {
  const built = buildTarjanGraph(spec);
  run(layerer, built.graph);
  const layers = built.graph.getLayers();
  return {
    layers: built.nodes.map((node) => layers.indexOf(node.getLayer()!)),
    layerless: built.graph.getLayerlessNodes().length,
  };
}

describe('NetworkSimplexLayerer structure', () => {
  it('rejects an edge that is not connected to the port', () => {
    const graph = new LGraph();
    const [a, b, c] = [0, 1, 2].map(() => addNode(graph));
    const edge = connect(addPort(a!), addPort(b!));
    const stranger = addPort(c!);
    expect(() => internalsOf(new NetworkSimplexLayerer()).getOpposite(stranger, edge)).toThrow(
      new IllegalArgumentException('Input edge is not connected to the input port.'),
    );
  });
});

/** The `sites/` rows recorded for the branches the generic replay leaves untaken (T11). */
const siteRows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith('sites/'));

function siteRow(id: string): PhaseRow {
  const row = siteRows.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no site row ${id}`);
  }
  return row;
}

describe('NetworkSimplexLayerer on the site rows', () => {
  it('returns early on a graph without nodes', () => {
    // oracle: sites/Layerers/emptyGraph/NETWORK_SIMPLEX; NetworkSimplexLayerer.java:251
    const result = replay(siteRow('sites/Layerers/emptyGraph/NETWORK_SIMPLEX'), () =>
      LayeringStrategy.NETWORK_SIMPLEX.create(),
    ).expected;
    expect(result.layers).toEqual([]);
    expect(result.layerless).toEqual([]);
    expect(result.changed).toEqual([]);
  });

  it('leaves a self-loop out of the network', () => {
    // oracle: sites/Layerers/selfLoop/NETWORK_SIMPLEX; NetworkSimplexLayerer.java:200
    const result = replay(siteRow('sites/Layerers/selfLoop/NETWORK_SIMPLEX'), () =>
      LayeringStrategy.NETWORK_SIMPLEX.create(),
    ).expected;
    expect(result.layers).toEqual([['g0/n0'], ['g0/n1'], ['g0/n2'], ['g0/n3']]);
    expect(result.layerless).toEqual([]);
    expect(result.changed).toEqual([]);
  });
});
