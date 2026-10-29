// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump, type Expected } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { buildTarjanGraph, chainSpec, randomSpec, type TarjanSpec } from '../../../../test/helpers/tarjan-graphs.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { CoffmanGrahamLayerer } from './CoffmanGrahamLayerer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/CoffmanGrahamLayerer/';
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
      expect([phase, strategy]).toEqual(['P2_LAYERING', 'COFFMAN_GRAHAM']);
      layerer = createLayerer();
      return layerer;
    },
  };
  const graph = runSteps(row, factories);
  const dump = phaseDump(graph, importRow(row).importDump);
  return { expected: { ...dump, dump: dumpLGraph(graph) }, layerer: layerer! };
}

describe('CoffmanGrahamLayerer on the oracle rows', () => {
  it('has the dag and the chain row', () => {
    expect(rows.map((row) => row.id)).toEqual([`${ROW_PREFIX}dag`, `${ROW_PREFIX}chain`]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const { expected } = replay(row, () => LayeringStrategy.COFFMAN_GRAHAM.create());
    expect(compareExpected(expected, row.expected)).toEqual([]);
    expect(compareFullDump(expected, row.expected)).toEqual([]);
  });
});

describe('CoffmanGrahamLayerer configuration', () => {
  it('declares the edge reverser before P1 and the layer constraint processors before P2 and P3', () => {
    const configuration = new CoffmanGrahamLayerer().getLayoutProcessorConfiguration(new LGraph());
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

/** The private state and the recursive method the twin below reaches into (B8 twin of `dfs`, Java `:279`). */
interface CoffmanGrahamInternals {
  dfs(start: LNode, v: LNode): void;
  nodeMark: boolean[];
  edgeMark: boolean[];
  topoOrd: number[];
}

const internalsOf = (layerer: unknown): CoffmanGrahamInternals => layerer as CoffmanGrahamInternals;

/** Verbatim recursive transcription of `CoffmanGrahamLayerer.dfs` (Java `:279-295`). */
function recursiveDfs(this: CoffmanGrahamInternals, start: LNode, v: LNode): void {
  if (this.nodeMark[v.id]) {
    return;
  }

  for (const out of v.getOutgoingEdges()) {
    const w = out.getTarget()!.getNode()!;
    for (const transitive of w.getIncomingEdges()) {
      if (transitive.getSource()!.getNode() === start) {
        this.edgeMark[transitive.id] = true;
      }
    }
    recursiveDfs.call(this, start, w);
  }

  this.nodeMark[v.id] = true;
}

/** A layerer whose transitive reduction search is the recursive twin. */
function withRecursiveDfs(): CoffmanGrahamLayerer {
  const layerer = new CoffmanGrahamLayerer();
  internalsOf(layerer).dfs = recursiveDfs;
  return layerer;
}

/** What `process` leaves in the layerer besides the graph: the marked edges and the topological order. */
function stateOf(layerer: unknown): { edgeMark: boolean[]; topoOrd: number[] } {
  const { edgeMark, topoOrd } = internalsOf(layerer);
  return { edgeMark, topoOrd };
}

describe('CoffmanGrahamLayerer against the recursive twin', () => {
  it.each(rows.map((row) => [row.id, row] as const))('%s: the twin shows the same result and state', (_id, row) => {
    const port = replay(row, () => new CoffmanGrahamLayerer());
    const twin = replay(row, withRecursiveDfs);
    expect(twin.expected).toEqual(port.expected);
    expect(stateOf(twin.layerer)).toEqual(stateOf(port.layerer));
  });

  it.each(Array.from({ length: 30 }, (_, i) => i + 1))(
    'random acyclic graph with transitive edges, seed %i',
    (seed) => {
      const spec = randomSpec(seed, 4 + (seed % 13), 4 + (seed % 31), 0);
      const acyclic = { ...spec, edges: spec.edges.filter(([s, t]) => s < t) };
      expect(runSpec(new CoffmanGrahamLayerer(), acyclic)).toEqual(runSpec(withRecursiveDfs(), acyclic));
    },
  );

  it('5,000-node chain: dfs from the first node does not overflow in the port and equals the twin', () => {
    // `process` on this chain is quadratic in the Java (transitiveReduction starts one dfs per node), so the deep
    // call is made directly: dfs(n0, n1) descends the whole chain
    const deepDfs = (layerer: CoffmanGrahamLayerer): { nodeMark: boolean[]; edgeMark: boolean[] } => {
      const built = buildTarjanGraph(chainSpec(5000, false));
      built.edges.forEach((edge, i) => (edge.id = i));
      const internals = internalsOf(layerer);
      internals.nodeMark = new Array<boolean>(5000).fill(false);
      internals.edgeMark = new Array<boolean>(built.edges.length).fill(false);
      internals.dfs(built.nodes[0]!, built.nodes[1]!);
      return { nodeMark: internals.nodeMark, edgeMark: internals.edgeMark };
    };
    const port = deepDfs(new CoffmanGrahamLayerer());
    expect(port.nodeMark.slice(1).every(Boolean)).toBe(true);
    expect(port.nodeMark[0]).toBe(false);
    expect(port.edgeMark.some(Boolean)).toBe(false);
    let twin: ReturnType<typeof deepDfs> | null = null;
    try {
      twin = deepDfs(withRecursiveDfs());
    } catch (e) {
      // the recursive twin itself overflows the interpreter's stack under --jitless (AC6); the port must not
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(port).toEqual(twin);
    }
  });
});

/** The layer index (counted from the bottom, `layers.length - 1 - index` is the top index) and state of a run. */
function runSpec(
  layerer: CoffmanGrahamLayerer,
  spec: TarjanSpec,
): { layers: number[]; layerless: number; edgeMark: boolean[]; topoOrd: number[] } {
  const built = buildTarjanGraph(spec);
  run(layerer, built.graph);
  const layers = built.graph.getLayers();
  const { edgeMark, topoOrd } = stateOf(layerer);
  return {
    layers: built.nodes.map((node) => layers.length - 1 - layers.indexOf(node.getLayer()!)),
    layerless: built.graph.getLayerlessNodes().length,
    edgeMark,
    topoOrd,
  };
}

describe('CoffmanGrahamLayerer structure', () => {});

/** The `sites/` rows recorded for the branches the generic replay leaves untaken (T11). */
const siteRows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith('sites/'));

function siteRow(id: string): PhaseRow {
  const row = siteRows.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no site row ${id}`);
  }
  return row;
}

describe('CoffmanGrahamLayerer on the site rows', () => {
  it('returns early on a graph without nodes', () => {
    // oracle: sites/Layerers/emptyGraph/COFFMAN_GRAHAM; CoffmanGrahamLayerer.java:78
    const result = replay(siteRow('sites/Layerers/emptyGraph/COFFMAN_GRAHAM'), () =>
      LayeringStrategy.COFFMAN_GRAHAM.create(),
    ).expected;
    expect(result.layers).toEqual([]);
    expect(result.layerless).toEqual([]);
    expect(result.changed).toEqual([]);
  });

  it('orders sinks with equal predecessor positions by their topological lists', () => {
    // oracle: sites/CoffmanGrahamLayerer/topoTies; CoffmanGrahamLayerer.java:233-245
    const result = replay(siteRow('sites/CoffmanGrahamLayerer/topoTies'), () =>
      LayeringStrategy.COFFMAN_GRAHAM.create(),
    ).expected;
    expect(result.layers).toEqual([['g0/n1', 'g0/n0'], ['g0/n2'], ['g0/n5', 'g0/n4', 'g0/n3']]);
    expect(result.layerless).toEqual([]);
    expect(result.changed).toEqual([]);
  });
});
