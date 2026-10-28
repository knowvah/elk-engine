// SPDX-License-Identifier: EPL-2.0
// Replays the `transform` group of test/golden/refs/java/layered-framework.json (mission 7a, L3/L4; recorded by
// tools/vectors/LayeredFrameworkVectors.java before any TS consumer): the ElkGraph -> LGraph import dump and the
// ELK JSON after the transfer back, numbers within 1e-6 (AD-4) and everything else exact; exception rows expect the
// same exception class and message (AD-16).
import { describe, expect, it } from 'vitest';
import {
  compareTransformOutcome,
  loadLayeredFrameworkRows,
  registerLayered,
  replayTransformRow,
  type TransformRow,
} from '../../../../../test/helpers/layered-framework-replay.js';

const rows = loadLayeredFrameworkRows('transform');
const EXPECTED_ROW_COUNT = 129;
const EXPECTED_EXCEPTION_ROWS = 12;

describe('layered-framework.json transform replay', () => {
  it('has the recorded row counts', () => {
    expect(rows.length).toBe(EXPECTED_ROW_COUNT);
    expect(rows.filter((row) => row.exception !== undefined).length).toBe(EXPECTED_EXCEPTION_ROWS);
  });

  it('registers layered explicitly (L5)', () => {
    registerLayered();
    registerLayered();
    expect(replayTransformRow(rows[0] as TransformRow)).toHaveProperty('lgraph');
  });

  it.each(rows.map((row) => [row.id, row] as [string, TransformRow]))('%s', (_id, row) => {
    expect(compareTransformOutcome(replayTransformRow(row), row)).toEqual([]);
  });
});
