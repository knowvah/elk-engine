// SPDX-License-Identifier: EPL-2.0
// Port of NorthSouthPortPreprocessorTest (mission 7c, T8): `testIsolatedNorthSouthPorts` and its helper
// `failOnNorthSouthPortConnections`, @TestAfterProcessor(NorthSouthPortPreprocessor).
//
// Row selection: the Java graph set is tests/layered/north_south_ports/** with no configurator. The rows are the
// `models/north_south_ports-*` rows of test/golden/refs/java/layered-order.json whose last replayed entry is
// NORTH_SOUTH_PORT_PREPROCESSOR with the default options (configuration label `default`; the recorder keeps the
// processor only on graphs that have NORTH_SOUTH_PORTS). Other model families, `scenarios/*` and `sites/*` are excluded.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/NorthSouthPortPreprocessorTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows } from '../../../../test/helpers/layered-order-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LNode } from '../graph/LNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'NORTH_SOUTH_PORT_PREPROCESSOR';
const ID_PATTERN = /^models\/north_south_ports-[^/]+\/[^/]+\/NORTH_SOUTH_PORT_PREPROCESSOR\/default$/;

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

function failOnNorthSouthPortConnections(lNode: LNode): void {
  const fail = lNode
    .getPorts()
    .filter((lPort) => PortSide.SIDES_NORTH_SOUTH.has(lPort.getSide()))
    .some((lPort) => lPort.getConnectedEdges()[Symbol.iterator]().next().done !== true);

  expect(fail, `${lNode.toString()} still has edges at a north or south port`).toBe(false);
}

function testIsolatedNorthSouthPorts(graph: LGraph): number {
  const nodes = graph
    .getLayers()
    .flatMap((layer) => layer.getNodes())
    .filter((node) => node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed());
  nodes.forEach((node) => {
    failOnNorthSouthPortConnections(node);
  });
  return nodes.length;
}

describe('NorthSouthPortPreprocessorTest on the replayed rows', () => {
  it('selects the north_south_ports NORTH_SOUTH_PORT_PREPROCESSOR rows', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testIsolatedNorthSouthPorts', (_id, row) => {
    expect(testIsolatedNorthSouthPorts(runOrderPrefix(row, factories))).toBeGreaterThan(0);
  });
});
