// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the NubsSelfLoop branches that only the T13 `calls/NubsSelfLoop/createCornerSelfLoop-undefined*`
// rows reach (mission 7e, T14b, unreached.md S20), and the constructor arm the factory rows cannot take (J). A port
// whose side is UNDEFINED falls into `default: break` of both corner switches: `portSideToDirection(UNDEFINED)` is 0.0
// and the second control point keeps the coordinate the other end's switch gave it. Literals are the rows' (L4, R14).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../../test/helpers/layered-framework-replay.js';
import type { Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { runCall, type CallerTable } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isCallRow,
  loadRoutingRows,
  type NubsSummary,
} from '../../../../../test/helpers/layered-routing-replay-rows.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { NubSpline } from './NubSpline.js';
import { NubsSelfLoop } from './NubsSelfLoop.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const COORDINATE_DIGITS = 6;
const SECOND_CP = 2;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    throw new Error(`no calls/NubsSelfLoop row runs the phase ${phase}/${strategy}`);
  },
};

const CALLERS: CallerTable = { 'NubsSelfLoop.createCornerSelfLoop': NubsSelfLoop.createCornerSelfLoop };

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows = loadRoutingRows(STEPS_FILE).filter(isCallRow);

function loopOf(id: string): NubsSummary {
  const row = rows.find((candidate) => candidate.id === `calls/NubsSelfLoop/${id}`);
  if (row === undefined) {
    throw new Error(`no row calls/NubsSelfLoop/${id}`);
  }
  const result = runCall(row, factories, CALLERS);
  if (result.type !== 'nubs' || result.value === null) {
    throw new Error(`${id} did not return a spline`);
  }
  return result.value;
}

function expectNumbers(actual: readonly string[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => expect(decodeHex(actual[index]!)).toBeCloseTo(value, COORDINATE_DIGITS));
}

describe('NubsSelfLoop.createCornerSelfLoop with UNDEFINED sides (T14b, S20)', () => {
  it('keeps the corner at the origin when both ports have no side', () => {
    // oracle: calls/NubsSelfLoop/createCornerSelfLoop-undefined; NubsSelfLoop.java:191-192 and :208-209 (default: break)
    const loop = loopOf('createCornerSelfLoop-undefined');
    expectNumbers(loop.controlPoints[SECOND_CP]!, [0, 0]);
    expectNumbers(loop.outerBox, [0, 125.4, 47, 0]);
    expectNumbers(loop.firstLabelPosition!, [0, 0]);
  });

  it('takes the corner y of the NORTH source when only the target side is UNDEFINED', () => {
    // oracle: calls/NubsSelfLoop/createCornerSelfLoop-undefined-northTarget; NubsSelfLoop.java:185-187 then :208-209
    const loop = loopOf('createCornerSelfLoop-undefined-northTarget');
    expectNumbers(loop.controlPoints[SECOND_CP]!, [0, -14.2]);
    expectNumbers(loop.outerBox, [-14.2, 125.4, 47, 0]);
  });
});

describe('NubsSelfLoop(dim) without control points (T14b, J)', () => {
  it('fails like NubSpline on an empty list: the padding loop reads element 0 of nothing', () => {
    // J: NubsSelfLoop.java:60-61 (the varargs constructor with zero vectors) into NubSpline.java:152 and :110
    expect(() => new NubSpline(true, NubSpline.DIM, [])).toThrow(IndexOutOfBoundsException);
    expect(() => new NubsSelfLoop(NubSpline.DIM)).toThrow(IndexOutOfBoundsException);
  });
});
