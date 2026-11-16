// SPDX-License-Identifier: EPL-2.0
// Oracle rows of the four wrapping processors (mission 7g, T11): every `scenarios/<Class>/*` row and every
// `models/*/<ARM>/*` row of BreakingPointInserter, BreakingPointProcessor, BreakingPointRemover and SingleEdgeGraphWrapper
// whose plan names no still-unported arm, replayed with the classes injected through `factoriesWith` (the four enum arms keep
// throwing until a later task wires them). The recorder's `breakingPoint.info` encoding is installed by
// test/helpers/layered-loops-replay-wrapping.ts.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { withListOptions } from '../../../../../test/helpers/layered-loops-replay-wrapping.js';
import { factoriesWith } from '../../../../../test/helpers/layered-loops-replay-ops.js';
import {
  loadLoopsRowsIfPresent,
  replayLoopsRow,
  rowsByClass,
  rowsByLastPrefixEntry,
  type LoopsRow,
} from '../../../../../test/helpers/layered-loops-replay-rows.js';
import { IntermediateProcessorStrategy } from '../IntermediateProcessorStrategy.js';
import { HorizontalGraphCompactor } from '../compaction/HorizontalGraphCompactor.js';
import { SelfLoopPreProcessor } from '../SelfLoopPreProcessor.js';
import { BreakingPointInserter } from './BreakingPointInserter.js';
import { BreakingPointProcessor } from './BreakingPointProcessor.js';
import { BreakingPointRemover } from './BreakingPointRemover.js';
import { SingleEdgeGraphWrapper } from './SingleEdgeGraphWrapper.js';

const SPAWN_TIMEOUT_MS = 60_000;
const INSERTER_ARM = 'BREAKING_POINT_INSERTER';
const PROCESSOR_ARM = 'BREAKING_POINT_PROCESSOR';
const REMOVER_ARM = 'BREAKING_POINT_REMOVER';
const WRAPPER_ARM = 'SINGLE_EDGE_GRAPH_WRAPPER';

/** The four stops: arm, class (scenario group) and the counts the recording holds (scenarios, models). */
const STOPS = [
  { arm: INSERTER_ARM, cls: 'BreakingPointInserter' },
  { arm: PROCESSOR_ARM, cls: 'BreakingPointProcessor' },
  { arm: REMOVER_ARM, cls: 'BreakingPointRemover' },
  { arm: WRAPPER_ARM, cls: 'SingleEdgeGraphWrapper' },
] as const;

/** The arms of 7g that are still unported: a row whose plan names one is replayed by the task that ports it. */
const UNPORTED_ARMS: ReadonlySet<string> = new Set([
  'SELF_LOOP_PORT_RESTORER',
  'SELF_LOOP_ROUTER',
  'SELF_LOOP_POSTPROCESSOR',
]);

/** The processor and phase names a row's plan runs (a model row's `prefix`, a scenario row's `steps`). */
function planNames(row: LoopsRow): string[] {
  const fromPrefix = (row.prefix ?? []).map((entry) => entry.split('/')[0]!);
  const fromSteps = (row.steps ?? []).flatMap((step) => (step[0] === 'runProcessor' ? [String(step[1])] : []));
  return [...fromPrefix, ...fromSteps];
}

const needsUnportedArm = (row: LoopsRow): boolean => planNames(row).some((name) => UNPORTED_ARMS.has(name));

const allRows = (): readonly LoopsRow[] => loadLoopsRowsIfPresent();
const stopRows = (stop: (typeof STOPS)[number]): LoopsRow[] => [
  ...rowsByClass(`scenarios/${stop.cls}`, allRows()),
  ...rowsByLastPrefixEntry(stop.arm, allRows()).filter((row) => row.id.startsWith('models/')),
];

const factories = factoriesWith({
  [INSERTER_ARM]: () => new BreakingPointInserter(),
  [PROCESSOR_ARM]: () => new BreakingPointProcessor(),
  [REMOVER_ARM]: () => new BreakingPointRemover(),
  [WRAPPER_ARM]: () => new SingleEdgeGraphWrapper(),
  SELF_LOOP_PREPROCESSOR: () => new SelfLoopPreProcessor(),
  HORIZONTAL_COMPACTOR: () => new HorizontalGraphCompactor(),
});

/** Recorded rows per stop: scenarios and models (the task's counts: 18 + 15, 18 + 15, 26 + 15, 26 + 10). */
const RECORDED: Readonly<Record<string, readonly [number, number]>> = {
  [INSERTER_ARM]: [18, 15],
  [PROCESSOR_ARM]: [18, 15],
  [REMOVER_ARM]: [26, 15],
  [WRAPPER_ARM]: [26, 10],
};

const REPLAYED_COUNT = 135;
const SKIPPED_COUNT = 8;
/** Per stop: [replayed, skipped]; a skipped row names SELF_LOOP_PORT_RESTORER / ROUTER / POSTPROCESSOR in its plan. */
const REPLAYED_AND_SKIPPED: Readonly<Record<string, readonly [number, number]>> = {
  [INSERTER_ARM]: [33, 0],
  [PROCESSOR_ARM]: [33, 0],
  [REMOVER_ARM]: [37, 4],
  [WRAPPER_ARM]: [32, 4],
};

describe('the rows of the wrapping processors', () => {
  it.each(STOPS)('holds every recorded row of $cls', (stop) => {
    const rows = stopRows(stop);
    const [scenarios, models] = RECORDED[stop.arm]!;
    expect(rows.filter((row) => row.id.startsWith('scenarios/')).length).toBe(scenarios);
    expect(rows.filter((row) => row.id.startsWith('models/')).length).toBe(models);
  });

  it('replays the rows that name no unported arm and skips the ones that do', () => {
    const all = STOPS.flatMap(stopRows);
    expect(all.length).toBe(18 + 15 + (18 + 15) + (26 + 15) + (26 + 10));
    const skipped = all.filter(needsUnportedArm);
    expect(skipped.every((row) => planNames(row).some((name) => UNPORTED_ARMS.has(name)))).toBe(true);
    expect(all.length - skipped.length).toBe(REPLAYED_COUNT);
    expect(skipped.length).toBe(SKIPPED_COUNT);
  });

  it.each(STOPS)('replays $cls: rows replayed and skipped per stop', (stop) => {
    const rows = stopRows(stop);
    const skipped = rows.filter(needsUnportedArm).length;
    expect([rows.length - skipped, skipped]).toEqual(REPLAYED_AND_SKIPPED[stop.arm]);
  });
});

for (const stop of STOPS) {
  describe(`${stop.cls} (oracle rows)`, () => {
    for (const row of stopRows(stop).filter((candidate) => !needsUnportedArm(candidate))) {
      it(`replays ${row.id}`, () => {
        expect(replayLoopsRow(withListOptions(row), { factories })).toEqual([]);
      });
    }
  });
}

// The `full/wrapping/*` rows run the whole pipeline (LayeredLayoutProvider) through the enum's `create()`, whose four arms keep
// throwing until a later task wires them. For this describe only, `create()` of the enum is patched to build the ported
// classes (no source file is changed); it proves the wrapping, validify and SPLINES / POLYLINE routing variants end to end.
const FULL_ROW_PREFIX = 'full/wrapping/';
const FULL_ROWS = 156;
const injected: Readonly<Record<string, () => unknown>> = {
  [INSERTER_ARM]: () => new BreakingPointInserter(),
  [PROCESSOR_ARM]: () => new BreakingPointProcessor(),
  [REMOVER_ARM]: () => new BreakingPointRemover(),
  [WRAPPER_ARM]: () => new SingleEdgeGraphWrapper(),
  SELF_LOOP_PREPROCESSOR: () => new SelfLoopPreProcessor(),
  HORIZONTAL_COMPACTOR: () => new HorizontalGraphCompactor(),
};

describe('the full/wrapping rows with the ported classes behind the enum arms', () => {
  const prototype = IntermediateProcessorStrategy.prototype as unknown as { create: () => unknown };
  const original = prototype.create;
  const fullRows = (): LoopsRow[] => allRows().filter((row) => row.id.startsWith(FULL_ROW_PREFIX));

  beforeAll(() => {
    prototype.create = function (this: { name(): string }): unknown {
      const make = injected[this.name()];
      return make === undefined ? original.call(this) : make();
    };
  });
  afterAll(() => {
    prototype.create = original;
  });

  it('holds the 156 recorded rows', () => {
    expect(fullRows().length).toBe(FULL_ROWS);
  });

  for (const row of fullRows()) {
    it(`replays ${row.id}`, () => {
      expect(replayLoopsRow(withListOptions(row))).toEqual([]);
    });
  }
});

describe('the modules load in a fresh process (F10)', () => {
  it.each([
    'BreakingPointInserter',
    'BreakingPointInserterBPInfo',
    'BreakingPointInserterCut',
    'BreakingPointProcessor',
    'BreakingPointRemover',
    'SingleEdgeGraphWrapper',
  ])(
    '%s',
    (name) => {
      const script = `import(${JSON.stringify(join(repoRoot(), 'src/alg/layered/intermediate/wrapping', `${name}.ts`))})`;
      let stderr = '';
      try {
        execFileSync(process.execPath, ['--import', 'tsx', '-e', script], {
          cwd: repoRoot(),
          stdio: ['ignore', 'ignore', 'pipe'],
          timeout: SPAWN_TIMEOUT_MS,
        });
      } catch (error) {
        stderr = String((error as { stderr?: Buffer | string }).stderr ?? error);
      }
      expect(stderr).toBe('');
    },
    SPAWN_TIMEOUT_MS,
  );
});
