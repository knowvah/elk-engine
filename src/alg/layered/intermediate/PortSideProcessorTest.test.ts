// SPDX-License-Identifier: EPL-2.0
// Port of PortSideProcessorTest (mission 7c, T8): `testNodeConstraints` and `testPortSides`, both
// @TestAfterProcessor(PortSideProcessor).
//
// Row selection: the Java graph set is the ptolemy models under @DefaultConfiguration (no configurator). The rows are the
// `models/ptolemy-*` rows of test/golden/refs/java/layered-order.json whose last replayed entry is PORT_SIDE_PROCESSOR
// with the default options (configuration label `default`). Other model families, `scenarios/*` and `sites/*` rows are
// excluded.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/PortSideProcessorTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'PORT_SIDE_PROCESSOR';
const ID_PATTERN = /^models\/ptolemy-[^/]+\/[^/]+\/PORT_SIDE_PROCESSOR\/default$/;

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

/** No node exists with PortConstraints set to FREE or UNDEFINED (Java :55-63). */
function testNodeConstraints(lGraph: LGraph): void {
  for (const layer of lGraph) {
    for (const node of layer) {
      expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()).toBe(true);
    }
  }
}

/** Every port has a specified side (Java :68-79). */
function testPortSides(lGraph: LGraph): void {
  for (const layer of lGraph) {
    for (const node of layer) {
      for (const port of node.getPorts()) {
        expect(port.getSide() !== PortSide.UNDEFINED).toBe(true);
      }
    }
  }
}

describe('PortSideProcessorTest on the replayed rows', () => {
  it('selects the ptolemy PORT_SIDE_PROCESSOR rows', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  describe.each([
    ['testNodeConstraints', testNodeConstraints],
    ['testPortSides', testPortSides],
  ] as const)('%s', (_name, check) => {
    it.each(rows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      const graph = runOrderPrefix(row, factories);
      expect([...graph].length).toBeGreaterThan(0);
      check(graph);
    });
  });
});
