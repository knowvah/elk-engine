// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import {
  compareStop,
  dumpVertiFlex,
  formatDifferences,
  rebuildBefore,
  rebuildStop,
  TOLERANCE,
} from '../../../../test/helpers/vertiflex-replay-dump.js';
import {
  loadVertiFlexRows,
  stateAfter,
  STEP_RELATIVE_X_PLACER,
  STEP_Y_PLACER,
} from '../../../../test/helpers/vertiflex-replay-rows.js';
import { RelativeXPlacerStrategy } from './RelativeXPlacerStrategy.js';

const rows = loadVertiFlexRows('stops');
const EXACT = 0;

function runPhase(row: (typeof rows)[number]): ReturnType<typeof dumpVertiFlex> {
  const graph = rebuildBefore(row, STEP_RELATIVE_X_PLACER);
  RelativeXPlacerStrategy.SIMPLE_X_PLACING.create().process(graph, new BasicProgressMonitor());
  return dumpVertiFlex(graph);
}

describe('RelativeXPlacer from the NodeYPlacer stop to the RelativeXPlacer stop (T3 rows)', () => {
  it('starts every row from the recorded NodeYPlacer state', { timeout: 60_000 }, () => {
    for (const row of rows) {
      expect(row.expected.steps.indexOf(STEP_RELATIVE_X_PLACER) - row.expected.steps.indexOf(STEP_Y_PLACER)).toBe(1);
      const before = dumpVertiFlex(rebuildStop(row, STEP_Y_PLACER));
      expect(formatDifferences(compareStop(stateAfter(row, STEP_Y_PLACER), before, EXACT))).toBe('');
    }
  });

  it.each(rows.map((row) => [row.id, row] as const))(
    '%s: the P2 stop equals the row at 1e-6, ids and order exact',
    (_id, row) => {
      const differences = compareStop(stateAfter(row, STEP_RELATIVE_X_PLACER), runPhase(row), TOLERANCE);
      expect(formatDifferences(differences)).toBe('');
    },
  );

  it(
    'is bit-exact on every row (the port performs the same double operations in the same order)',
    { timeout: 60_000 },
    () => {
      const failing = rows.filter(
        (row) => compareStop(stateAfter(row, STEP_RELATIVE_X_PLACER), runPhase(row), EXACT).length > 0,
      );
      expect(failing.map((row) => row.id)).toEqual([]);
    },
  );
});
