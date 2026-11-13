// SPDX-License-Identifier: EPL-2.0
// Replay of `test/golden/refs/java/rectpacking.json` through `RecursiveGraphLayoutEngine` with the real `RectPackingLayoutProvider`
// (mission 8c, T12; the contract is the header of tools/vectors/RectPackingVectors.java):
//   full    558 rows  the final dump of the root equals the row at the AD-4 bar (ids, counts, strings exact; doubles within 1e-6);
//   stops   151 rows  every stop of every graph entry, taken at the provider's own logGraph points, and `final`, from ONE run;
//   throws    7 rows  the root cause by class name and message (`emptyGreedy` calls the provider directly, mode "provider"; a JVM
//                     NullPointerException is a TypeError, its message is JVM text, so its ported frame file is compared instead);
//   sort    640 rows  PK7: `Array.prototype.sort` with the verbatim comparator of InteractiveNodeReorderer.java:56-63.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  compareJson,
  formatDifferences,
  TOLERANCE,
  type Comparison,
} from '../../../test/helpers/rectpacking-replay-dump.js';
import { registerRectPackingEngine } from '../../../test/helpers/rectpacking-replay-elk.js';
import {
  expectedThrowName,
  isJvmNullPointer,
  portedFrameFile,
  runFullRow,
  runStopsRow,
  runThrowsRow,
} from '../../../test/helpers/rectpacking-replay-provider.js';
import { JAVA_ONLY_THROW_ROWS, ORDER_DIFFERENCE_ROWS } from '../../../test/helpers/rectpacking-sort-classified.js';
import { loadRectPackingRows } from '../../../test/helpers/rectpacking-replay-rows.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { compareDesiredPositions } from './intermediate/InteractiveNodeReorderer.js';
import { RectPackingOptions } from './options/RectPackingOptions.js';
import { Compactor } from './p2packing/Compactor.js';

const LOOP = { timeout: 60_000 };
const FULL_ROWS = 558;
const STOPS_ROWS = 151;
const THROWS_ROWS = 7;
const SORT_ROWS = 640;
/** `compaction.iterations` values that occur only in full rows (the stops rows replay the others). */
const FULL_ONLY_ITERATIONS = [0, 6];
const JAVA_ONLY_THROW = 'java-only-throw';
const ORDER_DIFFERENCE = 'order-difference';

const emptyComparison = (): Comparison => ({ differences: [], hexExact: 0, hexClose: 0 });

/** Folds `compareJson(expected, actual)` of one row into `total`; a row with a difference is named in `failures`. */
function fold(total: Comparison, failures: string[], id: string, expected: unknown, actual: unknown): void {
  const one = compareJson(expected, actual, TOLERANCE);
  total.hexExact += one.hexExact;
  total.hexClose += one.hexClose;
  if (one.differences.length > 0) {
    failures.push(`${id}\n${formatDifferences(one, 4)}`);
  }
}

describe('rectpacking.json replay through the engine', () => {
  // Compaction.java:74 prints its empty-block text to stderr on recorded inputs (console.error): keep the run output clean.
  beforeAll(() => {
    registerRectPackingEngine();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('has the recorded row counts', () => {
    expect(loadRectPackingRows('full')).toHaveLength(FULL_ROWS);
    expect(loadRectPackingRows('stops')).toHaveLength(STOPS_ROWS);
    expect(loadRectPackingRows('throws')).toHaveLength(THROWS_ROWS);
    expect(loadRectPackingRows('sort')).toHaveLength(SORT_ROWS);
  });

  it(
    'full rows: the engine run ends in the recorded dump (AD-4 bar), including compaction.iterations 0 and 6',
    LOOP,
    () => {
      const iterations = new Set<number>();
      const spy = vi.spyOn(Compactor.prototype, 'process');
      const total = emptyComparison();
      const failures: string[] = [];
      try {
        for (const row of loadRectPackingRows('full')) {
          const { layoutNode, mode, ...expected } = row.expected;
          void layoutNode;
          void mode;
          fold(total, failures, row.id, expected, runFullRow(row));
        }
        for (const call of spy.mock.calls) {
          iterations.add(call[0].getProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS));
        }
      } finally {
        spy.mockRestore();
      }
      expect(failures).toEqual([]);
      for (const value of FULL_ONLY_ITERATIONS) {
        expect(iterations.has(value)).toBe(true);
      }
      console.info(
        `full rows: ${String(total.hexExact)} bit-exact doubles, ${String(total.hexClose)} within 1e-6 only`,
      );
    },
  );

  it('stops rows: every stop of every graph entry and the final dump equal the row (one run each)', LOOP, () => {
    const total = emptyComparison();
    const failures: string[] = [];
    let stops = 0;
    for (const row of loadRectPackingRows('stops')) {
      const actual = runStopsRow(row);
      stops += actual.graphs.reduce((sum, run) => sum + run.stops.length, 0);
      fold(total, failures, row.id, { graphs: row.expected.graphs, final: row.expected.final }, actual);
    }
    expect(failures).toEqual([]);
    expect(stops).toBeGreaterThan(0);
    console.info(
      `stops rows: ${String(stops)} stops, ${String(total.hexExact)} bit-exact doubles, ${String(total.hexClose)} within 1e-6 only`,
    );
  });

  it.each(loadRectPackingRows('throws').map((row) => [row.id, row] as const))(
    'throws row %s: root cause class and message',
    (_id, row) => {
      const thrown = runThrowsRow(row);
      expect(thrown.name).toBe(expectedThrowName(row));
      if (isJvmNullPointer(row)) {
        expect(thrown.stack).toContain(portedFrameFile(row));
      } else {
        expect(thrown.message).toBe(row.expected.throws.message);
      }
    },
  );
});

const positionedNodes = (positions: readonly number[]): ElkNode[] => {
  const parent = ElkGraphUtil.createGraph();
  return positions.map((position, index) => {
    const node = ElkGraphUtil.createNode(parent);
    node.setIdentifier(String(index));
    node.setProperty(RectPackingOptions.DESIRED_POSITION, position);
    return node;
  });
};

describe('PK7: the sort proof', () => {
  registerRectPackingEngine();

  it(
    'Array.prototype.sort with the verbatim comparator reproduces every sort row except the classified ones',
    LOOP,
    () => {
      const differing: { id: string; kind: string }[] = [];
      let reproduced = 0;
      for (const row of loadRectPackingRows('sort')) {
        const nodes = positionedNodes(row.input.positions);
        nodes.sort(compareDesiredPositions);
        const order = nodes.map((node) => Number(node.getIdentifier()));
        if ('throws' in row.expected) {
          differing.push({ id: row.id, kind: JAVA_ONLY_THROW });
        } else if (JSON.stringify(order) === JSON.stringify(row.expected.order)) {
          reproduced++;
        } else {
          differing.push({ id: row.id, kind: ORDER_DIFFERENCE });
        }
      }
      expect(differing.filter((d) => d.kind === JAVA_ONLY_THROW).map((d) => d.id)).toEqual(JAVA_ONLY_THROW_ROWS);
      expect(differing.filter((d) => d.kind === ORDER_DIFFERENCE).map((d) => d.id)).toEqual(ORDER_DIFFERENCE_ROWS);
      expect(reproduced + differing.length).toBe(SORT_ROWS);
      console.info(
        `sort rows: ${String(reproduced)} reproduced, ${String(differing.filter((d) => d.kind === JAVA_ONLY_THROW).length)} java-only throws, ${String(differing.filter((d) => d.kind === ORDER_DIFFERENCE).length)} order differences`,
      );
    },
  );
});
