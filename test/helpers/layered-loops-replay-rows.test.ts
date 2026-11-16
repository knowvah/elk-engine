// SPDX-License-Identifier: EPL-2.0
// The behaviour of the loops row helpers themselves (T2), proven on the landed layered-labels.json (same row shape): every row
// replays with no mismatch through the new loader and comparator; a perturbed row reports a mismatch naming element and field;
// an absent ref is reported with a message naming T1. Nothing here is an oracle literal: expectations are the recorded rows.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { EndLabelPostprocessor } from '../../src/alg/layered/intermediate/EndLabelPostprocessor.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { registerLayered } from './layered-framework-replay.js';
import { labelsRefPath } from './layered-labels-replay-rows.js';
import { registerTwinHook, reverseNodeMapProperty, unregisterTwinHook } from './layered-loops-replay-ops.js';
import {
  LOOPS_ROW_GROUPS,
  describeLoops,
  familyOf,
  isFullRow,
  isStopRow,
  loadLoopsRows,
  loadLoopsRowsIfPresent,
  loopsSkipMessage,
  registerLoopsEnums,
  replayLoopsRow,
  rowsByClass,
  rowsByFamily,
  rowsByGroup,
  type FullRow,
  type LoopsRow,
  type PipelineStopRow,
} from './layered-loops-replay-rows.js';
import { ENUM_TYPES } from './layered-site-replay-registry.js';
import { WrappingStrategy } from '../../src/alg/layered/options/WrappingStrategy.js';
import { CuttingStrategy } from '../../src/alg/layered/options/CuttingStrategy.js';
import { ValidifyStrategy } from '../../src/alg/layered/options/ValidifyStrategy.js';
import { GraphCompactionStrategy } from '../../src/alg/layered/options/GraphCompactionStrategy.js';
import { ConstraintCalculationStrategy } from '../../src/alg/layered/options/ConstraintCalculationStrategy.js';
import { SelfLoopDistributionStrategy } from '../../src/alg/layered/options/SelfLoopDistributionStrategy.js';
import { SelfLoopOrderingStrategy } from '../../src/alg/layered/options/SelfLoopOrderingStrategy.js';

const LABELS = labelsRefPath();
const PERTURBATION = 2e-6;
const FX2_SCENARIO = 'scenarios/Layout/logging/fx2/LEFT';
const ABSENT = '/nonexistent-dir/layered-loops.json';

const labelsRows = (): readonly LoopsRow[] => loadLoopsRows(undefined, LABELS);
const header = (): { rowCounts: Record<string, number> } =>
  JSON.parse(readFileSync(LABELS, 'utf8')) as { rowCounts: Record<string, number> };

beforeAll(() => {
  registerLayered();
});

describe('loader and listing', () => {
  it('loads every row of a ref of the same shape, per the rowCounts header, by group', () => {
    const counts = header().rowCounts;
    for (const group of LOOPS_ROW_GROUPS) {
      expect(loadLoopsRows(group, LABELS)).toHaveLength(counts[group]!);
      expect(rowsByGroup(group, labelsRows())).toHaveLength(counts[group]!);
    }
    expect(labelsRows()).toHaveLength(Object.values(counts).reduce((a, b) => a + b, 0));
  });

  it('caches the rows of a file', () => {
    expect(loadLoopsRows(undefined, LABELS)).toBe(loadLoopsRows(undefined, LABELS));
  });

  it('lists rows by family and by class (a whole id segment, never a string prefix)', () => {
    const family = rowsByFamily('scenarios', 'LabelDummyInserter', labelsRows());
    expect(family.length).toBeGreaterThan(0);
    expect(family.every((row) => row.id.startsWith('scenarios/LabelDummyInserter/'))).toBe(true);
    expect(family.map(familyOf)).toEqual(family.map(() => 'LabelDummyInserter'));
    expect(rowsByClass('scenarios/LabelDummyInserter', labelsRows()).map((r) => r.id)).toEqual(family.map((r) => r.id));
    expect(rowsByClass('scenarios/LabelDummy', labelsRows())).toEqual([]);
  });

  it('reports an absent ref with a message naming T1', () => {
    expect(loopsSkipMessage(ABSENT)).toContain('T1');
    expect(loopsSkipMessage(ABSENT)).toContain('layered-loops.json');
    expect(loadLoopsRowsIfPresent(undefined, ABSENT)).toEqual([]);
    expect(() => loadLoopsRows('full', ABSENT)).toThrow(/T1/);
  });
});

// registered with an absent path: vitest reports one skipped test titled with the T1 message, and the body never runs
describeLoops(
  'absent loops ref (expected skip, names T1)',
  () => {
    it('never runs', () => {
      throw new Error('a suite behind an absent ref must not run');
    });
  },
  ABSENT,
);

describe('enum registry', () => {
  it('holds the loops option enums by simple name', () => {
    registerLoopsEnums();
    const expected = [
      WrappingStrategy,
      CuttingStrategy,
      ValidifyStrategy,
      GraphCompactionStrategy,
      ConstraintCalculationStrategy,
      SelfLoopDistributionStrategy,
      SelfLoopOrderingStrategy,
    ];
    for (const type of expected) {
      expect(ENUM_TYPES[type.name]).toBe(type);
    }
    expect(ENUM_TYPES.EdgeRouting).toBeDefined();
  });
});

describe('replay of the landed layered-labels.json through the new helpers', () => {
  for (const group of LOOPS_ROW_GROUPS) {
    it(`replays every ${group} row with no mismatch`, { timeout: 600_000 }, () => {
      const failures = loadLoopsRows(group, LABELS)
        .map((row) => ({ id: row.id, mismatches: replayLoopsRow(row) }))
        .filter((r) => r.mismatches.length > 0)
        .map((r) => `${r.id}: ${JSON.stringify(r.mismatches[0])}`);
      expect(failures).toEqual([]);
    });
  }
});

describe('twin option', () => {
  it('replays the FX2 logging scenario equal to the oracle with END_LABELS rebuilt in reverse', () => {
    registerTwinHook({
      name: 'reverse-end-labels',
      target: EndLabelPostprocessor,
      before: reverseNodeMapProperty(InternalProperties.END_LABELS),
    });
    try {
      const row = labelsRows().find((r) => r.id === FX2_SCENARIO)!;
      expect(replayLoopsRow(row)).toEqual([]);
      expect(replayLoopsRow(row, { twins: ['reverse-end-labels'] })).toEqual([]);
    } finally {
      unregisterTwinHook('reverse-end-labels');
    }
  });
});

// ------------------------------------------------------------------------------------------------------------
// perturbation

type Json = { [key: string]: unknown };

/** The first `x` member that is a number, depth first: its parent object and the path to it. */
function findNumber(node: unknown, trail: string[]): { owner: Json; trail: string[] } | null {
  if (node === null || typeof node !== 'object') {
    return null;
  }
  const record = node as Json;
  if (typeof record.x === 'number' && trail.length > 0) {
    return { owner: record, trail };
  }
  for (const [key, value] of Object.entries(record)) {
    const found = findNumber(value, [...trail, key]);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

function hexToDouble(hex: string): number {
  return new DataView(new BigUint64Array([BigInt(`0x${hex}`)]).buffer).getFloat64(0, true);
}

function doubleToHex(value: number): string {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return view.getBigUint64(0).toString(16).padStart(16, '0');
}

describe('a perturbed row', () => {
  it('reports a full-row mismatch naming the element and field', () => {
    const row = structuredClone(
      labelsRows().find((r): r is FullRow => isFullRow(r) && findNumber(r.expected.layout, []) !== null)!,
    );
    expect(replayLoopsRow(row)).toEqual([]);
    const found = findNumber(row.expected.layout, [])!;
    (found.owner.x as number) += PERTURBATION;
    const mismatches = replayLoopsRow(row);
    expect(mismatches.length).toBe(1);
    expect(mismatches[0]!.where).toMatch(/\[id=[^\]]+\]\.x$/); // the element by id, then the field
    expect(mismatches[0]!.message).toContain('x');
  });

  it('reports a stop-row mismatch naming the element and field', () => {
    const row = structuredClone(
      labelsRows().find(
        (r): r is PipelineStopRow => isStopRow(r) && r.id === 'scenarios/LabelDummyInserter/center/RIGHT',
      )!,
    );
    expect(replayLoopsRow(row)).toEqual([]);
    const size = (row.expected.geometry as unknown as { nodes: Record<string, { size: string[] }> }).nodes['g0/n0']!
      .size;
    size[0] = doubleToHex(hexToDouble(size[0]!) + PERTURBATION);
    const mismatches = replayLoopsRow(row);
    expect(mismatches.map((m) => m.where)).toEqual(['geometry nodes g0/n0']);
    expect(mismatches[0]!.message).toContain('size');
  });
});
