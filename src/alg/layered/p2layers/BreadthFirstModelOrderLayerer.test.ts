// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump, type Expected } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { UnsupportedGraphException } from '../../../core/UnsupportedGraphException.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { BreadthFirstModelOrderLayerer } from './BreadthFirstModelOrderLayerer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/BreadthFirstModelOrderLayerer/';
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
      expect([phase, strategy]).toEqual(['P2_LAYERING', 'BF_MODEL_ORDER']);
      layerer = createLayerer();
      return layerer;
    },
  };
  const graph = runSteps(row, factories);
  const dump = phaseDump(graph, importRow(row).importDump);
  return { expected: { ...dump, dump: dumpLGraph(graph) }, layerer: layerer! };
}

describe('BreadthFirstModelOrderLayerer on the oracle rows', () => {
  it('has the dag and the chain row', () => {
    expect(rows.map((row) => row.id)).toEqual([`${ROW_PREFIX}dag`, `${ROW_PREFIX}chain`]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const { expected } = replay(row, () => LayeringStrategy.BF_MODEL_ORDER.create());
    expect(compareExpected(expected, row.expected)).toEqual([]);
    expect(compareFullDump(expected, row.expected)).toEqual([]);
  });
});

describe('BreadthFirstModelOrderLayerer configuration', () => {
  it('declares the edge reverser before P1 and the layer constraint processors before P2 and P3', () => {
    const configuration = new BreadthFirstModelOrderLayerer().getLayoutProcessorConfiguration(new LGraph());
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

/** A node with model order `order`. */
function ordered(graph: LGraph, names: Map<LNode, string>, name: string, order: number, type = NodeType.NORMAL): LNode {
  const node = addNode(graph, type);
  node.setProperty(InternalProperties.MODEL_ORDER, order);
  names.set(node, name);
  return node;
}

describe('BreadthFirstModelOrderLayerer structure', () => {
  it('rejects a real node without a model order', () => {
    const graph = new LGraph();
    const names = new Map<LNode, string>();
    ordered(graph, names, 'a', 0);
    addNode(graph);
    expect(() => run(new BreadthFirstModelOrderLayerer(), graph)).toThrow(
      new UnsupportedGraphException('The BF model order layer assigner requires all real nodes to have a model order.'),
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

describe('BreadthFirstModelOrderLayerer on the site rows', () => {
  it('skips the external port dummies of a hierarchical target and layers the real nodes', () => {
    // oracle: sites/ModelOrderLayerers/externalPorts/BF_MODEL_ORDER; BreadthFirstModelOrderLayerer.java:73
    const result = replay(siteRow('sites/ModelOrderLayerers/externalPorts/BF_MODEL_ORDER'), () =>
      LayeringStrategy.BF_MODEL_ORDER.create(),
    ).expected;
    expect(result.layers).toEqual([['g0/n2'], ['g0/n3', 'g0/n4'], ['g0/n5'], ['g0/n6', 'g0/n7', 'g0/n8']]);
    expect(result.layerless).toEqual([]);
    expect(result.changed).toEqual([]);
  });
});

describe('BreadthFirstModelOrderLayerer Java semantics', () => {
  it('sorts the real nodes ascending by model order (Integer.compare)', () => {
    // Java: BreadthFirstModelOrderLayerer.java:79 (`Integer.compare` of the model orders)
    const graph = new LGraph();
    const names = new Map<LNode, string>();
    [3, 2, 1, 0].forEach((order) => ordered(graph, names, `n${String(order)}`, order));
    run(new BreadthFirstModelOrderLayerer(), graph);
    expect(graph.getLayers().map((layer) => layer.getNodes().map((node) => names.get(node)))).toEqual([
      ['n0', 'n1', 'n2', 'n3'],
    ]);
  });

  it('keeps nodes with equal model orders in their list order (Integer.compare is 0)', () => {
    // Java: BreadthFirstModelOrderLayerer.java:79 (`Integer.compare` of equal model orders; `Collections.sort` is stable)
    const graph = new LGraph();
    const names = new Map<LNode, string>();
    ordered(graph, names, 'a', 1);
    ordered(graph, names, 'b', 1);
    ordered(graph, names, 'c', 0);
    run(new BreadthFirstModelOrderLayerer(), graph);
    expect(graph.getLayers().map((layer) => layer.getNodes().map((node) => names.get(node)))).toEqual([
      ['c', 'a', 'b'],
    ]);
  });

  it('throws NoSuchElementException for a label dummy without an incoming edge', () => {
    // Java: BreadthFirstModelOrderLayerer.java:100-101 (`getIncomingEdges().iterator().next()` on an empty iterable)
    const graph = new LGraph();
    const names = new Map<LNode, string>();
    ordered(graph, names, 'a', 0);
    const target = ordered(graph, names, 'b', 1);
    const label = addNode(graph, NodeType.LABEL);
    connect(addPort(label), addPort(target));
    expect(() => run(new BreadthFirstModelOrderLayerer(), graph)).toThrow(NoSuchElementException);
  });
});
