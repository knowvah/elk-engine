// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { importRow, loadRows } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayerConstraintPostprocessor } from './LayerConstraintPostprocessor.js';
import { LayerConstraintPreprocessor } from './LayerConstraintPreprocessor.js';
import type { LGraph } from '../graph/LGraph.js';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { UnsupportedConfigurationException } from '../../../core/UnsupportedConfigurationException.js';
import { LGraph as Graph } from '../graph/LGraph.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/LayerConstraintPostprocessor/';
const PROCESSOR_NAME = 'LAYER_CONSTRAINT_POSTPROCESSOR';
const ROW_NAMES: readonly string[] = ['first-last', 'separate', 'empty-layer'];
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX) && row.steps !== null);

const factories: Factories = {
  createProcessor(name) {
    // the `separate` row hides nodes with the preprocessor first (also ported by T4)
    if (name === 'LAYER_CONSTRAINT_PREPROCESSOR') {
      return new LayerConstraintPreprocessor();
    }
    if (name !== PROCESSOR_NAME) {
      throw new Error(`unexpected processor ${name}`);
    }
    return new LayerConstraintPostprocessor();
  },
  createPhase(phase, strategy) {
    throw new Error(`unexpected phase ${phase}/${strategy}`);
  },
};

function run(graph: LGraph): void {
  new LayerConstraintPostprocessor().process(graph, new NullElkProgressMonitor());
}

describe('LayerConstraintPostprocessor (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(ROW_NAMES.map((name) => `${ROW_PREFIX}${name}`));
  });

  it.each(rows.map((row) => [row.id, row] as const))('replays %s', (_id, row) => {
    const { importDump } = importRow(row);
    const graph = runSteps(row, factories);
    const actual = { ...phaseDump(graph, importDump), dump: dumpWithPropertyValues(graph) };
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(row.expected.dump).toBeDefined();
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });
});

describe('LayerConstraintPostprocessor (structure, Java branches)', () => {
  function layered(count: number) {
    const graph = new Graph();
    const nodes = Array.from({ length: count }, () => {
      const node = addNode(graph);
      node.setLayer(addLayer(graph));
      graph.getLayerlessNodes().pop();
      return node;
    });
    return { graph, nodes };
  }

  it('throws for a FIRST node with an ordinary incoming edge (the InteractiveLayerer case)', () => {
    const { graph, nodes } = layered(2);
    nodes[1]!.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.FIRST);
    connect(addPort(nodes[0]!), addPort(nodes[1]!));
    expect(() => run(graph)).toThrow(UnsupportedConfigurationException);
    expect(() => run(graph)).toThrow(
      /has its layer constraint set to FIRST, but has at least one incoming edge that {2}does not come from a FIRST_SEPARATE node\. That must not happen\./,
    );
  });

  it('throws for a LAST node with an ordinary outgoing edge', () => {
    const { graph, nodes } = layered(2);
    nodes[0]!.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST);
    connect(addPort(nodes[0]!), addPort(nodes[1]!));
    expect(() => run(graph)).toThrow(UnsupportedConfigurationException);
    expect(() => run(graph)).toThrow(
      /has its layer constraint set to LAST, but has at least one outgoing edge that {2}does not go to a LAST_SEPARATE node\. That must not happen\./,
    );
  });
});
