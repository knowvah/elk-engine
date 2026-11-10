// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/layered-loops.json (mission 7g, T16; recorded by tools/vectors/LayeredLoopsVectors.java
// from the source-built oracle) through the real LayeredLayoutProvider / ElkLayered / IntermediateProcessorStrategy, with no
// injected factory: `full` rows through the recursive engine, `models` rows by replaying their prefix, `scenarios` and `sites`
// rows through the step interpreter (`processor DummySelfLoopProcessor` is registered here). `replayLoopsRow` applies the list
// options and the strict-number parse itself. Numbers within 1e-6 (AD-4), everything else exactly. A test title is its row id,
// so `-t '<row id>$'` isolates one row. W4: the fresh DIRECTION_PREPROCESSOR row of the sine-wave model is cross-checked with the
// landed row of layered-pipeline.json, which LayeredPipelineVectors.test.ts replays (its pinned-row table is empty).
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  LOOPS_ROW_GROUPS,
  loadLoopsRows,
  loopsRefPath,
  replayLoopsRow,
  rowsByGroup,
} from '../../../test/helpers/layered-loops-replay-rows.js';
import { registerStepProcessor } from '../../../test/helpers/layered-loops-replay-ops.js';
import { PINNED_PHASE_ROWS, PINNED_PIPELINE_ROWS } from '../../../test/helpers/layered-pipeline-pinned-rows.js';
import { DummySelfLoopProcessor } from './intermediate/DummySelfLoopProcessor.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';

const PROCESSOR_NAME = 'DummySelfLoopProcessor';
const PIPELINE_REF = 'test/golden/refs/java/layered-pipeline.json';
const PHASE_PREFIXES = /^P[1-5]_/;
const W4_FRESH_ID = 'models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN';
const W4_FIELDS = ['input', 'options', 'prefix', 'expected'] as const;

interface RefFile {
  readonly rowCounts: Record<string, number>;
  readonly rows: readonly { id: string }[];
}

const rows = loadLoopsRows();
const header = JSON.parse(readFileSync(loopsRefPath(), 'utf8')) as RefFile;

/** The `IntermediateProcessorStrategy` names a row's plan runs (prefix entries, `runProcessor` steps). */
function processorNames(row: (typeof rows)[number]): string[] {
  const fromPrefix = (row.prefix ?? []).map((entry) => entry.split('/')[0]!);
  const fromSteps = (row.steps ?? []).flatMap((step) => (step[0] === 'runProcessor' ? [String(step[1])] : []));
  return [...fromPrefix, ...fromSteps].filter((name) => !PHASE_PREFIXES.test(name));
}

beforeAll(() => {
  registerStepProcessor(PROCESSOR_NAME, () => new DummySelfLoopProcessor());
});

describe('layered-loops rows', () => {
  it('has unique row ids', () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('has the recorded row counts per group', () => {
    expect(header.rowCounts).toEqual({ full: 731, models: 307, scenarios: 525, sites: header.rowCounts['sites'] });
    for (const group of LOOPS_ROW_GROUPS) {
      expect(rowsByGroup(group, rows).length).toBe(header.rowCounts[group]);
    }
    expect(rows.length).toBe(Object.values(header.rowCounts).reduce((sum, n) => sum + n, 0));
  });

  it('runs only ported members: every processor a plan names builds', () => {
    const names = new Set(rows.flatMap(processorNames));
    expect(names.size).toBeGreaterThan(0);
    for (const name of names) {
      expect(IntermediateProcessorStrategy.valueOf(name).create(), name).toBeDefined();
    }
  });

  it('pins and skips no row', () => {
    expect(PINNED_PIPELINE_ROWS.size).toBe(0);
    expect(PINNED_PHASE_ROWS.size).toBe(0);
  });
});

describe.each(LOOPS_ROW_GROUPS.map((group) => [group, rowsByGroup(group, rows)] as const))(
  '%s rows',
  (_group, groupRows) => {
    for (const row of groupRows) {
      it(row.id, () => {
        expect(replayLoopsRow(row).map((mismatch) => mismatch.message)).toEqual([]);
      });
    }
  },
);

describe('W4: the sine-wave DIRECTION_PREPROCESSOR row equals the landed pipeline row', () => {
  const landed = (JSON.parse(readFileSync(PIPELINE_REF, 'utf8')) as { rows: Record<string, unknown>[] }).rows.find(
    (row) => row['id'] === W4_FRESH_ID,
  );
  const fresh = rows.find((row) => row.id === W4_FRESH_ID) as unknown as Record<string, unknown> | undefined;

  it('finds both rows', () => {
    expect(landed?.['id']).toBe(W4_FRESH_ID);
    expect(fresh?.['id']).toBe(W4_FRESH_ID);
  });

  for (const field of W4_FIELDS) {
    it(`has the same ${field}`, () => {
      expect(fresh?.[field]).toEqual(landed?.[field]);
    });
  }

  it('is replayed, not pinned, by LayeredPipelineVectors.test.ts', () => {
    expect(PINNED_PIPELINE_ROWS.has(W4_FRESH_ID)).toBe(false);
    expect(PINNED_PIPELINE_ROWS.size).toBe(0);
  });
});
