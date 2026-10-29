// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { chainSpec, buildTarjanGraph, randomSpec } from '../../../../test/helpers/tarjan-graphs.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump, type Expected } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { LongestPathLayerer } from './LongestPathLayerer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/LongestPathLayerer/';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX));

/**
 * Verbatim recursive transcription of `LongestPathLayerer.java` (B8 twin): the port replaces the recursion of `visit`
 * (Java `:99`) by an explicit stack and must show every effect of this recursion.
 */
class RecursiveLongestPathLayerer implements ILayoutPhase<LayeredPhases, LGraph> {
  private layeredGraph!: LGraph;
  private nodeHeights!: number[];

  getLayoutProcessorConfiguration(graph: LGraph): ReturnType<LongestPathLayerer['getLayoutProcessorConfiguration']> {
    return new LongestPathLayerer().getLayoutProcessorConfiguration(graph);
  }

  process(thelayeredGraph: LGraph): void {
    this.layeredGraph = thelayeredGraph;
    const nodes = this.layeredGraph.getLayerlessNodes();
    this.nodeHeights = new Array<number>(nodes.length);
    let index = 0;
    for (const node of nodes) {
      node.id = index;
      this.nodeHeights[index] = -1;
      index++;
    }
    for (const node of nodes) {
      this.visit(node);
    }
    nodes.length = 0;
  }

  private visit(node: LNode): number {
    const height = this.nodeHeights[node.id]!;
    if (height >= 0) {
      return height;
    }
    let maxHeight = 1;
    for (const port of node.getPorts()) {
      for (const edge of port.getOutgoingEdges()) {
        const other = edge.getTarget()!.getNode()!;
        if (node !== other) {
          const otherHeight = this.visit(other);
          maxHeight = Math.max(maxHeight, otherHeight + 1);
        }
      }
    }
    this.putNode(node, maxHeight);
    return maxHeight;
  }

  private putNode(node: LNode, height: number): void {
    const layers = this.layeredGraph.getLayers();
    for (let i = layers.length; i < height; i++) {
      layers.unshift(new Layer(this.layeredGraph));
    }
    node.setLayer(layers[layers.length - height]!);
    this.nodeHeights[node.id] = height;
  }
}

function replay(row: PhaseRow, createLayerer: () => ILayoutPhase<LayeredPhases, LGraph>): Expected {
  const factories: Factories = {
    createProcessor: (name) => {
      throw new Error(`row ${row.id}: unexpected processor ${name}`);
    },
    createPhase: (phase, strategy) => {
      expect([phase, strategy]).toEqual(['P2_LAYERING', 'LONGEST_PATH']);
      return createLayerer();
    },
  };
  const graph = runSteps(row, factories);
  const dump = phaseDump(graph, importRow(row).importDump);
  return { ...dump, dump: dumpLGraph(graph) };
}

describe('LongestPathLayerer on the oracle rows', () => {
  it('has the dag and the chain row', () => {
    expect(rows.map((row) => row.id)).toEqual([`${ROW_PREFIX}dag`, `${ROW_PREFIX}chain`]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const actual = replay(row, () => LayeringStrategy.LONGEST_PATH.create());
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: the recursive twin shows the same result', (_id, row) => {
    const port = replay(row, () => new LongestPathLayerer());
    expect(replay(row, () => new RecursiveLongestPathLayerer())).toEqual(port);
  });
});

describe('LongestPathLayerer configuration', () => {
  it('declares the reverser before P1 and the layer constraint processors before P2 and P3', () => {
    const configuration = new LongestPathLayerer().getLayoutProcessorConfiguration(null as unknown as LGraph);
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

/** Layer index of every node, by spec index (`node.id` is overwritten by the layerer; read it off the layers). */
function layerIndices(graph: LGraph, nodes: readonly LNode[]): { layers: number[]; layerless: number } {
  const layers = graph.getLayers();
  return {
    layers: nodes.map((node) => layers.indexOf(node.getLayer()!)),
    layerless: graph.getLayerlessNodes().length,
  };
}

function runOn(
  phase: ILayoutPhase<LayeredPhases, LGraph>,
  spec: ReturnType<typeof chainSpec>,
): ReturnType<typeof layerIndices> {
  const built = buildTarjanGraph(spec);
  phase.process(built.graph, new NullElkProgressMonitor());
  return layerIndices(built.graph, built.nodes);
}

describe('LongestPathLayerer against the recursive twin', () => {
  it.each(Array.from({ length: 30 }, (_, i) => i + 1))('random acyclic graph, seed %i', (seed) => {
    const spec = randomSpec(seed, 4 + (seed % 17), 3 + (seed % 41), 0);
    const acyclic = { ...spec, edges: spec.edges.filter(([s, t]) => s < t) };
    expect(runOn(new LongestPathLayerer(), acyclic)).toEqual(runOn(new RecursiveLongestPathLayerer(), acyclic));
  });

  it('ignores self-loops like the twin', () => {
    const spec = {
      nodeCount: 3,
      edges: [
        [0, 0],
        [0, 1],
        [1, 2],
        [2, 2],
      ] as [number, number][],
      reversed: [],
    };
    const port = runOn(new LongestPathLayerer(), spec);
    expect(port).toEqual(runOn(new RecursiveLongestPathLayerer(), spec));
    expect(port.layers.length).toBe(3);
  });

  it('5,000-node chain: no stack overflow in the port, layers equal the twin', () => {
    const spec = chainSpec(5000, false);
    const port = runOn(new LongestPathLayerer(), spec);
    expect(port.layers).toHaveLength(5000);
    expect(new Set(port.layers).size).toBe(5000);
    let twin: ReturnType<typeof layerIndices> | null = null;
    try {
      twin = runOn(new RecursiveLongestPathLayerer(), spec);
    } catch (e) {
      // the recursive twin itself overflows the interpreter's stack under --jitless (AC6); the port must not
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(port).toEqual(twin);
    }
  });
});
