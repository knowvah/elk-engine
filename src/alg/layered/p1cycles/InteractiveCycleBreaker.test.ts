// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import {
  buildTarjanGraph,
  chainSpec,
  randomSpec,
  seededRandom,
  type TarjanSpec,
} from '../../../../test/helpers/tarjan-graphs.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { PortType } from '../options/PortType.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InteractiveCycleBreaker } from './InteractiveCycleBreaker.js';

const DEEP_NODES = 5000;
const GENERATED_SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

/**
 * Verbatim recursive transcription of `InteractiveCycleBreaker.java` (B8 twin): the port replaces the recursion of
 * `findCycles` (Java `:107`) by an explicit stack and must show every effect of this recursion.
 */
class RecursiveInteractiveCycleBreaker implements ILayoutPhase<LayeredPhases, LGraph> {
  getLayoutProcessorConfiguration(
    graph: LGraph,
  ): ReturnType<InteractiveCycleBreaker['getLayoutProcessorConfiguration']> {
    return new InteractiveCycleBreaker().getLayoutProcessorConfiguration(graph);
  }

  process(layeredGraph: LGraph): void {
    const revEdges: LEdge[] = [];
    for (const source of layeredGraph.getLayerlessNodes()) {
      source.id = 1;
      const sourcex = source.getInteractiveReferencePoint()!.x;
      for (const port of source.getPorts(PortType.OUTPUT)) {
        for (const edge of port.getOutgoingEdges()) {
          const target = edge.getTarget()!.getNode()!;
          if (target !== source && target.getInteractiveReferencePoint()!.x < sourcex) {
            revEdges.push(edge);
          }
        }
      }
    }
    for (const edge of revEdges) {
      edge.reverse(layeredGraph, true);
    }
    revEdges.length = 0;
    for (const node of layeredGraph.getLayerlessNodes()) {
      if (node.id > 0) {
        this.findCycles(node, revEdges);
      }
    }
    for (const edge of revEdges) {
      edge.reverse(layeredGraph, true);
    }
    revEdges.length = 0;
  }

  private findCycles(node1: LNode, revEdges: LEdge[]): void {
    node1.id = -1;
    for (const port of node1.getPorts(PortType.OUTPUT)) {
      for (const edge of port.getOutgoingEdges()) {
        const node2 = edge.getTarget()!.getNode()!;
        if (node1 !== node2) {
          if (node2.id < 0) {
            revEdges.push(edge);
          } else if (node2.id > 0) {
            this.findCycles(node2, revEdges);
          }
        }
      }
    }
    node1.id = 0;
  }
}

/** Every effect on a graph built from a spec, by node index; node x positions come from `x(index)`. */
function runSpec(
  spec: TarjanSpec,
  x: (index: number) => number,
  make: () => ILayoutPhase<LayeredPhases, LGraph>,
): unknown {
  const built = buildTarjanGraph(spec);
  const index = new Map(built.nodes.map((node, i) => [node, i] as const));
  built.nodes.forEach((node, i) => {
    node.getPosition().x = x(i);
  });
  make().process(built.graph, new NullElkProgressMonitor());
  return {
    edges: built.edges.map((e) => [index.get(e.getSource()!.getNode()!), index.get(e.getTarget()!.getNode()!)]),
    reversed: built.edges.map((e) => e.getProperty(InternalProperties.REVERSED)),
    ids: built.nodes.map((node) => node.id),
  };
}

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/InteractiveCycleBreaker/';
const STRATEGY = 'INTERACTIVE';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX));

function replay(row: PhaseRow): ReturnType<typeof phaseDump> {
  const factories: Factories = {
    createProcessor: (name) => {
      throw new Error(`row ${row.id}: unexpected processor ${name}`);
    },
    createPhase: (phase, strategy) => {
      expect([phase, strategy]).toEqual(['P1_CYCLE_BREAKING', STRATEGY]);
      return CycleBreakingStrategy.INTERACTIVE.create();
    },
  };
  const graph = runSteps(row, factories);
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('InteractiveCycleBreaker on the oracle rows', () => {
  it('has the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(['cycle', 'chain'].map((name) => `${ROW_PREFIX}${name}`));
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const actual = replay(row);
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });

  it('creates the class through its strategy arm', () => {
    expect(CycleBreakingStrategy.INTERACTIVE.create()).toBeInstanceOf(InteractiveCycleBreaker);
  });
});

describe('InteractiveCycleBreaker configuration', () => {
  it('restores reversed edges after P5 and positions external ports before P1', () => {
    const configuration = new InteractiveCycleBreaker().getLayoutProcessorConfiguration(null as unknown as LGraph);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER,
    ]);
    expect([...configuration.processorsBefore(LayeredPhases.P1_CYCLE_BREAKING)]).toEqual([
      IntermediateProcessorStrategy.INTERACTIVE_EXTERNAL_PORT_POSITIONER,
    ]);
  });
});

describe('InteractiveCycleBreaker against the recursive twin', () => {
  it.each(rows.map((row) => [row.id, row] as const))('%s: the twin shows the same result', (_id, row) => {
    const port = replay(row);
    const twinFactories: Factories = {
      createProcessor: () => {
        throw new Error('no processor expected');
      },
      createPhase: () => new RecursiveInteractiveCycleBreaker(),
    };
    const twinGraph = runSteps(row, twinFactories);
    const twin = { ...phaseDump(twinGraph, importRow(row).importDump), dump: dumpLGraph(twinGraph) };
    expect(twin).toEqual(port);
  });

  it.each(GENERATED_SEEDS)('random graph with tied positions, seed %i: every effect equals the twin', (seed) => {
    const spec = randomSpec(seed, 4 + (seed % 17), 3 + (seed % 41), 0);
    const random = seededRandom(seed);
    const xs = Array.from({ length: spec.nodeCount }, () => Math.floor(random() * 3));
    const port = runSpec(
      spec,
      (i) => xs[i]!,
      () => new InteractiveCycleBreaker(),
    );
    expect(
      runSpec(
        spec,
        (i) => xs[i]!,
        () => new RecursiveInteractiveCycleBreaker(),
      ),
    ).toEqual(port);
  });

  it('a 5,000-node cycle with equal positions is broken by the second pass, like the twin', () => {
    // under --jitless the recursive twin itself may overflow the interpreter's stack (B8); the port must not
    const spec = chainSpec(DEEP_NODES, true);
    const port = runSpec(
      spec,
      () => 0,
      () => new InteractiveCycleBreaker(),
    ) as { reversed: boolean[] };
    expect(port.reversed.filter(Boolean)).toHaveLength(1);
    let twin: unknown = null;
    try {
      twin = runSpec(
        spec,
        () => 0,
        () => new RecursiveInteractiveCycleBreaker(),
      );
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(twin).toEqual(port);
    }
  });
});

describe('InteractiveCycleBreaker on the site row', () => {
  it('an edge to a node on the current DFS path is reversed', () => {
    // oracle: sites/InteractiveCycleBreaker/pathCycle; InteractiveCycleBreaker.java:114 (target on the current path closes a cycle)
    const row = loadRows(ROWS_FILE).find((candidate) => candidate.id === 'sites/InteractiveCycleBreaker/pathCycle')!;
    const actual = replay(row);
    expect(actual.edges.filter((edge) => edge.reversed).map((edge) => edge.path)).toEqual(['g0/e1', 'g0/e3']);
    expect(
      actual.changed
        .filter((entry) => entry.props.reversed !== undefined)
        .map((entry) => entry.path)
        .sort(),
    ).toEqual(['g0/e1', 'g0/e3'].sort());
    expect(actual.changed.some((entry) => entry.path === 'g0' && entry.props.cyclic !== undefined)).toBe(false);
  });
});
