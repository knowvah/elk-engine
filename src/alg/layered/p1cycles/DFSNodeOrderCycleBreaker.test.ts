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
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { DFSNodeOrderCycleBreaker } from './DFSNodeOrderCycleBreaker.js';

const DEEP_NODES = 5000;
const GENERATED_SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const GROUP_ID = LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID;
const GROUP_STRATEGY = LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY;

/**
 * Verbatim recursive transcription of `DFSNodeOrderCycleBreaker.java` (B8 twin): the port replaces the recursion of
 * `dfs` (Java `:146`) by an explicit stack and must show every effect of this recursion.
 */
class RecursiveDFSNodeOrderCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  private visited: boolean[] = [];
  private active: boolean[] = [];
  private edgesToBeReversed: LEdge[] = [];
  private graph!: LGraph;

  getLayoutProcessorConfiguration(
    graph: LGraph,
  ): ReturnType<DFSNodeOrderCycleBreaker['getLayoutProcessorConfiguration']> {
    return new DFSNodeOrderCycleBreaker().getLayoutProcessorConfiguration(graph);
  }

  process(graph: LGraph): void {
    this.graph = graph;
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
    const modelOrderMap = new Map<number, Set<LEdge>>();
    const groupModelOrder = this.graph.getProperty(GROUP_STRATEGY) === GroupOrderStrategy.ENFORCED;
    for (const e of n.getOutgoingEdges()) {
      const target = e.getTarget()!.getNode()!;
      if (target.getProperty(InternalProperties.MODEL_ORDER) === null) {
        modelOrderMap.set(Int32.sub(JavaInteger.MAX_VALUE, modelOrderMap.size), new Set([e]));
      } else {
        const targetModelOrder = groupModelOrder
          ? Int32.add(
              Int32.mul(this.graph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES), target.getProperty(GROUP_ID)),
              target.getProperty(InternalProperties.MODEL_ORDER),
            )
          : target.getProperty(InternalProperties.MODEL_ORDER);
        if (modelOrderMap.has(targetModelOrder)) {
          modelOrderMap.get(targetModelOrder)!.add(e);
        } else {
          modelOrderMap.set(targetModelOrder, new Set([e]));
        }
      }
    }
    for (const key of [...modelOrderMap.keys()].sort((a, b) => a - b)) {
      const out = modelOrderMap.get(key)!.values().next().value!;
      if (out.isSelfLoop()) {
        continue;
      }
      const target = out.getTarget()!.getNode()!;
      if (this.active[target.id]) {
        this.edgesToBeReversed.push(...modelOrderMap.get(key)!);
      } else {
        this.dfs(target);
      }
    }
    this.active[n.id] = false;
  }
}

/** Model orders and groups put on a built graph: every third node has no model order, the others `i % 5`. */
function decorate(nodes: readonly LNode[], graph: LGraph, enforced: boolean): void {
  nodes.forEach((node, i) => {
    if (i % 3 !== 0) {
      node.setProperty(InternalProperties.MODEL_ORDER, i % 5);
    }
    node.setProperty(GROUP_ID, i % 4);
  });
  graph.setProperty(InternalProperties.MAX_MODEL_ORDER_NODES, nodes.length);
  graph.setProperty(GROUP_STRATEGY, enforced ? GroupOrderStrategy.ENFORCED : GroupOrderStrategy.ONLY_WITHIN_GROUP);
}

/** Every effect on a graph built from a spec, by node index. */
function runSpec(spec: TarjanSpec, enforced: boolean, make: () => ILayoutPhase<LayeredPhases, LGraph>): unknown {
  const built = buildTarjanGraph(spec);
  const index = new Map(built.nodes.map((node, i) => [node, i] as const));
  decorate(built.nodes, built.graph, enforced);
  make().process(built.graph, new NullElkProgressMonitor());
  return {
    cyclic: built.graph.getProperty(InternalProperties.CYCLIC),
    edges: built.edges.map((e) => [index.get(e.getSource()!.getNode()!), index.get(e.getTarget()!.getNode()!)]),
    reversed: built.edges.map((e) => e.getProperty(InternalProperties.REVERSED)),
  };
}

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/DFSNodeOrderCycleBreaker/';
const STRATEGY = 'DFS_NODE_ORDER';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX));

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const factories: Factories = {
    createProcessor: (name) => {
      throw new Error(`row ${row.id}: unexpected processor ${name}`);
    },
    createPhase: (phase, strategy) => {
      expect([phase, strategy]).toEqual(['P1_CYCLE_BREAKING', STRATEGY]);
      return CycleBreakingStrategy.DFS_NODE_ORDER.create();
    },
  };
  const graph = runSteps(row, factories);
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('DFSNodeOrderCycleBreaker on the oracle rows', () => {
  it('has the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(['cycle', 'chain'].map((name) => `${ROW_PREFIX}${name}`));
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const actual = replay(row);
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });

  it('creates the class through its strategy arm', () => {
    expect(CycleBreakingStrategy.DFS_NODE_ORDER.create()).toBeInstanceOf(DFSNodeOrderCycleBreaker);
  });
});

describe('DFSNodeOrderCycleBreaker configuration', () => {
  it('restores reversed edges after P5 and nothing else', () => {
    const configuration = new DFSNodeOrderCycleBreaker().getLayoutProcessorConfiguration(null as unknown as LGraph);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER,
    ]);
    expect([...configuration.processorsBefore(LayeredPhases.P1_CYCLE_BREAKING)]).toEqual([]);
  });
});

describe('DFSNodeOrderCycleBreaker against the recursive twin', () => {
  it.each(rows.map((row) => [row.id, row] as const))('%s: the twin shows the same result', (_id, row) => {
    const port = replay(row);
    const twinFactories: Factories = {
      createProcessor: () => {
        throw new Error('no processor expected');
      },
      createPhase: () => new RecursiveDFSNodeOrderCycleBreaker(),
    };
    const twinGraph = runSteps(row, twinFactories);
    const twin = { ...phaseDump(twinGraph, importRow(row).importDump), dump: dumpLGraph(twinGraph) };
    expect(twin).toEqual(port);
  });

  it.each(GENERATED_SEEDS)('random graph with model orders, seed %i: every effect equals the twin', (seed) => {
    const spec = randomSpec(seed, 4 + (seed % 17), 3 + (seed % 41), 0);
    const enforced = seed % 2 === 0;
    const port = runSpec(spec, enforced, () => new DFSNodeOrderCycleBreaker());
    expect(runSpec(spec, enforced, () => new RecursiveDFSNodeOrderCycleBreaker())).toEqual(port);
  });

  it.each([false, true])('a closed=%s 5,000-node chain breaks without stack overflow, like the twin', (closed) => {
    // under --jitless the recursive twin itself may overflow the interpreter's stack (B8); the port must not
    const spec = chainSpec(DEEP_NODES, closed);
    const port = runSpec(spec, false, () => new DFSNodeOrderCycleBreaker()) as { cyclic: boolean; reversed: boolean[] };
    expect(port.cyclic).toBe(closed);
    expect(port.reversed.filter(Boolean)).toHaveLength(closed ? 1 : 0);
    let twin: unknown = null;
    try {
      twin = runSpec(spec, false, () => new RecursiveDFSNodeOrderCycleBreaker());
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(twin).toEqual(port);
    }
  });
});
