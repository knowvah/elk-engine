// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { buildTarjanGraph, chainSpec, randomSpec, type TarjanSpec } from '../../../../test/helpers/tarjan-graphs.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { DepthFirstCycleBreaker } from './DepthFirstCycleBreaker.js';

const DEEP_NODES = 5000;
const GENERATED_SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

/**
 * Verbatim recursive transcription of `DepthFirstCycleBreaker.java` (B8 twin): the port replaces the recursion of `dfs`
 * (Java `:133`) by an explicit stack and must show every effect of this recursion.
 */
class RecursiveDepthFirstCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  private visited: boolean[] = [];
  private active: boolean[] = [];
  private edgesToBeReversed: LEdge[] = [];

  getLayoutProcessorConfiguration(
    graph: LGraph,
  ): ReturnType<DepthFirstCycleBreaker['getLayoutProcessorConfiguration']> {
    return new DepthFirstCycleBreaker().getLayoutProcessorConfiguration(graph);
  }

  process(graph: LGraph): void {
    const nodes = graph.getLayerlessNodes();
    const nodeCount = nodes.length;
    const sources: LNode[] = [];
    this.visited = new Array<boolean>(nodeCount).fill(false);
    this.active = new Array<boolean>(nodeCount).fill(false);
    this.edgesToBeReversed = [];
    let index = 0;
    for (const node of nodes) {
      node.id = index;
      if ([...node.getIncomingEdges()].length === 0) {
        sources.push(node);
      }
      index++;
    }
    for (const source of sources) {
      this.dfs(source);
    }
    for (let i = 0; i < nodeCount; i++) {
      if (!this.visited[i]) {
        this.dfs(nodes[i]!);
      }
    }
    for (const edge of this.edgesToBeReversed) {
      edge.reverse(graph, true);
      graph.setProperty(InternalProperties.CYCLIC, true);
    }
  }

  private dfs(n: LNode): void {
    if (this.visited[n.id]) {
      return;
    }
    this.visited[n.id] = true;
    this.active[n.id] = true;
    for (const out of n.getOutgoingEdges()) {
      if (out.isSelfLoop()) {
        continue;
      }
      const target = out.getTarget()!.getNode()!;
      if (this.active[target.id]) {
        this.edgesToBeReversed.push(out);
      } else {
        this.dfs(target);
      }
    }
    this.active[n.id] = false;
  }
}

/** Every effect on a graph built from a spec, by node index. */
function runSpec(spec: TarjanSpec, make: () => ILayoutPhase<LayeredPhases, LGraph>): unknown {
  const built = buildTarjanGraph(spec);
  const index = new Map(built.nodes.map((node, i) => [node, i] as const));
  make().process(built.graph, new NullElkProgressMonitor());
  return {
    cyclic: built.graph.getProperty(InternalProperties.CYCLIC),
    edges: built.edges.map((e) => [index.get(e.getSource()!.getNode()!), index.get(e.getTarget()!.getNode()!)]),
    reversed: built.edges.map((e) => e.getProperty(InternalProperties.REVERSED)),
  };
}

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/DepthFirstCycleBreaker/';
const STRATEGY = 'DEPTH_FIRST';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX));

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const factories: Factories = {
    createProcessor: (name) => {
      throw new Error(`row ${row.id}: unexpected processor ${name}`);
    },
    createPhase: (phase, strategy) => {
      expect([phase, strategy]).toEqual(['P1_CYCLE_BREAKING', STRATEGY]);
      return CycleBreakingStrategy.DEPTH_FIRST.create();
    },
  };
  const graph = runSteps(row, factories);
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('DepthFirstCycleBreaker on the oracle rows', () => {
  it('has the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(['cycle', 'chain'].map((name) => `${ROW_PREFIX}${name}`));
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const actual = replay(row);
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });

  it('creates the class through its strategy arm', () => {
    expect(CycleBreakingStrategy.DEPTH_FIRST.create()).toBeInstanceOf(DepthFirstCycleBreaker);
  });
});

describe('DepthFirstCycleBreaker configuration', () => {
  it('restores reversed edges after P5 and nothing else', () => {
    const configuration = new DepthFirstCycleBreaker().getLayoutProcessorConfiguration(null as unknown as LGraph);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER,
    ]);
    expect([...configuration.processorsBefore(LayeredPhases.P1_CYCLE_BREAKING)]).toEqual([]);
  });
});

describe('DepthFirstCycleBreaker against the recursive twin', () => {
  it.each(rows.map((row) => [row.id, row] as const))('%s: the twin shows the same result', (_id, row) => {
    const port = replay(row);
    const twinFactories: Factories = {
      createProcessor: () => {
        throw new Error('no processor expected');
      },
      createPhase: () => new RecursiveDepthFirstCycleBreaker(),
    };
    const twinGraph = runSteps(row, twinFactories);
    const twin = { ...phaseDump(twinGraph, importRow(row).importDump), dump: dumpLGraph(twinGraph) };
    expect(twin).toEqual(port);
  });

  it.each(GENERATED_SEEDS)('random graph, seed %i: every effect equals the twin', (seed) => {
    const spec = randomSpec(seed, 4 + (seed % 17), 3 + (seed % 41), 0);
    const port = runSpec(spec, () => new DepthFirstCycleBreaker());
    expect(runSpec(spec, () => new RecursiveDepthFirstCycleBreaker())).toEqual(port);
  });

  it.each([false, true])('a %s-closed 5,000-node chain breaks without stack overflow, like the twin', (closed) => {
    // under --jitless the recursive twin itself may overflow the interpreter's stack (B8); the port must not
    const spec = chainSpec(DEEP_NODES, closed);
    const port = runSpec(spec, () => new DepthFirstCycleBreaker()) as { cyclic: boolean; reversed: boolean[] };
    expect(port.cyclic).toBe(closed);
    expect(port.reversed.filter(Boolean)).toHaveLength(closed ? 1 : 0);
    let twin: unknown = null;
    try {
      twin = runSpec(spec, () => new RecursiveDepthFirstCycleBreaker());
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(twin).toEqual(port);
    }
  });
});
