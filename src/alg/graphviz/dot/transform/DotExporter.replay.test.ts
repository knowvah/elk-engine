// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/graphviz-dot-export.json (AD-13, D10): DotExporter.transform and
// DotExporter.transferLayout, through DotExporter, the SplineExporter subclass and the LayoutDotExporter mimic.
import { describe, expect, it } from 'vitest';
import { compareSource } from '../../../../../test/helpers/dot-export-dump.js';
import {
  type ExportRow,
  REF,
  type TransferRow,
  replayExport,
  replayTransfer,
  thrownDiff,
} from '../../../../../test/helpers/dot-export-rows.js';

const EXPORT_ROWS = REF.rows.filter((r): r is ExportRow => r.family === 'export');
const TRANSFER_ROWS = REF.rows.filter((r): r is TransferRow => r.family === 'transfer');
/** The rows per family and exporter, as the ref has them (the hand-back reports these). */
const EXPECTED_BY_EXPORTER: Readonly<Record<string, number>> = {
  'export/DotExporter': 42,
  'export/SplineExporter': 1,
  'export/LayoutMimic': 39,
  'transfer/DotExporter': 12,
  'transfer/SplineExporter': 2,
  'transfer/LayoutMimic': 16,
};

function countByExporter(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of REF.rows) {
    const key = `${row.family}/${row.exporter}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function checkExport(row: ExportRow): void {
  const actual = replayExport(row);
  expect(thrownDiff(row.throws, actual.throws)).toBeNull();
  expect(compareSource(row.source, actual.source)).toEqual([]);
  if (row.throws !== undefined) return;
  expect(actual.text).toBe(row.text);
  expect(actual.formatted).toBe(row.formatted);
  expect(thrownDiff(row.textThrows, actual.textThrows)).toBeNull();
  expect(thrownDiff(row.formattedThrows, actual.formattedThrows)).toBeNull();
  expect(actual.model).toEqual(row.model);
}

function checkTransfer(row: TransferRow): void {
  const actual = replayTransfer(row);
  expect(actual.parseLines).toEqual(row.parseErrors.map((e) => e.line));
  expect(actual.transferred).toBe(row.transferred);
  expect(thrownDiff(row.throws, actual.throws)).toBeNull();
  expect(compareSource(row.source, actual.source)).toEqual([]);
}

describe('DotExporter: replay of graphviz-dot-export.json', () => {
  it('replays every row of the ref, none skipped', () => {
    expect(EXPORT_ROWS).toHaveLength(REF.rowCounts.export);
    expect(TRANSFER_ROWS).toHaveLength(REF.rowCounts.transfer);
    expect(EXPORT_ROWS.length + TRANSFER_ROWS.length).toBe(REF.rows.length);
    expect(countByExporter()).toEqual(EXPECTED_BY_EXPORTER);
  });

  it.each(EXPORT_ROWS.map((r) => [r.id, r] as const))('%s', (_id, row) => {
    checkExport(row);
  });

  it.each(TRANSFER_ROWS.map((r) => [r.id, r] as const))('%s', (_id, row) => {
    checkTransfer(row);
  });
});
