// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
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

// ------------------------------------------------------------------------------------------------------------
// Site rows (T11): separate connections (S12) and edges between external port dummies (S13)

const SITE_ROWS = loadRows(ROWS_FILE).filter((row) => row.id.startsWith('sites/'));
const CONNECTIONS_PROPERTY = 'separateLayerConnections';

function siteRow(id: string): PhaseRow {
  const row = SITE_ROWS.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no site row ${id}`);
  }
  return row;
}

function replaySite(row: PhaseRow): { graph: LGraph; actual: ReturnType<typeof phaseDump> } {
  const graph = runSteps(row, factories);
  return { graph, actual: phaseDump(graph, importRow(row).importDump) };
}

/** The constant names of the enum-valued `changed` props of one element path (the class label is not compared). */
function changedNames(actual: ReturnType<typeof phaseDump>, path: string): Record<string, string> | undefined {
  const props = actual.changed.find((entry) => entry.path === path)?.props;
  return props === undefined
    ? undefined
    : Object.fromEntries(Object.entries(props).map(([id, value]) => [id, (value as { n: string }).n]));
}

describe('LayerConstraintPreprocessor (site rows)', () => {
  const SEPARATE = 'sites/LayerConstraint/separateConnections/preprocess';

  // oracle: sites/LayerConstraint/separateConnections/preprocess; LayerConstraintPreprocessor.java:147-162
  // (combine over NONE, FIRST_SEPARATE, LAST_SEPARATE, and the :203/:207 switch that sets FIRST / LAST)
  it('hides the four separate nodes and records which kinds of hidden nodes each opposite node touches', () => {
    const { actual } = replaySite(siteRow(SEPARATE));
    expect(actual.hidden).toEqual(['g0/n0', 'g0/n1', 'g0/n2', 'g0/n3']);
    expect(actual.layerless).toEqual(['g0/n4', 'g0/n5', 'g0/n6', 'g0/n7', 'g0/n8']);
    expect(changedNames(actual, 'g0/n5')).toEqual({ [CONNECTIONS_PROPERTY]: 'BOTH' });
    expect(changedNames(actual, 'g0/n6')).toEqual({ [CONNECTIONS_PROPERTY]: 'BOTH' });
    expect(changedNames(actual, 'g0/n7')).toEqual({
      'org.eclipse.elk.layered.layering.layerConstraint': 'FIRST',
      [CONNECTIONS_PROPERTY]: 'FIRST_SEPARATE',
    });
    expect(changedNames(actual, 'g0/n8')).toEqual({
      'org.eclipse.elk.layered.layering.layerConstraint': 'LAST',
      [CONNECTIONS_PROPERTY]: 'LAST_SEPARATE',
    });
    expect(changedNames(actual, 'g0/n4')).toBeUndefined();
  });

  // J: HiddenNodeConnections.ordinal() and toString() (LayerConstraintPreprocessor.java:137-145, declaration order)
  it('numbers and names the HiddenNodeConnections constants in declaration order', () => {
    const { graph } = replaySite(siteRow(SEPARATE));
    const [none, both, , first, last] = [1, 2, 3, 4, 5].map((i) => graph.getLayerlessNodes()[i - 1]!);
    const key = [...both!.getAllProperties()].find(([property]) => property.getId() === CONNECTIONS_PROPERTY)![0];
    const connections = [none, both, first, last].map((node) => node!.getProperty(key) as { ordinal(): number });
    expect(connections.map((c) => [String(c), c.ordinal()])).toEqual([
      ['NONE', 0],
      ['BOTH', 3],
      ['FIRST_SEPARATE', 1],
      ['LAST_SEPARATE', 2],
    ]);
  });

  // oracle: sites/LayerConstraintPreprocessor/externalPortEdges; LayerConstraintPreprocessor.java:223-236 and :245-250
  // (an edge between two EXTERNAL_PORT dummies is acceptable on a FIRST_SEPARATE / LAST_SEPARATE node)
  it('accepts edges between external port dummies on separate nodes', () => {
    const { actual } = replaySite(siteRow('sites/LayerConstraintPreprocessor/externalPortEdges'));
    expect(actual.hidden).toEqual(['g0/n0', 'g0/n1', 'g0/n2', 'g0/n3']);
    expect(actual.layerless).toEqual(['g0/n4', 'g0/n5']);
    const edges = actual.edges.map((edge) => [edge.path, edge.src, edge.tgt]).sort();
    expect(edges).toEqual([
      ['g0/e0', null, 'g0/n0/p0'],
      ['g0/e1', 'g0/n1/p0', null],
      ['g0/e2', 'g0/n4/p0', 'g0/n5/p0'],
    ]);
  });
});
