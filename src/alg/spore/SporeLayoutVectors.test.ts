// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/spore-layout.json through the real providers (mission 8c, T11): a row's input runs through
// `RecursiveGraphLayoutEngine` (OverlapRemovalLayoutProvider / ShrinkTreeLayoutProvider) and every stop of the recorder is observed on
// that run by prototype wrappers (test/helpers/spore-replay-providers.ts). AD-4: ids, counts and non-numeric values exact, numbers
// within 1e-6 (the tallies report how many doubles are raw-bit identical). `jitter` rows (PK4) are checked by their invariants only.
// SPORE_CHAIN_FULL=1 also runs `full/compaction/chain2000/default` (cubic DepthFirstCompaction).
import { afterAll, describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import {
  childOrigins,
  compareTo,
  displacementBound,
  maxDisplacement,
  newTally,
  overlapFree,
  type MinstCall,
  type Tally,
} from '../../../test/helpers/spore-replay-dump.js';
import { dumpElk, importInput } from '../../../test/helpers/spore-replay-elk.js';
import { replayProvider, runProvider, type ProviderResult } from '../../../test/helpers/spore-replay-providers.js';
import {
  COMPACTION_ALGORITHM,
  decodeHex,
  loadSporeRows,
  OVERLAP_ALGORITHM,
  STEP_END,
  type FullRow,
  type MinstRow,
} from '../../../test/helpers/spore-replay-rows.js';

const TIMEOUT = { timeout: 60_000 };
const CHAIN_ROW = 'full/compaction/chain2000/default';
const CHAIN_FLAG = 'SPORE_CHAIN_FULL';
const NPE_CLASS = 'java.lang.NullPointerException';

const totals: Tally = newTally();

/** Asserts a comparison found no difference at the AD-4 bar; adds its counts to the totals. */
function expectEqual(expected: unknown, actual: unknown, where: string): void {
  const tally = compareTo(expected, actual, where);
  expect(tally.first).toBeNull();
  totals.identical += tally.identical;
  totals.within += tally.within;
}

function run(row: {
  id: string;
  input: Readonly<Record<string, unknown>>;
  expected: { algorithm: string };
}): ProviderResult {
  const result = replayProvider(row);
  expect(result.thrown).toBeNull();
  return result;
}

afterAll(() => {
  if (process.env['SPORE_REPORT'] !== undefined) {
    console.info(
      `spore replay doubles: ${String(totals.identical)} raw-bit identical, ${String(totals.within)} within 1e-6`,
    );
  }
});

/** The `full` check of one row: end dump, jitter guard and tie summary. */
function checkFull(row: FullRow): void {
  const result = run(row);
  const { algorithm, jitterNodes, tieOrder, ...expectedDump } = row.expected;
  expectEqual(expectedDump, result.dump, row.id);
  // a root without children never reaches the provider: no stop at all, and nothing changed
  const end = result.stops[result.stops.length - 1];
  const childless = ((row.input['children'] as unknown[] | undefined) ?? []).length === 0;
  expect(end === undefined).toBe(childless);
  if (end !== undefined) {
    const { step, iterations, ...endDump } = end as typeof end & { iterations: number | null };
    expect(step).toBe(STEP_END);
    expect(iterations === null).toBe(algorithm === COMPACTION_ALGORITHM);
    expectEqual(expectedDump, endDump, row.id);
  }
  expect(result.jitterNodes).toBe(jitterNodes);
  expect({
    calls: result.minst.length,
    orderSensitive: result.minst.some((m) => m.orderSensitive),
    treeified: result.minst.some((m) => m.treeified),
  }).toEqual(tieOrder);
}

describe('spore providers: full rows through RecursiveGraphLayoutEngine', () => {
  const all = loadSporeRows('full');
  const rows = all.filter((row) => row.id !== CHAIN_ROW);

  // 113 full, 60 stops and 4 throws rows until e7eaea57: eclipse-elk/elk#1244 turns throws/overlap/scanlineHitboxes into a full row with its stops (#104, D4)
  it('the ref has 114 full rows, one of them the cubic compaction chain', () => {
    expect(all).toHaveLength(114);
    expect(rows).toHaveLength(113);
  });

  it.each(rows.map((row) => row.id))('%s: the end dump and tie summary equal the row', TIMEOUT, (id) => {
    checkFull(rows.find((r) => r.id === id)!);
  });

  it.skipIf(process.env[CHAIN_FLAG] === undefined)(
    `${CHAIN_ROW} (set ${CHAIN_FLAG}=1; cubic)`,
    { timeout: Number(process.env.SPORE_CHAIN_TIMEOUT ?? 600_000) },
    () => {
      checkFull(all.find((r) => r.id === CHAIN_ROW)!);
    },
  );

  it('the only treeified row is the 2,000-node overlap chain; it is order-insensitive, so its end dump is compared too', () => {
    const treeified = all.filter((row) => row.expected.tieOrder.treeified);
    expect(treeified.map((row) => row.id)).toEqual(['full/overlap/chain2000/default']);
    expect(treeified[0]!.expected.tieOrder.orderSensitive).toBe(false);
  });
});

describe('spore providers: stops rows, every stop of the recorder observed on the real run', () => {
  const rows = loadSporeRows('stops');

  it('the ref has 61 stops rows', () => {
    expect(rows).toHaveLength(61);
  });

  it.each(rows.map((row) => row.id))('%s: every recorded stop equals the observed one', TIMEOUT, (id) => {
    const row = rows.find((r) => r.id === id)!;
    const result = run(row);
    expect(result.stops.map((s) => s.step)).toEqual(row.expected.stops.map((s) => s.step));
    expectEqual(row.expected.stops, result.stops, id);
    expect(result.jitterNodes).toBe(row.expected.jitterNodes);
    expect({
      calls: result.minst.length,
      orderSensitive: result.minst.some((m) => m.orderSensitive),
      treeified: result.minst.some((m) => m.treeified),
    }).toEqual(row.expected.tieOrder);
  });
});

/** The call of a minst row: its input run once per base id (`.../i<n>` rows share one run), the call with the row's iteration. */
function callOf(row: MinstRow): MinstCall {
  const result = run({ ...row, id: row.id.replace(/\/i\d+$/, '') });
  expect(result.jitterNodes).toBe(row.expected.jitterNodes);
  const call = result.minst.find((m) => m.iteration === row.expected.iteration);
  expect(call).toBeDefined();
  return call!;
}

describe('spore providers: minst rows (the edge sequence handed to NaiveMinST and the tree)', () => {
  const rows = loadSporeRows('minst');

  it('the ref has 95 minst rows', () => {
    expect(rows).toHaveLength(95);
  });

  it.each(rows.map((row) => row.id))(
    '%s: edge sequence, weights, tree and reversed tree equal the row',
    TIMEOUT,
    (id) => {
      const row = rows.find((r) => r.id === id)!;
      const { algorithm, jitterNodes, ...expected } = row.expected;
      expect([algorithm, jitterNodes]).toEqual([row.expected.algorithm, 0]);
      expectEqual(expected, callOf(row), id);
    },
  );

  it('all 76 order-sensitive rows build another tree from the reversed edges, in the recorded order', TIMEOUT, () => {
    const sensitive = rows.filter((r) => r.expected.orderSensitive);
    expect(sensitive).toHaveLength(76);
    for (const row of sensitive) {
      const call = callOf(row);
      expect(call.orderSensitive).toBe(true);
      expect(call.tree).toEqual(row.expected.tree);
      expect(call.reversedTree).toEqual(row.expected.reversedTree);
      expect(call.tree).not.toEqual(call.reversedTree);
    }
  });
});

describe('spore providers: throws rows', () => {
  const rows = loadSporeRows('throws');

  /** The Java root-cause classes and what the port throws (a JVM NullPointerException is a TypeError, D10). */
  const CLASSES: Record<string, abstract new (...args: never[]) => unknown> = {
    'java.lang.IllegalArgumentException': IllegalArgumentException,
    'java.lang.IllegalStateException': IllegalStateException,
    [NPE_CLASS]: TypeError,
  };

  it('the ref has 3 throws rows', () => {
    expect(rows).toHaveLength(3);
  });

  it.each(rows.map((row) => row.id))('%s: the same class, and the same message unless it is JVM text', (id) => {
    const row = rows.find((r) => r.id === id)!;
    const { thrown } = replayProvider(row);
    const recorded = row.expected.throws;
    expect(thrown).toBeInstanceOf(CLASSES[recorded.class]);
    if (recorded.class !== NPE_CLASS) {
      expect((thrown as Error).message).toBe(recorded.message);
    }
  });
});

describe('spore providers: jitter rows (PK4, invariants only)', () => {
  const rows = loadSporeRows('jitter');
  const RUNS = 3;

  it('the ref has 4 jitter rows', () => {
    expect(rows).toHaveLength(4);
  });

  it.each(rows.map((row) => row.id))(
    '%s: node count, jittered centres, displacement bound, overlap freedom',
    TIMEOUT,
    (id) => {
      const row = rows.find((r) => r.id === id)!;
      const invariants = row.expected.invariants;
      const dumps = new Set<string>();
      for (let k = 0; k < RUNS; k++) {
        const root = importInput(row);
        const before = childOrigins(root);
        const result = runProvider(root, row.expected.algorithm);
        expect(result.thrown).toBeNull();
        expect([...root.getChildren()]).toHaveLength(invariants.nodeCount);
        expect(result.jitterNodes).toBe(invariants.jitterNodes);
        expect(maxDisplacement(root, before)).toBeLessThanOrEqual(decodeHex(invariants.maxDisplacementBound));
        expect(row.expected.algorithm === OVERLAP_ALGORITHM ? overlapFree(root) : null).toBe(invariants.overlapFree);
        dumps.add(JSON.stringify(dumpElk(root)));
      }
      // the bound is computed from the input alone
      expect(displacementBound(importInput(row))).toBe(decodeHex(invariants.maxDisplacementBound));
      // the coincident centres are shifted by a Random seeded with randomSeed (default 1) since eclipse-elk/elk#1242, so every run
      // gives the same dump; until e7eaea57 an unseeded Math.random() made runsAgree false and every dump distinct (#104, D5.7)
      expect(invariants.runsAgree).toBe(true);
      expect(dumps.size).toBe(1);
    },
  );
});
