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
// `testMonotonicalCoordinates` (@TestAfterProcessor(LongEdgeJoiner)) and the Java `@Configurator configurePorts` are ported
// in the second describe (mission 7f, T12a), through the layout test runner over the vendored ptolemy models, together
// with `testProperPortSideOrder` under that configurator. The first two describes are the 7c replay of the recorded rows.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/PortListSorterTest.java
import { describe, expect, it } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { PTOLEMY_GRAPHS } from '../../../../test/helpers/ptolemy-suite-sources.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { LongEdgeJoiner } from './LongEdgeJoiner.js';
import { PortListSorter } from './PortListSorter.js';

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

/** The Java `@Configurator configurePorts`: FIXED_ORDER on every node, with an index on each of its ports. */
function configurePorts(graph: ElkNode): void {
  const nodeQueue: ElkNode[] = [...graph.getChildren()];

  while (nodeQueue.length > 0) {
    const node = nodeQueue.shift()!;
    nodeQueue.push(...node.getChildren());

    if (node.getProperty(LayeredOptions.PORT_CONSTRAINTS) !== PortConstraints.FIXED_ORDER) {
      node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);

      let index = 0;
      for (const port of node.getPorts()) {
        port.setProperty(LayeredOptions.PORT_INDEX, index++);
      }
    }
  }
}

/** Waits until port coordinates have been assigned to check whether they reflect the port order. */
function testMonotonicalCoordinates(lGraph: LGraph): void {
  for (const layer of lGraph) {
    for (const node of layer) {
      let lastPos: number | null = null;
      let lastSide: PortSide | null = null;

      for (const port of node.getPorts()) {
        // upon side change reset the reference position
        if (lastSide === null || lastSide !== port.getSide()) {
          if (port.getSide() === PortSide.NORTH || port.getSide() === PortSide.SOUTH) {
            lastPos = port.getPosition().x;
          } else if (port.getSide() === PortSide.EAST || port.getSide() === PortSide.WEST) {
            lastPos = port.getPosition().y;
          }

          lastSide = port.getSide();
          continue;
        }

        // check the positions (`lastPos` was set by the reset above: the side is one of the four)
        const position = port.getPosition();
        if (port.getSide() === PortSide.NORTH) {
          expect(lastPos! <= position.x).toBe(true);
        } else if (port.getSide() === PortSide.EAST) {
          expect(lastPos! <= position.y).toBe(true);
        } else if (port.getSide() === PortSide.SOUTH) {
          expect(lastPos! >= position.x).toBe(true);
        } else if (port.getSide() === PortSide.WEST) {
          expect(lastPos! >= position.y).toBe(true);
        }
      }
    }
  }
}

defineLayoutTest({
  name: 'PortListSorterTest with configurePorts over the vendored ptolemy models',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: PTOLEMY_GRAPHS,
  configurators: { configurePorts },
  afterProcessor: [
    { name: 'testProperPortSideOrder', cls: PortListSorter, check: testProperPortSideOrder },
    { name: 'testMonotonicalCoordinates', cls: LongEdgeJoiner, check: testMonotonicalCoordinates },
  ],
});
