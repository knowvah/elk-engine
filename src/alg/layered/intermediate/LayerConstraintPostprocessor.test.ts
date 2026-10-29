// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { importRow, loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayerConstraintPostprocessor } from './LayerConstraintPostprocessor.js';
import { NetworkSimplexLayerer } from '../p2layers/NetworkSimplexLayerer.js';
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

// ------------------------------------------------------------------------------------------------------------
// Site rows (T11): an empty graph (S6) and hidden separate nodes (S12)

const SITE_ROWS = loadRows(ROWS_FILE).filter((row) => row.id.startsWith('sites/'));

function siteRow(id: string): PhaseRow {
  const row = SITE_ROWS.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no site row ${id}`);
  }
  return row;
}

/** The rows' steps run the preprocessor, a NETWORK_SIMPLEX layering and the postprocessor: all injected. */
function replaySite(row: PhaseRow): ReturnType<typeof phaseDump> {
  const graph = runSteps(row, {
    createProcessor: factories.createProcessor,
    createPhase(phase, strategy) {
      if (phase === 'P2_LAYERING' && strategy === 'NETWORK_SIMPLEX') {
        return new NetworkSimplexLayerer();
      }
      throw new Error(`unexpected phase ${phase}/${strategy}`);
    },
  });
  return phaseDump(graph, importRow(row).importDump);
}

function sortedEdges(actual: ReturnType<typeof phaseDump>): (string | boolean | null)[][] {
  return actual.edges.map((edge) => [edge.path, edge.src, edge.tgt, edge.reversed]).sort();
}

describe('LayerConstraintPostprocessor (site rows)', () => {
  // oracle: sites/Layerers/emptyGraph/LAYER_CONSTRAINT_POSTPROCESSOR; LayerConstraintPostprocessor.java:69
  // (no layers: nothing to move, and no HIDDEN_NODES property either)
  it('leaves an empty graph empty', () => {
    const actual = replaySite(siteRow('sites/Layerers/emptyGraph/LAYER_CONSTRAINT_POSTPROCESSOR'));
    expect(actual.layers).toEqual([]);
    expect(actual.layerless).toEqual([]);
    expect(actual.hidden).toEqual([]);
    expect(actual.edges).toEqual([]);
    expect(actual.changed).toEqual([]);
  });

  // oracle: sites/LayerConstraint/separateConnections/postprocess; LayerConstraintPostprocessor.java:205
  // (an edge between two hidden nodes is restored once: the second hidden node finds it already restored)
  it('restores the hidden nodes into a first and a last layer and each hidden edge once', () => {
    const actual = replaySite(siteRow('sites/LayerConstraint/separateConnections/postprocess'));
    expect(actual.layers).toEqual([
      ['g0/n1', 'g0/n3'],
      ['g0/n5', 'g0/n6', 'g0/n4', 'g0/n7', 'g0/n8'],
      ['g0/n0', 'g0/n2'],
    ]);
    expect(actual.layerless).toEqual([]);
    expect(sortedEdges(actual)).toEqual([
      ['g0/e0', 'g0/n6/p0', 'g0/n0/p0', false],
      ['g0/e1', 'g0/n1/p2', 'g0/n0/p1', false],
      ['g0/e10', 'g0/n3/p1', 'g0/n4/p0', false],
      ['g0/e2', 'g0/n8/p0', 'g0/n0/p2', false],
      ['g0/e3', 'g0/n1/p0', 'g0/n5/p0', false],
      ['g0/e4', 'g0/n1/p1', 'g0/n6/p1', false],
      ['g0/e5', 'g0/n1/p3', 'g0/n7/p0', false],
      ['g0/e6', 'g0/n5/p2', 'g0/n2/p0', false],
      ['g0/e7', 'g0/n6/p2', 'g0/n2/p1', false],
      ['g0/e8', 'g0/n8/p1', 'g0/n2/p2', false],
      ['g0/e9', 'g0/n3/p0', 'g0/n5/p1', false],
    ]);
  });

  // oracle: sites/LayerConstraint/separateConnections/noLastSeparate; LayerConstraintPostprocessor.java:105
  // (no LAST_SEPARATE node is hidden: the empty last separate layer is not added)
  it('adds no last separate layer when no LAST_SEPARATE node was hidden', () => {
    const actual = replaySite(siteRow('sites/LayerConstraint/separateConnections/noLastSeparate'));
    expect(actual.layers).toEqual([
      ['g0/n1', 'g0/n3'],
      ['g0/n6', 'g0/n5', 'g0/n8', 'g0/n4', 'g0/n7'],
      ['g0/n0', 'g0/n2'],
    ]);
    expect(actual.hidden).toEqual(['g0/n1', 'g0/n3']);
  });
});
