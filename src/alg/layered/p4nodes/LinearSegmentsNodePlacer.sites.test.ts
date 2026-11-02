// SPDX-License-Identifier: EPL-2.0
// Anchored site cases of LinearSegmentsNodePlacer (mission 7d, T12a, N11): one case per recorded `sites/LinearSegments/*`
// row, asserting the field the branch decides with a literal copied from the row (the generic replay in
// LinearSegmentsNodePlacer.test.ts already compares the whole row), plus the Java's exception for an empty layer.
// Expectations come only from the rows and the Java (L4).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../test/helpers/layered-framework-replay.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { placementDump } from '../../../../test/helpers/layered-placement-replay-dump.js';
import { loadPlacementRows } from '../../../../test/helpers/layered-placement-replay-rows.js';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { LGraph } from '../graph/LGraph.js';
import { HierarchicalPortDummySizeProcessor } from '../intermediate/HierarchicalPortDummySizeProcessor.js';
import { InLayerConstraintProcessor } from '../intermediate/InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from '../intermediate/InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LabelAndNodeSizeProcessor } from '../intermediate/LabelAndNodeSizeProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { LinearSegmentsNodePlacer } from './LinearSegmentsNodePlacer.js';
import { INPUT_PRIO, OUTPUT_PRIO } from './LinearSegmentsNodePlacerProperties.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
/** Java `Integer.MIN_VALUE`, the priority of a node without edges on that side. */
const MIN_INT = -2147483648;

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
        return new HierarchicalPortDummySizeProcessor();
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase(phase, strategy) {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        return new LinearSegmentsNodePlacer();
    }
  },
};

const rows = loadPlacementRows(ROWS_FILE).filter((row) => row.id.startsWith('sites/LinearSegments/'));

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** Replays a site row; returns the graph and the node y coordinates by path. */
function replaySite(id: string): { graph: LGraph; ys: Record<string, number> } {
  const row = rows.find((candidate) => candidate.id === id)!;
  const graph = runSteps(row, factories);
  const { geometry } = placementDump(graph, importRow(row).importDump);
  return {
    graph,
    ys: Object.fromEntries(Object.entries(geometry.nodes).map(([path, n]) => [path, decodeHex(n.pos[1])])),
  };
}

function expectYs(actual: Record<string, number>, expected: Readonly<Record<string, number>>): void {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  Object.entries(expected).forEach(([path, y]) => {
    expect(actual[path], path).toBeCloseTo(y, 6);
  });
}

describe('LinearSegmentsNodePlacer (anchored site cases)', () => {
  // oracle: sites/LinearSegments/dependencyCycle/firstInLayer; LinearSegmentsNodePlacer.java:392-413 (split, no previousNode)
  it('splits a segment that starts the layer (S3 firstInLayer): the two crossing long edges are placed apart', () => {
    const { ys } = replaySite('sites/LinearSegments/dependencyCycle/firstInLayer');
    expectYs(ys, {
      'g0/n0': 3.588334920028098,
      'g0/n1': 53.58833492002809,
      'new/n0': 29.497147609736604,
      'new/n1': 40.497147609736594,
      'g0/n2': 51.497147609736594,
      'new/n2': 18.4971476097366,
      'new/n3': 29.497147609736604,
      'g0/n3': 49.3679843360881,
      'g0/n5': -0.632015663911905,
      'g0/n4': 49.3679843360881,
    });
  });

  // oracle: sites/LinearSegments/dependencyCycle/behindNode; LinearSegmentsNodePlacer.java:392-413 (split, previousNode set)
  it('splits a segment behind a normal node (S3 behindNode): the dependency moves to the new segment', () => {
    const { ys } = replaySite('sites/LinearSegments/dependencyCycle/behindNode');
    expectYs(ys, {
      'g0/n0': 13.13221724800049,
      'g0/n1': 64.62495994040039,
      'g0/n2': 8.13221724800049,
      'new/n0': 56.82982656701563,
      'new/n1': 79.62495994040039,
      'g0/n3': 5.829826567015624,
      'new/n2': 45.82982656701563,
      'new/n3': 56.82982656701563,
      'g0/n5': -1.2367043147216807,
      'g0/n4': 48.76329568527832,
    });
  });

  // oracle: sites/LinearSegments/invertedPorts; LinearSegmentsNodePlacer.java:496 (in-layer successor of a dummy)
  it('places the in-layer dummies of inverted ports (S4)', () => {
    const { ys } = replaySite('sites/LinearSegments/invertedPorts');
    expectYs(ys, {
      'g0/n3': -12.038862671781253,
      'g0/n0': 37.96113732821874,
      'new/n0': 2.961137328218747,
      'g0/n1': 21.401580191171867,
      'new/n1': 99.62080440709374,
      'g0/n2': 34.62080440709376,
      'g0/n4': 84.62080440709374,
    });
  });

  // oracle: sites/LinearSegments/straightnessPriority; LinearSegmentsNodePlacer.java:691-709 (lower priority skipped)
  it('skips the lower-priority incoming edge when it computes the priorities (S5)', () => {
    const { graph, ys } = replaySite('sites/LinearSegments/straightnessPriority');
    expectYs(ys, {
      'g0/n1': -16.788883107499995,
      'g0/n0': 33.2111168925,
      'g0/n2': 24.061552627500003,
      'g0/n3': 19.061552627500006,
      'g0/n4': 69.3614394525,
    });
    // layers: [g0/n1, g0/n0], [g0/n2], [g0/n3, g0/n4]
    const [layer0, layer1, layer2] = graph.getLayers().map((layer) => layer.getNodes());
    const prios = [...layer0!, ...layer1!, ...layer2!].map((n) => [
      n.getProperty(INPUT_PRIO),
      n.getProperty(OUTPUT_PRIO),
    ]);
    expect(prios).toEqual([
      [MIN_INT, 0],
      [MIN_INT, 1],
      [1, 1],
      [1, MIN_INT],
      [0, MIN_INT],
    ]);
  });
});

describe('LinearSegmentsNodePlacer on an empty layer', () => {
  // Java: createDependencyGraphEdges skips the empty layer (LinearSegmentsNodePlacer.java:361-436), mergeRegions calls
  // next() on its iterator unguarded (:770) -> java.util.NoSuchElementException
  it('throws NoSuchElementException (the whole placer fails, as the Java does)', () => {
    const graph = new LGraph();
    const first = addNode(graph);
    first.setLayer(addLayer(graph));
    addLayer(graph);
    const last = addNode(graph);
    last.setLayer(addLayer(graph));
    connect(addPort(first), addPort(last));
    expect(() => new LinearSegmentsNodePlacer().process(graph, new NullElkProgressMonitor())).toThrow(
      NoSuchElementException,
    );
  });
});
