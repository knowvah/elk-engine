// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/disco.json (mission 8b, T2 recording, T9 wiring) through the real disco classes at the AD-4
// bar (ids, counts and non-numeric values exact; numbers within 1e-6):
//   full    the RecursiveGraphLayoutEngine run against the recorded ELK dump of the root;
//   stops   the seven steps (split, import, cellSizes, polys, pack, applyToDCGraph, applyLayout), each compared in order, plus a plain
//           DisCoLayoutProvider.layout (and, for a root layout node, the engine) against the applyLayout stop;
//   throws  the class (the port's exception mapping), the message, and the ported file the error is raised in;
//   twin    (FD4) the extension maps of the transformer iterated in reversed insertion order: only a port shared by two extension edges
//           can see the order (`adjustedPorts`).
// Rows whose componentLayoutAlgorithm is `force` need ForceLayoutProvider (task T8); they fail for that reason alone until it lands.
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { portedTop } from '../../../test/helpers/layered-compound-replay-sites.js';
import { compareJson, formatDifferences, TOLERANCE, type Comparison } from '../../../test/helpers/disco-replay-dump.js';
import { importInput } from '../../../test/helpers/disco-replay-elk.js';
import {
  DISCO_STEPS,
  loadDiscoRows,
  stopOf,
  type DiscoStep,
  type StopsRow,
  type ThrowsExpected,
} from '../../../test/helpers/disco-replay-rows.js';
import { runFull, runProvider, runStops, runThrows } from '../../../test/helpers/disco-replay-stops.js';

const HEAVY = { timeout: 60_000 } as const;
const NPE_CLASS = 'java.lang.NullPointerException';
const IAE_CLASS = 'java.lang.IllegalArgumentException';
const IOOBE_CLASS = 'java.lang.IndexOutOfBoundsException';
const NASE_CLASS = 'java.lang.NegativeArraySizeException';
const ROOT_LAYOUT = 'root';

const fullRows = loadDiscoRows('full');
const stopsRows = loadDiscoRows('stops');
const throwsRows = loadDiscoRows('throws');

/** The difference text of one comparison of `actual` with a recorded value, or `[]`. */
const diffsOf = (tag: string, expected: unknown, actual: unknown, into?: Comparison): string[] => {
  const comparison = compareJson(expected, actual, TOLERANCE, '$', into);
  return comparison.differences.length === 0 ? [] : [`${tag}\n${formatDifferences(comparison, 4)}`];
};

const withoutKeys = (value: object, ...keys: string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

describe('disco ref: full rows through RecursiveGraphLayoutEngine', () => {
  it('has the recorded 92 rows', () => {
    expect(fullRows).toHaveLength(92);
  });

  it('every full row matches the recorded dump', HEAVY, () => {
    const failing = fullRows.flatMap((row) => diffsOf(row.id, withoutKeys(row.expected, 'layoutNode'), runFull(row)));
    expect(failing).toEqual([]);
  });
});

describe('disco ref: stops rows, the seven steps', () => {
  it('has the recorded 88 rows', () => {
    expect(stopsRows).toHaveLength(88);
  });

  it('every row records the seven steps in order', () => {
    expect(stopsRows.filter((row) => row.expected.steps.join() !== DISCO_STEPS.join())).toEqual([]);
  });

  it('every step of every row equals the recorded stop', HEAVY, () => {
    const failing = stopsRows.flatMap((row) => {
      const run = runStops(row);
      return DISCO_STEPS.flatMap((step: DiscoStep) => diffsOf(`${row.id} @ ${step}`, stopOf(row, step), run[step]));
    });
    expect(failing).toEqual([]);
  });

  it(
    'a plain DisCoLayoutProvider.layout (and the engine for a root layout node) gives the applyLayout stop',
    HEAVY,
    () => {
      const failing = stopsRows.flatMap((row) => {
        const expected = withoutKeys(stopOf(row, 'applyLayout'), 'step');
        const provider = diffsOf(`${row.id} provider`, expected, runProvider(row));
        const engine =
          row.expected.layoutNode === ROOT_LAYOUT ? diffsOf(`${row.id} engine`, expected, runFull(row)) : [];
        return [...provider, ...engine];
      });
      expect(failing).toEqual([]);
    },
  );
});

/** The TS class a recorded Java exception class maps to, and the Java class name of the first ELK frame's file. */
const MAPPED_CLASSES: Readonly<Record<string, (error: Error) => boolean>> = {
  [NPE_CLASS]: (error) => error instanceof TypeError,
  [IAE_CLASS]: (error) => error instanceof IllegalArgumentException,
  [IOOBE_CLASS]: (error) => error instanceof IndexOutOfBoundsException,
  [NASE_CLASS]: (error) => error.name === 'NegativeArraySizeException',
};

const baseName = (file: string): string => file.slice(file.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '');

/** The differences between a recorded Java throw and the TS error: class, message, and the ported file the error is raised in. */
function throwDiffs(expected: ThrowsExpected, error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [`no Error was thrown: ${String(error)}`];
  }
  const diffs: string[] = [];
  const isMapped = MAPPED_CLASSES[expected.class];
  if (isMapped === undefined || !isMapped(error)) {
    diffs.push(`class ${error.constructor.name} does not map ${expected.class}`);
  }
  if (error.message !== expected.message) {
    diffs.push(`message ${JSON.stringify(error.message)}, expected ${JSON.stringify(expected.message)}`);
  }
  const javaClass = expected.frame.slice(0, expected.frame.indexOf('.java'));
  const top = portedTop(error.stack ?? '');
  if (top === null || baseName(top.file) !== javaClass) {
    diffs.push(`raised in ${top?.file ?? '(no src frame)'}, expected a port of ${expected.frame}`);
  }
  return diffs;
}

describe('disco ref: throws rows, class, message and originating file', () => {
  it('has the recorded 5 rows', () => {
    expect(throwsRows).toHaveLength(5);
  });

  it.each(throwsRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    expect(throwDiffs(row.expected.throws, runThrows(row))).toEqual([]);
  });
});

/** The ids of the ports shared by two or more extension edges of a stops row (computed from the input, not from a run). */
function hasSharedPort(row: StopsRow): boolean {
  const root = importInput(row);
  const seen = new Set<unknown>();
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    stack.push(...node.getChildren());
    for (const port of node.getPorts()) {
      const edges = [...port.getIncomingEdges(), ...port.getOutgoingEdges()];
      if (edges.length > 1 && !seen.has(port)) {
        seen.add(port);
      }
    }
  }
  return seen.size > 0;
}

const EXTENSION_ROWS = stopsRows.filter((row) => {
  const run = runStops(row);
  return run.incomingOrder.length + run.outgoingOrder.length > 0;
});

describe('disco ref: twin of the extension-map iteration order (FD4)', () => {
  it('iterates the maps in the insertion order the oracle recorded', () => {
    const orders = new Map(EXTENSION_ROWS.map((row) => [row.id, runStops(row)] as const));
    expect(orders.get('stops/ext/default')?.incomingOrder).toEqual(['xinw', 'xinn']);
    expect(orders.get('stops/ext/default')?.outgoingOrder).toEqual(['xoute', 'xouts']);
    expect(orders.get('stops/extShared/default')?.incomingOrder).toEqual(['xin1', 'xin2', 'xinn']);
    expect(orders.get('stops/extSharedInOut/default')?.incomingOrder).toEqual(['xin']);
    expect(orders.get('stops/extSharedInOut/default')?.outgoingOrder).toEqual(['xout', 'xout1', 'xout2']);
  });

  it('only a row with a port shared by two edges can see the order, and it then differs from the oracle', HEAVY, () => {
    const outcome = EXTENSION_ROWS.map((row) => {
      const forward = runStops(row);
      const reversedRun = runStops(row, true);
      const differs = JSON.stringify(forward.applyLayout) !== JSON.stringify(reversedRun.applyLayout);
      const matchesOracle = diffsOf('', stopOf(row, 'applyLayout'), reversedRun.applyLayout).length === 0;
      return { id: row.id, reach: forward.adjustedPorts > 0, differs, matchesOracle, shared: hasSharedPort(row) };
    });
    expect(outcome.filter((o) => o.differs && !o.shared).map((o) => o.id)).toEqual([]);
    expect(outcome.filter((o) => o.differs && o.matchesOracle).map((o) => o.id)).toEqual([]);
    expect(outcome.filter((o) => o.reach).length).toBeGreaterThan(0);
    expect(outcome.filter((o) => o.differs).length).toBeGreaterThan(0);
  });
});
