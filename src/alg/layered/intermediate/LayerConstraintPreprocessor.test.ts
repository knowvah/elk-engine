// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { importRow, loadRows } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayerConstraintPreprocessor } from './LayerConstraintPreprocessor.js';
import type { LGraph } from '../graph/LGraph.js';
import { addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { UnsupportedConfigurationException } from '../../../core/UnsupportedConfigurationException.js';
import { LGraph as Graph } from '../graph/LGraph.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/LayerConstraintPreprocessor/';
const PROCESSOR_NAME = 'LAYER_CONSTRAINT_PREPROCESSOR';
const ROW_NAMES: readonly string[] = ['separate', 'none'];
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX) && row.steps !== null);

const factories: Factories = {
  createProcessor(name) {
    if (name !== PROCESSOR_NAME) {
      throw new Error(`unexpected processor ${name}`);
    }
    return new LayerConstraintPreprocessor();
  },
  createPhase(phase, strategy) {
    throw new Error(`unexpected phase ${phase}/${strategy}`);
  },
};

function run(graph: LGraph): void {
  new LayerConstraintPreprocessor().process(graph, new NullElkProgressMonitor());
}

describe('LayerConstraintPreprocessor (oracle rows)', () => {
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

describe('LayerConstraintPreprocessor (structure, Java branches)', () => {
  it('throws for a FIRST_SEPARATE node with an ordinary incoming edge', () => {
    const graph = new Graph();
    const a = addNode(graph);
    const b = addNode(graph);
    b.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.FIRST_SEPARATE);
    connect(addPort(a), addPort(b));
    expect(() => run(graph)).toThrow(UnsupportedConfigurationException);
    expect(() => run(graph)).toThrow(
      /has its layer constraint set to FIRST_SEPARATE, but has at least one incoming edge\. FIRST_SEPARATE nodes must not have incoming edges\./,
    );
  });

  it('throws for a LAST_SEPARATE node with an ordinary outgoing edge', () => {
    const graph = new Graph();
    const a = addNode(graph);
    const b = addNode(graph);
    a.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST_SEPARATE);
    connect(addPort(a), addPort(b));
    expect(() => run(graph)).toThrow(UnsupportedConfigurationException);
    expect(() => run(graph)).toThrow(
      /LAST_SEPARATE, but has at least one outgoing edge\. LAST_SEPARATE nodes must not have outgoing edges\./,
    );
  });
});
