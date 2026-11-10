// SPDX-License-Identifier: EPL-2.0
// Proof of SelfLoopPreProcessor (mission 7g, T5): every row of layered-loops.json that replays up to and including the
// SELF_LOOP_PREPROCESSOR stop, with the class injected through `factoriesWith` (the enum arm is wired by T15): the scenario
// rows of the class and the `models` rows of the stop. A row passes when `replayLoopsRow` reports no mismatch (numbers within
// 1e-6, everything else exactly), `expected.selfLoops` included. Expectations come only from the rows (L4).
import { describe, expect, it } from 'vitest';
import { factoriesWith } from '../../../../test/helpers/layered-loops-replay-ops.js';
import {
  describeLoops,
  loadLoopsRowsIfPresent,
  replayLoopsRow,
  type LoopsRow,
} from '../../../../test/helpers/layered-loops-replay-rows.js';
import { SelfLoopPreProcessor } from './SelfLoopPreProcessor.js';

const STOP = 'SELF_LOOP_PREPROCESSOR';
const SCENARIO_PREFIX = 'scenarios/SelfLoopPreProcessor/';
const STOP_SEGMENT_FROM_END = 2;

/** The id of a `models` row ends `.../<stop>/<variant>`. */
const isStopRow = (row: LoopsRow): boolean =>
  row.group === 'models' && row.id.split('/').at(-STOP_SEGMENT_FROM_END) === STOP;

const rows = loadLoopsRowsIfPresent();
const scenarios = rows.filter((row) => row.id.startsWith(SCENARIO_PREFIX));
const models = rows.filter(isStopRow);
const factories = factoriesWith({ [STOP]: () => new SelfLoopPreProcessor() });

const hasSelfLoops = (row: LoopsRow): boolean => (row.expected as { selfLoops?: unknown }).selfLoops !== undefined;

describeLoops('SelfLoopPreProcessor against layered-loops.json', () => {
  it('finds the scenario and models rows', () => {
    expect(scenarios.length).toBeGreaterThan(0);
    expect(models.length).toBeGreaterThan(0);
    expect(scenarios.filter(hasSelfLoops).length).toBeGreaterThan(0);
  });

  describe('scenario rows', () => {
    it.each(scenarios.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      expect(replayLoopsRow(row, { factories })).toEqual([]);
    });
  });

  describe('models rows', () => {
    it.each(models.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      expect(replayLoopsRow(row, { factories })).toEqual([]);
    });
  });
});
