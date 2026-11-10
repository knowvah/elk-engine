// SPDX-License-Identifier: EPL-2.0
// Proof of SelfLoopPortRestorer, PortSideAssigner and PortRestorer (mission 7g, T9): every scenario row of the class and
// every `models` row of the SELF_LOOP_PORT_RESTORER stop in layered-loops.json, with the classes injected through
// `factoriesWith` (the enum arm is wired by T15). A row passes when `replayLoopsRow` reports no mismatch (numbers within
// 1e-6, everything else exactly), `expected.selfLoops` included. Expectations come only from the rows (L4). A row whose
// prefix names a still unported arm is skipped by a computed filter and counted.
import { describe, expect, it } from 'vitest';
import { factoriesWith } from '../../../../test/helpers/layered-loops-replay-ops.js';
import {
  describeLoops,
  loadLoopsRowsIfPresent,
  replayLoopsRow,
  type LoopsRow,
} from '../../../../test/helpers/layered-loops-replay-rows.js';
import { SelfLoopPortRestorer } from './SelfLoopPortRestorer.js';
import { SelfLoopPreProcessor } from './SelfLoopPreProcessor.js';

const STOP = 'SELF_LOOP_PORT_RESTORER';
const SCENARIO_PREFIX = 'scenarios/SelfLoopPortRestorer/';
const STOP_SEGMENT_FROM_END = 2;

/** The id of a `models` row ends `.../<stop>/<variant>`. */
const isStopRow = (row: LoopsRow): boolean =>
  row.group === 'models' && row.id.split('/').at(-STOP_SEGMENT_FROM_END) === STOP;

const rows = loadLoopsRowsIfPresent();
const scenarios = rows.filter((row) => row.id.startsWith(SCENARIO_PREFIX));
const models = rows.filter(isStopRow);
const factories = factoriesWith({
  SELF_LOOP_PREPROCESSOR: () => new SelfLoopPreProcessor(),
  [STOP]: () => new SelfLoopPortRestorer(),
});

const hasSelfLoops = (row: LoopsRow): boolean => (row.expected as { selfLoops?: unknown }).selfLoops !== undefined;

describeLoops('SelfLoopPortRestorer against layered-loops.json', () => {
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
