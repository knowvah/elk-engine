// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { InteractiveExternalPortPositioner } from './InteractiveExternalPortPositioner.js';
import type { LGraph } from '../graph/LGraph.js';
import { addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { LGraph as Graph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/InteractiveExternalPortPositioner/';
const PROCESSOR_NAME = 'INTERACTIVE_EXTERNAL_PORT_POSITIONER';
const ROW_NAMES: readonly string[] = ['four-sides', 'no-external-ports'];
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX) && row.steps !== null);

const factories: Factories = {
  createProcessor(name) {
    if (name !== PROCESSOR_NAME) {
      throw new Error(`unexpected processor ${name}`);
    }
    return new InteractiveExternalPortPositioner();
  },
  createPhase(phase, strategy) {
    throw new Error(`unexpected phase ${phase}/${strategy}`);
  },
};

function run(graph: LGraph): void {
  new InteractiveExternalPortPositioner().process(graph, new NullElkProgressMonitor());
}

describe('InteractiveExternalPortPositioner (oracle rows)', () => {
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

describe('InteractiveExternalPortPositioner (structure, Java branches)', () => {
  function externalGraph() {
    const graph = new Graph();
    graph.getProperty(InternalProperties.GRAPH_PROPERTIES).add(GraphProperties.EXTERNAL_PORTS);
    const normal = addNode(graph);
    normal.getPosition().x = 100;
    normal.getPosition().y = 50;
    normal.getSize().x = 40;
    normal.getSize().y = 20;
    return { graph, normal };
  }

  it('throws IllegalArgumentException for a node type other than NORMAL and EXTERNAL_PORT', () => {
    const { graph } = externalGraph();
    addNode(graph, NodeType.LONG_EDGE);
    expect(() => run(graph)).toThrow(IllegalArgumentException);
    expect(() => run(graph)).toThrow(
      'The node type LONG_EDGE is not supported by the class org.eclipse.elk.alg.layered.intermediate.InteractiveExternalPortPositioner',
    );
  });

  it('throws IllegalStateException for a north/south dummy with incoming and outgoing edges', () => {
    const { graph, normal } = externalGraph();
    const top = addNode(graph, NodeType.EXTERNAL_PORT);
    top.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.TOP);
    const port = addPort(top);
    connect(port, addPort(normal));
    connect(addPort(normal), port);
    expect(() => run(graph)).toThrow(IllegalStateException);
    expect(() => run(graph)).toThrow(
      'Interactive layout does not support NORTH/SOUTH ports with incoming _and_ outgoing edges.',
    );
  });
});

// ------------------------------------------------------------------------------------------------------------
// Site rows (T11, S11). Both graphs have eleven nodes, so the rows carry no 7a dump: the dummies' coordinates are not
// recorded; the cases assert the recorded structure and the layer constraint the branches decide on.

const SITE_PREFIX = 'sites/InteractiveExternalPortPositioner/';
const SITE_ROWS = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(SITE_PREFIX));
const ELEVEN_NODES = [
  'g0/n0',
  'g0/n1',
  'g0/n2',
  'g0/n3',
  'g0/n4',
  'g0/n5',
  'g0/n6',
  'g0/n7',
  'g0/n8',
  'g0/n9',
  'g0/n10',
];

function siteRow(name: string): PhaseRow {
  const row = SITE_ROWS.find((candidate) => candidate.id === `${SITE_PREFIX}${name}`);
  if (row === undefined) {
    throw new Error(`no site row ${SITE_PREFIX}${name}`);
  }
  return row;
}

function replaySite(row: PhaseRow): ReturnType<typeof phaseDump> {
  return phaseDump(runSteps(row, factories), importRow(row).importDump);
}

/** The changed paths, sorted: the recorder's element order is not part of the contract. */
function changedPaths(actual: ReturnType<typeof phaseDump>): string[] {
  return actual.changed.map((entry) => entry.path).sort();
}

describe('InteractiveExternalPortPositioner (site rows)', () => {
  // oracle: sites/InteractiveExternalPortPositioner/sides; InteractiveExternalPortPositioner.java:95
  // (WEST/EAST dummies by layer constraint, NORTH/SOUTH by in-layer constraint at :109 and :116; edgeless ports at :132)
  it('positions one dummy per side and keeps the nodes layerless and the edges unreversed', () => {
    const actual = replaySite(siteRow('sides'));
    expect(actual.layers).toEqual([]);
    expect(actual.layerless).toEqual(ELEVEN_NODES);
    expect(actual.edges.map((edge) => [edge.path, edge.src, edge.tgt, edge.reversed])).toEqual([
      ['g0/e0', 'g0/n0/p0', 'g0/n7/p0', false],
      ['g0/e1', 'g0/n8/p0', 'g0/n1/p0', false],
      ['g0/e2', 'g0/n2/p0', 'g0/n9/p0', false],
      ['g0/e3', 'g0/n10/p0', 'g0/n3/p0', false],
      ['g0/e4', 'g0/n7/p1', 'g0/n8/p1', false],
    ]);
    expect(changedPaths(actual)).toEqual(['g0/n10', 'g0/n7', 'g0/n8', 'g0/n9']);
  });

  // oracle: sites/InteractiveExternalPortPositioner/noConstraint; InteractiveExternalPortPositioner.java:109
  // (a dummy whose layer constraint is NONE falls through to the in-layer constraint tests)
  it('falls through to the in-layer constraints for a dummy cleared to NONE', () => {
    const actual = replaySite(siteRow('noConstraint'));
    expect(actual.layerless).toEqual(ELEVEN_NODES);
    expect(changedPaths(actual)).toEqual(['g0/n10', 'g0/n4', 'g0/n7', 'g0/n8', 'g0/n9']);
    expect(actual.changed.find((entry) => entry.path === 'g0/n4')!.props).toEqual({
      'org.eclipse.elk.layered.layering.layerConstraint': { c: 'LayerConstraint', n: 'NONE', t: 'enum' },
    });
  });
});
