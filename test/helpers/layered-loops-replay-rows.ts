// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/layered-loops.json (mission 7g, W3; recorded by tools/vectors/LayeredLoopsVectors.java): 7f2's
// row shape (groups `full`, `models`, `scenarios`, `sites`), plus the `processor` step op (layered-loops-replay-ops.ts).
// The loader takes the ref path as a parameter (default: the loops ref), so it also loads `layered-labels.json`. The file is
// read lazily: until T1's recording lands, the dependent suites skip with a message naming T1. `replayLoopsRow` replays one
// row through the real pipeline and compares it with the landed comparators (7f2's `compareLabels` / `compareLabelsFullRow`).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { InteractiveLayeredGraphVisitor } from '../../src/alg/layered/InteractiveLayeredGraphVisitor.js';
import { ComponentsProcessor } from '../../src/alg/layered/components/ComponentsProcessor.js';
import { repoRoot } from '../corpus/corpus.js';
import { formatDiffs, type Diff } from '../golden/compare-json.js';
import { registerLayered } from './layered-framework-replay.js';
import { compareLabels, labelsDump, type LabelsExpected } from './layered-labels-replay-dump.js';
import { compareLabelsFullRow, runLabelsFullRow } from './layered-labels-replay-full.js';
import {
  LABELS_ROW_GROUPS,
  loadLabelsFile,
  rowsByClass,
  rowsByGroup,
  rowsByLastPrefixEntry,
  type PipelineRow,
  type PipelineRowGroup,
} from './layered-labels-replay-rows.js';
import {
  runLoopsPrefix,
  runLoopsRow,
  strategyFactories,
  withTwins,
  type LoopsEnvironment,
} from './layered-loops-replay-ops.js';
import type { Factories } from './layered-phase-replay-ops.js';
import {
  isFullRow,
  registerPipelineEnums,
  type FullRow,
  type PipelineStopRow,
} from './layered-pipeline-replay-rows.js';
import { withLoopsLabelManager } from './layered-loops-replay-manager.js';
import { installWrappingEncoding, withListOptions } from './layered-loops-replay-wrapping.js';
import { strictNumbers } from './layered-site-replay-ops-transform.js';
import { compareSelfLoops, selfLoopsOf, withoutSelfLoopHolder } from './layered-loops-replay-selfloops.js';
import { compareRoutingFullDump } from './layered-routing-replay-compare.js';
import { dumpWithPropertyValues } from './layered-site-replay-dump.js';
import { ENUM_TYPES, type EnumClass } from './layered-site-replay-registry.js';
import { CuttingStrategy } from '../../src/alg/layered/options/CuttingStrategy.js';
import { ConstraintCalculationStrategy } from '../../src/alg/layered/options/ConstraintCalculationStrategy.js';
import { GraphCompactionStrategy } from '../../src/alg/layered/options/GraphCompactionStrategy.js';
import { SelfLoopDistributionStrategy } from '../../src/alg/layered/options/SelfLoopDistributionStrategy.js';
import { SelfLoopOrderingStrategy } from '../../src/alg/layered/options/SelfLoopOrderingStrategy.js';
import { ValidifyStrategy } from '../../src/alg/layered/options/ValidifyStrategy.js';
import { WrappingStrategy } from '../../src/alg/layered/options/WrappingStrategy.js';

export type { FullRow, PipelineStopRow, PlanMap } from './layered-labels-replay-rows.js';
export { isFullRow, isStopRow } from './layered-pipeline-replay-rows.js';
export { lastPrefixEntry } from './layered-labels-replay-rows.js';

/** A row of the loops ref (and of any file of 7f2's row shape). */
export type LoopsRow = PipelineRow;
export type LoopsRowGroup = PipelineRowGroup;
/** The row groups of the loops ref (the same four as 7f's). */
export const LOOPS_ROW_GROUPS = LABELS_ROW_GROUPS;

const ID_SEPARATOR = '/';
const FAMILY_INDEX = 1;

// ------------------------------------------------------------------------------------------------------------
// enum registry

/**
 * The option enums the loops rows set (`wrapping.strategy`, `wrapping.cutting.strategy`, `wrapping.validify.strategy`,
 * `compaction.postCompaction.strategy` / `.constraints`, `selfLoopDistribution`, `selfLoopOrdering`) and `EdgeRouting`. The
 * 7a registry already holds the seven layered ones through its `OPTION_ENUMS`; registering is `??=`, so a registered class is
 * never replaced. The registry is a read-only type over a plain record (the 7e / 7f helpers do the same).
 */
const LOOPS_ENUMS: readonly EnumClass[] = [
  WrappingStrategy,
  CuttingStrategy,
  ValidifyStrategy,
  GraphCompactionStrategy,
  ConstraintCalculationStrategy,
  SelfLoopDistributionStrategy,
  SelfLoopOrderingStrategy,
] as unknown as readonly EnumClass[];

/** Registers the loops enum types (idempotent); runs when this module is evaluated. */
export function registerLoopsEnums(): void {
  registerPipelineEnums();
  const registry = ENUM_TYPES as Record<string, EnumClass>;
  for (const type of LOOPS_ENUMS) {
    registry[type.name] ??= type;
  }
}

registerLoopsEnums();

// ------------------------------------------------------------------------------------------------------------
// the lazy loader

/** The path of the loops ref (absent until T1's recording has run). */
export const loopsRefPath = (): string => path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'layered-loops.json');

/** Why the dependent suites are skipped; names the task that produces the ref. */
export const loopsSkipMessage = (file: string = loopsRefPath()): string =>
  `${path.basename(file)} is absent: T1 (tools/vectors/LayeredLoopsVectors.java recording) has not landed`;

export const loopsRefExists = (file: string = loopsRefPath()): boolean => existsSync(file);

const cache = new Map<string, readonly LoopsRow[]>();

/**
 * The rows of a ref file of 7f2's row shape (default: the loops ref), in file order, optionally of one group. Validated by 7f's
 * loader and the `rowCounts` header check; cached per path.
 *
 * @throws Error naming T1 when the file is absent, and naming the row when one is malformed
 */
export function loadLoopsRows(group?: LoopsRowGroup, file: string = loopsRefPath()): readonly LoopsRow[] {
  if (!loopsRefExists(file)) {
    throw new Error(loopsSkipMessage(file));
  }
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = loadLabelsFile(file);
    cache.set(file, rows);
    if (path.resolve(file) === path.resolve(loopsRefPath())) {
      rows.forEach((row) => LOOPS_RECORDED.add(row));
    }
  }
  return group === undefined ? rows : rowsByGroup(group, rows);
}

/**
 * The rows `LayeredLoopsVectors.java` recorded (loaded from the loops ref). A dump names an opaque option value by its Java
 * class, and the label manager is a nested class of the recorder that wrote the row, so only these rows take the loops
 * recorder's manager twin (`withLoopsLabelManager`); a row of another ref (the landed `layered-labels.json`) keeps 7f2's.
 */
const LOOPS_RECORDED = new WeakSet<LoopsRow>();

/** `loadLoopsRows`, or `[]` when the file is absent (collection-time listing for a suite that is then skipped). */
export function loadLoopsRowsIfPresent(group?: LoopsRowGroup, file: string = loopsRefPath()): readonly LoopsRow[] {
  return loopsRefExists(file) ? loadLoopsRows(group, file) : [];
}

/** `describe` when the ref exists; otherwise a describe holding one skipped test whose title is `loopsSkipMessage`. */
export function describeLoops(title: string, body: () => void, file: string = loopsRefPath()): void {
  if (loopsRefExists(file)) {
    describe(title, body);
    return;
  }
  describe(title, () => {
    it.skip(loopsSkipMessage(file), () => undefined);
  });
}

// ------------------------------------------------------------------------------------------------------------
// listing

/** The family of a row: the second segment of its id (`full/<family>/…`, `scenarios/<Class>/…`, `models/<model>/…`). */
export const familyOf = (row: LoopsRow): string => row.id.split(ID_SEPARATOR)[FAMILY_INDEX] ?? '';

/** The rows of a group whose family is `family`. */
export function rowsByFamily(group: LoopsRowGroup, family: string, rows: readonly LoopsRow[]): LoopsRow[] {
  return rowsByGroup(group, rows).filter((row) => familyOf(row) === family);
}

export { rowsByClass, rowsByGroup, rowsByLastPrefixEntry };

// ------------------------------------------------------------------------------------------------------------
// replay and comparison

/** One difference between a replayed row and its recording: the element and field, and what differs. */
export interface Mismatch {
  readonly where: string;
  readonly message: string;
}

export interface ReplayOptions {
  /** Names of registered twin hooks (`registerTwinHook`) applied for this replay, in order. */
  readonly twins?: readonly string[];
  /** Replaces the enum-driven factories (`factoriesWith(...)`): a ported class for a still-staged arm. */
  readonly factories?: Factories;
}

const fromDiff = (diff: Diff): Mismatch => ({ where: diff.path, message: formatDiffs([diff]) });

/**
 * Gson's lenient writer prints non-finite doubles bare (`NaN` port and node `y` of fixed-side compounds, as in the oracle,
 * `.agent-notes/core-engine.md`); the recording quotes them, as the recorder's `strictNumbers` does. The landed `full` runner
 * parses the export strictly, so a `full` row replays with `JSON.parse` reading through `strictNumbers` (restored afterwards).
 */
function withStrictNumberParse<T>(body: () => T): T {
  const parse = JSON.parse;
  JSON.parse = ((text: string, reviver?: Parameters<typeof JSON.parse>[1]): unknown =>
    parse(strictNumbers(text), reviver)) as typeof JSON.parse;
  try {
    return body();
  } finally {
    JSON.parse = parse;
  }
}

function replayFull(row: FullRow): Mismatch[] {
  const createInteractiveVisitor = (): InteractiveLayeredGraphVisitor => new InteractiveLayeredGraphVisitor();
  const result = withStrictNumberParse(() => runLabelsFullRow(row, { createInteractiveVisitor }));
  return compareLabelsFullRow(result, row).map(fromDiff);
}

function replayStop(row: PipelineStopRow, factories: Factories, loopsRecorded: boolean): Mismatch[] {
  const env: LoopsEnvironment = {
    factories,
    components: new ComponentsProcessor(),
    createInteractiveVisitor: () => new InteractiveLayeredGraphVisitor(),
  };
  const result =
    row.steps === null
      ? { graph: runLoopsPrefix(row, factories), components: null, terminal: null }
      : loopsRecorded
        ? withLoopsLabelManager(row, (stepRow) => runLoopsRow(stepRow, env))
        : runLoopsRow(row, env);
  const expected = row.expected as unknown as LabelsExpected;
  const actual = withoutSelfLoopHolder(labelsDump(result, expected));
  const diffs = compareLabels(actual, expected);
  if (row.expected.dump !== undefined) {
    const dump = withoutSelfLoopHolder(dumpWithPropertyValues(result.graph));
    diffs.push(...compareRoutingFullDump({ ...actual, dump } as never, row.expected));
  }
  // W3: the holder is not in `changed` / `dump`; the recorder's summary stands in for it
  diffs.push(...compareSelfLoops(selfLoopsOf(result.graph), (row.expected as { selfLoops?: unknown }).selfLoops));
  return diffs;
}

/**
 * Replays one row of a loops-shaped ref through the real pipeline (`full`: the recursive engine, by family; `models`: the
 * prefix; `scenarios` / `sites`: the step interpreter with the `processor` op) and returns every mismatch against the
 * recording (`[]`: equal; numbers within 1e-6 per AD-4, everything else exactly). `opts.twins` names registered twin hooks that
 * are applied for this replay only.
 */
export function replayLoopsRow(row: LoopsRow, opts: ReplayOptions = {}): Mismatch[] {
  registerLayered();
  registerLoopsEnums();
  installWrappingEncoding();
  const listed = withListOptions(row);
  const factories = opts.factories ?? strategyFactories;
  const loopsRecorded = LOOPS_RECORDED.has(row);
  return withTwins(opts.twins ?? [], () =>
    isFullRow(listed) ? replayFull(listed) : replayStop(listed, factories, loopsRecorded),
  );
}
