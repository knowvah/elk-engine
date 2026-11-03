// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the Rectangle branches that only the T13 `calls/Rectangle/extents/*` rows reach (mission 7e, T14b,
// unreached.md S19) and structural cases for its one-decimal formatter (J, R6). Each row case replays one row through
// `runCall` and asserts the field the branch decides (the unioned box, the height, the width) with literals copied from
// the row (L4, R14). The formatter arms the replays never take (NaN, infinities, values past 1e21) are twin comparisons
// with ICU's HALF_EVEN formatter, which agrees with Java's DecimalFormat on those forms.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../../test/helpers/layered-framework-replay.js';
import type { Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { runCall, type CallerTable } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isCallRow,
  loadRoutingRows,
  type CallResult,
} from '../../../../../test/helpers/layered-routing-replay-rows.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import type { LNode } from '../../graph/LNode.js';
import { Rectangle } from './Rectangle.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const COORDINATE_DIGITS = 6;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    throw new Error(`no calls/Rectangle row runs the phase ${phase}/${strategy}`);
  },
};

/** The row order of a `rectangle` argument is (top, right, bottom, left); the constructor takes (left, top, right, bottom). */
const CONSTRUCTORS = {
  rectangle: (top: number, right: number, bottom: number, left: number): Rectangle =>
    new Rectangle(left, top, right, bottom),
};

const CALLERS = {
  'Rectangle.union': (rectangle: Rectangle, node: LNode): Rectangle => {
    rectangle.union(node);
    return rectangle;
  },
  'Rectangle.getHeight': (rectangle: Rectangle) => rectangle.getHeight(),
  'Rectangle.getWidth': (rectangle: Rectangle) => rectangle.getWidth(),
} as CallerTable;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows = loadRoutingRows(STEPS_FILE).filter(isCallRow);

function replayed(id: string): CallResult {
  const row = rows.find((candidate) => candidate.id === `calls/Rectangle/extents/${id}`);
  if (row === undefined) {
    throw new Error(`no row calls/Rectangle/extents/${id}`);
  }
  return runCall(row, factories, CALLERS, { constructors: CONSTRUCTORS });
}

/** The (top, right, bottom, left) of a rectangle result. */
function boxOf(id: string): number[] {
  const result = replayed(id);
  if (result.type !== 'rectangle' || result.value === null) {
    throw new Error(`${id} did not return a rectangle`);
  }
  return result.value.map(decodeHex);
}

function numberOf(id: string): number {
  const result = replayed(id);
  if (result.type !== 'double' || result.value === null) {
    throw new Error(`${id} did not return a double`);
  }
  return decodeHex(result.value);
}

function expectBox(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, COORDINATE_DIGITS));
}

describe('Rectangle.union(LShape) rows (T14b, S19)', () => {
  it('grows a rectangle that is disjoint from the node to the hull of both', () => {
    // oracle: calls/Rectangle/extents/union-node-0; Rectangle.java:160-163 (union(shape) unions position, then position + size)
    expectBox(boxOf('union-node-0'), [7, 200, 140, 12]);
  });

  it('leaves a rectangle that contains the node unchanged', () => {
    // oracle: calls/Rectangle/extents/union-node-1; Rectangle.java:160-163
    expectBox(boxOf('union-node-1'), [0, 100, 60, 0]);
  });

  it('grows only the sides the node sticks out of', () => {
    // oracle: calls/Rectangle/extents/union-node-2; Rectangle.java:160-163
    expectBox(boxOf('union-node-2'), [-5, 56, 33, -8]);
  });
});

describe('Rectangle.getHeight and getWidth rows (T14b, S19)', () => {
  it.each([
    // oracle: calls/Rectangle/extents/getHeight-0; Rectangle.java:227
    ['getHeight-0', 20],
    // oracle: calls/Rectangle/extents/getHeight-1; Rectangle.java:227 (negative top)
    ['getHeight-1', 17],
    // oracle: calls/Rectangle/extents/getHeight-2; Rectangle.java:227 (a point)
    ['getHeight-2', 0],
    // oracle: calls/Rectangle/extents/getWidth-0; Rectangle.java:236
    ['getWidth-0', 10],
    // oracle: calls/Rectangle/extents/getWidth-1; Rectangle.java:236 (negative left)
    ['getWidth-1', 11],
    // oracle: calls/Rectangle/extents/getWidth-2; Rectangle.java:236 (a point)
    ['getWidth-2', 0],
  ] as const)('%s is %s', (id, expected) => {
    expect(numberOf(id)).toBeCloseTo(expected, COORDINATE_DIGITS);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// J: the one-decimal HALF_EVEN formatter of toString (Rectangle.java:322, DecimalFormat("#0.0"))

/** `roundingMode` (ES2023 Intl.NumberFormat v3) is not in this TypeScript's lib typings. */
const TWIN_OPTIONS: Intl.NumberFormatOptions & { roundingMode: 'halfEven' } = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  roundingMode: 'halfEven',
  useGrouping: false,
};
const TWIN = new Intl.NumberFormat('en-US', TWIN_OPTIONS);
const TO_STRING = /^\[top= (.*),left= (.*),bottom= (.*),right= (.*)\]$/;

/** The four formatted numbers of `toString`: top, left, bottom, right. */
function formatted(rectangle: Rectangle): string[] {
  return TO_STRING.exec(rectangle.toString())!.slice(1);
}

describe('Rectangle.toString formatter arms the replays never take (T14b, J)', () => {
  it('spells NaN like the twin', () => {
    // J: Rectangle.java:322; no comparison against NaN fails, so the constructor accepts it
    expect(formatted(new Rectangle(Number.NaN, 0, 1, 1))).toEqual([
      TWIN.format(0),
      TWIN.format(Number.NaN),
      TWIN.format(1),
      TWIN.format(1),
    ]);
  });

  it('spells the infinities with their sign like the twin', () => {
    // J: Rectangle.java:322
    expect(formatted(new Rectangle(-Infinity, -Infinity, Infinity, Infinity))).toEqual([
      TWIN.format(-Infinity),
      TWIN.format(-Infinity),
      TWIN.format(Infinity),
      TWIN.format(Infinity),
    ]);
  });

  it('prints a value from 1e21 in full, without an exponent, like the twin', () => {
    // J: Rectangle.java:322 (DecimalFormat never switches to exponent notation)
    expect(formatted(new Rectangle(0, 0, 1e21, 1e21))).toEqual([
      TWIN.format(0),
      TWIN.format(0),
      TWIN.format(1e21),
      TWIN.format(1e21),
    ]);
  });

  it('rounds an exact tie to the even tenth and keeps the sign of negative zero', () => {
    // J: Rectangle.java:322 (HALF_EVEN); 0.25 and 0.75 are exact binary ties, the only ones ICU and Java agree on
    expect(formatted(new Rectangle(-0, 0.25, 0.75, 0.25))).toEqual([
      TWIN.format(0.25),
      TWIN.format(-0),
      TWIN.format(0.25),
      TWIN.format(0.75),
    ]);
  });
});
