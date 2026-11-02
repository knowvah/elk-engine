// SPDX-License-Identifier: EPL-2.0
// Port of BasicNodePlacementTest (mission 7d, T8): `testProperCoordinates`, which the Java runs after each of
// BKNodePlacer, LinearSegmentsNodePlacer, NetworkSimplexPlacer and SimpleNodePlacer (`@TestAfterProcessor`, :190-193),
// for the 15 runs of the class: the default run (`@DefaultConfiguration`, BRANDES_KOEPF), the 14
// `@ConfiguratorProvider`s (:72-176) for SIMPLE, LINEAR_SEGMENTS and NETWORK_SIMPLEX, and BRANDES_KOEPF with edge
// straightening NONE x fixed alignment {NONE, LEFTUP, LEFTDOWN, RIGHTUP, RIGHTDOWN, BALANCED} and IMPROVE_STRAIGHTNESS x
// {LEFTUP, LEFTDOWN, RIGHTUP, RIGHTDOWN, BALANCED} (the Java declares no IMPROVE_STRAIGHTNESS x NONE provider).
//
// Row selection: the `models/*` rows of test/golden/refs/java/layered-placement.json that stop at a P4_NODE_PLACEMENT
// strategy and whose id's configuration label (the last path segment) names one of those 14 configurations
// (`SIMPLE`, `LINEAR_SEGMENTS`, `NETWORK_SIMPLEX`, `BRANDES_KOEPF` and `bk-<straightening>-<alignment>`). INTERACTIVE
// rows (the Java runs none), `scenarios/*`, `sites/*` and the other option variants are excluded. Each row is replayed
// through the real factories to its P4 stop and the Java method is called on the resulting graph.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p4nodes/BasicNodePlacementTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { runPlacementPrefix } from '../../../../test/helpers/layered-placement-replay-ops.js';
import { loadPlacementRows, type PlacementRow } from '../../../../test/helpers/layered-placement-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const PLACEMENT_STOP_PREFIX = 'P4_NODE_PLACEMENT/';
const ID_SEPARATOR = '/';

const ALIGNMENTS = ['LEFTUP', 'LEFTDOWN', 'RIGHTUP', 'RIGHTDOWN', 'BALANCED'] as const;

/** The configuration labels of the 15 runs, as the last segment of a row id. */
const CONFIGURATIONS: readonly string[] = [
  'SIMPLE',
  'LINEAR_SEGMENTS',
  'NETWORK_SIMPLEX',
  'BRANDES_KOEPF',
  'bk-NONE-NONE',
  ...ALIGNMENTS.flatMap((alignment) => [`bk-NONE-${alignment}`, `bk-IMPROVE_STRAIGHTNESS-${alignment}`]),
];

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        return NodePlacementStrategy.valueOf(strategy).create();
    }
  },
};

const configurationOf = (row: PlacementRow): string => row.id.slice(row.id.lastIndexOf(ID_SEPARATOR) + 1);

const rows = loadPlacementRows(ROWS_FILE).filter(
  (row) =>
    row.group === 'models' &&
    CONFIGURATIONS.includes(configurationOf(row)) &&
    row.prefix?.at(-1)?.startsWith(PLACEMENT_STOP_PREFIX) === true &&
    row.prefix.at(-1) !== `${PLACEMENT_STOP_PREFIX}INTERACTIVE`,
);

/** `testProperCoordinates` (BasicNodePlacementTest.java:194-210). */
function testProperCoordinates(lGraph: LGraph): void {
  for (const layer of lGraph) {
    const nodeIter = layer.getNodes()[Symbol.iterator]();
    let next = nodeIter.next();
    if (next.done === true) {
      throw new Error('NoSuchElementException'); // Iterator.next() on an empty layer
    }
    let node = next.value;
    let lastBottomY = node.getPosition().y + node.getSize().y;

    for (next = nodeIter.next(); next.done !== true; next = nodeIter.next()) {
      node = next.value;
      expect(lastBottomY < node.getPosition().y).toBe(true);

      lastBottomY = node.getPosition().y + node.getSize().y;
    }
  }
}

describe('BasicNodePlacementTest on the replayed rows', () => {
  it.each(CONFIGURATIONS)('selects rows for the configuration %s', (configuration) => {
    expect(rows.filter((row) => configurationOf(row) === configuration).length).toBeGreaterThan(0);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testProperCoordinates', (_id, row) => {
    testProperCoordinates(runPlacementPrefix(row, factories));
  });
});
