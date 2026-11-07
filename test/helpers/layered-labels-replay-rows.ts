// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/layered-labels.json (mission 7f2, G2): groups `full`, `models`, `scenarios`, `sites`
// in 7f's row shape. The rows are validated by 7f's loader (re-exported types, never copied); this module adds the
// lazy load (the ref file does not exist until the recorder has run), the `rowCounts` check and the selection helpers.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';
import {
  PIPELINE_ROW_GROUPS,
  loadPipelineRows,
  type PipelineRow,
  type PipelineRowGroup,
} from './layered-pipeline-replay-rows.js';

export type {
  FullRow,
  PipelineRow,
  PipelineRowGroup,
  PipelineStopRow,
  PlanMap,
} from './layered-pipeline-replay-rows.js';
export { isFullRow, isStopRow } from './layered-pipeline-replay-rows.js';

/** The row groups of the labels ref file (the same four as 7f's). */
export const LABELS_ROW_GROUPS = PIPELINE_ROW_GROUPS;

const ID_SEPARATOR = '/';

/** The path of the labels ref file (absent until the recorder has produced it). */
export const labelsRefPath = (): string =>
  path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'layered-labels.json');

export type RowCounts = Readonly<Record<PipelineRowGroup, number>>;

/** The number of rows per group, in `LABELS_ROW_GROUPS` order. */
export function countRows(rows: readonly PipelineRow[]): RowCounts {
  const counts = Object.fromEntries(LABELS_ROW_GROUPS.map((group) => [group, 0])) as Record<PipelineRowGroup, number>;
  rows.forEach((row) => {
    counts[row.group] += 1;
  });
  return counts;
}

/** Compares the ref's `rowCounts` header with the loaded rows; returns the first difference, or `null` when equal. */
export function rowCountsDifference(header: unknown, rows: readonly PipelineRow[]): string | null {
  const actual = countRows(rows);
  const declared = (header ?? {}) as Partial<Record<string, unknown>>;
  for (const group of LABELS_ROW_GROUPS) {
    if (declared[group] !== actual[group]) {
      return `rowCounts.${group} is ${JSON.stringify(declared[group])}, the file holds ${String(actual[group])} rows`;
    }
  }
  return null;
}

/** Loads one labels ref file: the rows (validated by 7f's loader) and the `rowCounts` check. */
export function loadLabelsFile(file: string): PipelineRow[] {
  const rows = loadPipelineRows(file);
  const header = (JSON.parse(readFileSync(file, 'utf8')) as { rowCounts?: unknown }).rowCounts;
  const difference = rowCountsDifference(header, rows);
  if (difference !== null) {
    throw new Error(`${file}: ${difference}`);
  }
  return rows;
}

let cached: PipelineRow[] | null = null;

/** The rows of `layered-labels.json`, loaded on first use so that importing this module never needs the file. */
export function loadLabelsRows(): readonly PipelineRow[] {
  cached ??= loadLabelsFile(labelsRefPath());
  return cached;
}

/** The rows of one group, in file order. */
export function rowsByGroup(group: PipelineRowGroup, rows: readonly PipelineRow[] = loadLabelsRows()): PipelineRow[] {
  return rows.filter((row) => row.group === group);
}

/** The rows whose id is `prefix` or starts with `prefix/` (a class or family, never a bare string prefix). */
export function rowsByClass(prefix: string, rows: readonly PipelineRow[] = loadLabelsRows()): PipelineRow[] {
  return rows.filter((row) => row.id === prefix || row.id.startsWith(`${prefix}${ID_SEPARATOR}`));
}

/**
 * The last entry of a row's `prefix`: the processor a row stops after. Selection is by this entry, never by
 * "the plan runs the processor" (a plan can hold a member the row never reached).
 */
export function lastPrefixEntry(row: PipelineRow): string | null {
  const prefix = row.prefix;
  return prefix === null || prefix.length === 0 ? null : prefix[prefix.length - 1]!;
}

/** The rows of a model/scenario/site group whose prefix ends on `entry`. */
export function rowsByLastPrefixEntry(entry: string, rows: readonly PipelineRow[] = loadLabelsRows()): PipelineRow[] {
  return rows.filter((row) => lastPrefixEntry(row) === entry);
}
