// SPDX-License-Identifier: EPL-2.0
// Port of PortListSorterTest (mission 7c, T8): `testProperPortSideOrder`, @TestAfterProcessor(PortListSorter).
//
// Row selection: the Java graph set is the ptolemy models. The rows are the `models/ptolemy-*` rows of
// test/golden/refs/java/layered-order.json whose last replayed entry is PORT_LIST_SORTER with the default options
// (configuration label `default`). Other model families, `scenarios/*` and `sites/*` rows are excluded.
//
// Deviation, not a row choice: the Java `@Configurator configurePorts` sets PORT_CONSTRAINTS = FIXED_ORDER and a
// PORT_INDEX on every node and port of the ElkGraph before import. The rows' `options` apply to the root only and
// the recorder has no per-element configurator, so there is no recorded row with that configuration; the replayed rows
// carry the models' own constraints (PortSideProcessor makes free nodes FIXED_SIDE, and the sorter then orders by
// side). The side-order invariant is asserted on those graphs.
//
// Not ported: `testMonotonicalCoordinates` (@TestAfterProcessor(LongEdgeJoiner)). It reads port coordinates, which only
// exist after the label and node size processing, node placement, edge routing and LongEdgeJoiner, i.e. after phases 4
// and 5 and processors of missions 7f and 7g that are not ported yet; no recorded row stops there.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/PortListSorterTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'PORT_LIST_SORTER';
const ID_PATTERN = /^models\/ptolemy-[^/]+\/[^/]+\/PORT_LIST_SORTER\/default$/;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      default:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
    }
  },
};

const rows = loadOrderRows(ROWS_FILE).filter((row) => ID_PATTERN.test(row.id) && row.prefix?.at(-1) === STOP);

/** The sides a port may follow, per last side seen (the Java `if`-chain of :95-120 as a table). */
const ALLOWED_AFTER: ReadonlyMap<PortSide | null, readonly PortSide[]> = new Map([
  [null, [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST]],
  [PortSide.NORTH, [PortSide.EAST, PortSide.SOUTH, PortSide.WEST]],
  [PortSide.EAST, [PortSide.SOUTH, PortSide.WEST]],
  [PortSide.SOUTH, [PortSide.WEST]],
  [PortSide.WEST, []],
]);

function testProperPortSideOrder(lGraph: LGraph): void {
  for (const layer of lGraph) {
    for (const node of layer) {
      let lastSide: PortSide | null = null;
      for (const port of node.getPorts()) {
        // upon a side change check that the next side is valid
        if (lastSide !== port.getSide()) {
          // A last side without a branch in the Java chain (UNDEFINED) asserts nothing.
          const allowed = ALLOWED_AFTER.get(lastSide);
          if (allowed !== undefined) {
            expect(
              allowed.includes(port.getSide()),
              `port ${port.toString()} of ${node.toString()} on ${port.getSide().toString()} follows ${String(lastSide)}`,
            ).toBe(true);
          }

          lastSide = port.getSide();
        }
      }
    }
  }
}

describe('PortListSorterTest on the replayed rows', () => {
  it('selects the ptolemy PORT_LIST_SORTER rows', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testProperPortSideOrder', (_id, row) => {
    const graph = runOrderPrefix(row, factories);
    expect([...graph].length).toBeGreaterThan(0);
    testProperPortSideOrder(graph);
  });
});
