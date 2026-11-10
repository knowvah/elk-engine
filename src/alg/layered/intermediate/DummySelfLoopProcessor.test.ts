// SPDX-License-Identifier: EPL-2.0
// Proof of DummySelfLoopProcessor (mission 7g, T14): every `scenarios/DummySelfLoopProcessor/*` row of layered-loops.json
// (those that stop right after the `processor` op and the `/end` rows that run the rest of the plan). The class has no enum
// member, so the test registers it for the `processor <SimpleClassName>` step op (never from `src/`). A row passes when
// `replayLoopsRow` reports no mismatch (numbers within 1e-6, everything else exactly). Expectations come only from the rows
// (L4).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerStepProcessor, unregisterStepProcessor } from '../../../../test/helpers/layered-loops-replay-ops.js';
import {
  describeLoops,
  loadLoopsRowsIfPresent,
  replayLoopsRow,
} from '../../../../test/helpers/layered-loops-replay-rows.js';
import { DummySelfLoopProcessor } from './DummySelfLoopProcessor.js';

const CLASS_NAME = 'DummySelfLoopProcessor';
const SCENARIO_PREFIX = `scenarios/${CLASS_NAME}/`;
const END_SUFFIX = '/end';
const SELF_LOOP_ARM_PREFIX = 'SELF_LOOP_';

const rows = loadLoopsRowsIfPresent().filter((row) => row.id.startsWith(SCENARIO_PREFIX));
const endRows = rows.filter((row) => row.id.endsWith(END_SUFFIX));

describeLoops('DummySelfLoopProcessor against layered-loops.json', () => {
  beforeAll(() => {
    registerStepProcessor(CLASS_NAME, () => new DummySelfLoopProcessor());
  });
  afterAll(() => {
    unregisterStepProcessor(CLASS_NAME);
  });

  it('finds the scenario rows, half of them /end rows', () => {
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBe(endRows.length * 2);
  });

  it('has no SELF_LOOP_* arm in any step of any row, so no injection is needed', () => {
    const withArm = rows.filter((row) =>
      (row.steps ?? []).some((step) => step.slice(1).some((arg) => String(arg).startsWith(SELF_LOOP_ARM_PREFIX))),
    );
    expect(withArm.map((row) => row.id)).toEqual([]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    expect(replayLoopsRow(row, {})).toEqual([]);
  });
});
