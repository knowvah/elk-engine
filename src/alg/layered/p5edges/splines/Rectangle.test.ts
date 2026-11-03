// SPDX-License-Identifier: EPL-2.0
// Proof of Rectangle (mission 7e, T6): every `calls/Rectangle/*` row of layered-routing-steps.json replayed through
// `runCall` (the `union` rows pair the instance form `union(KVector)` with the static `union(Rectangle, Rectangle)`; the
// recorder never records the instance `union(Rectangle)`), plus structural cases. Every literal below is an input; each
// expectation is a row or a twin: one constructor or `union` form compared with another that the Java text states to
// compute the same coordinates.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { compareCall } from '../../../../../test/helpers/layered-routing-replay-compare.js';
import { runCall, type CallerTable } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import { isCallRow, loadRoutingRows, type CallRow } from '../../../../../test/helpers/layered-routing-replay-rows.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../../core/math/KVector.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { LNode } from '../../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { Rectangle } from './Rectangle.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROW_PREFIX = 'calls/Rectangle/';
const NO_ROWS = 0;

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

/** A void call returns its receiver (the T3 contract); a static method wins over an instance method of one name. */
const CALLERS: CallerTable = {
  'Rectangle.union': (rectangle: Rectangle, other: Rectangle | KVector | LNode): Rectangle => {
    if (other instanceof Rectangle) {
      return Rectangle.union(rectangle, other);
    }
    if (other instanceof KVector) {
      rectangle.union(other);
    } else {
      rectangle.union(other);
    }
    return rectangle;
  },
  'Rectangle.getHeight': (rectangle: Rectangle) => rectangle.getHeight(),
  'Rectangle.getWidth': (rectangle: Rectangle) => rectangle.getWidth(),
  'Rectangle.enlarge': (rectangle: Rectangle, enlargement: number): Rectangle => {
    rectangle.enlarge(enlargement);
    return rectangle;
  },
  'Rectangle.getFromPortSide': (rectangle: Rectangle, side: PortSide): number => rectangle.getFromPortSide(side),
  'Rectangle.toNodeMargins': (rectangle: Rectangle, node: LNode) => rectangle.toNodeMargins(node),
} as CallerTable;

function callRows(): CallRow[] {
  return loadRoutingRows(STEPS_FILE)
    .filter(isCallRow)
    .filter((row) => row.id.startsWith(ROW_PREFIX));
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('Rectangle calls rows', () => {
  const rows = callRows();

  it('finds the recorded rows', () => {
    expect(rows.length).toBeGreaterThan(NO_ROWS);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s matches the oracle', (_id, row) => {
    expect(compareCall(runCall(row, factories, CALLERS, { constructors: CONSTRUCTORS }), row.expected.result)).toEqual(
      [],
    );
  });
});

const sides = (rectangle: Rectangle): number[] => [
  rectangle.getTop(),
  rectangle.getRight(),
  rectangle.getBottom(),
  rectangle.getLeft(),
];

const VECTORS = [new KVector(4, -2), new KVector(-3, 7), new KVector(10, 1)];

describe('Rectangle constructors', () => {
  it('builds the same rectangle from the vectors as an iterable, as varargs and as repeated unions', () => {
    const unioned = new Rectangle(VECTORS[0]!);
    VECTORS.slice(1).forEach((vector) => unioned.union(vector));
    expect(sides(new Rectangle(VECTORS))).toEqual(sides(unioned));
    expect(sides(new Rectangle(...VECTORS))).toEqual(sides(unioned));
  });

  it('builds a rectangle without extent from one vector and a copy from a rectangle', () => {
    const point = new Rectangle(new KVector(5, 6));
    expect([point.getWidth(), point.getHeight()]).toEqual([0, 0]);
    expect(sides(new Rectangle(point))).toEqual(sides(point));
  });

  it('spans a shape from its position to position plus size, in either orientation', () => {
    const node = new LNode(null);
    node.getPosition().set(3, 4);
    node.getSize().set(10, 20);
    const forward = new Rectangle(node);
    expect(sides(forward)).toEqual(sides(new Rectangle(new KVector(3, 4), new KVector(13, 24))));
    node.getSize().set(-10, -20);
    expect(sides(new Rectangle(node))).toEqual(sides(new Rectangle(new KVector(3, 4), new KVector(-7, -16))));
  });

  it('takes the coordinates as (left, top, right, bottom)', () => {
    const rectangle = new Rectangle(1, 2, 30, 40);
    expect(sides(rectangle)).toEqual([2, 30, 40, 1]);
    expect([rectangle.getWidth(), rectangle.getHeight()]).toEqual([30 - 1, 40 - 2]);
  });

  it('rejects an inverted rectangle and an empty vector list with the Java messages', () => {
    expect(() => new Rectangle(0, 5, 1, 4)).toThrow(
      new IllegalArgumentException('Top must be smaller or equal to bottom.'),
    );
    expect(() => new Rectangle(2, 0, 1, 1)).toThrow(
      new IllegalArgumentException('Left must be smaller or equal to right.'),
    );
    expect(() => new Rectangle([])).toThrow(new IllegalArgumentException('The list of vectors may not be empty.'));
    expect(() => new Rectangle()).toThrow(new IllegalArgumentException('The list of vectors may not be empty.'));
  });
});

describe('Rectangle.union', () => {
  it('unions a shape as its position and its position plus size', () => {
    const node = new LNode(null);
    node.getPosition().set(-5, 8);
    node.getSize().set(6, 7);
    const viaShape = new Rectangle(new KVector(0, 0));
    viaShape.union(node);
    const viaVectors = new Rectangle(new KVector(0, 0));
    viaVectors.union(new KVector(-5, 8));
    viaVectors.union(new KVector(1, 15));
    expect(sides(viaShape)).toEqual(sides(viaVectors));
  });

  it('unions a rectangle on the instance and, without touching the operands, on the pair form', () => {
    const first = new Rectangle(0, 0, 2, 2);
    const second = new Rectangle(5, -3, 6, 1);
    const pair = Rectangle.union(first, second);
    expect(sides(first)).toEqual(sides(new Rectangle(0, 0, 2, 2)));
    first.union(second);
    expect(sides(pair)).toEqual(sides(first));
  });

  it('unions the following rectangles of a collection into its FIRST element and returns the copy made before (Java oddity)', () => {
    const first = new Rectangle(0, 0, 2, 2);
    const second = new Rectangle(5, -3, 6, 1);
    const before = sides(first);
    const expectedFirst = Rectangle.union(first, second);
    const result = Rectangle.union([first, second]);
    expect(sides(result)).toEqual(before);
    expect(sides(first)).toEqual(sides(expectedFirst));
  });

  it('rejects an empty collection with the Java message', () => {
    expect(() => Rectangle.union([])).toThrow(new IllegalArgumentException('The list of vectors may not be null.'));
  });
});

/** ICU's one-decimal HALF_EVEN, the twin of the hand-written formatter. */
/** `roundingMode` (ES2023 Intl.NumberFormat v3) is not in this TypeScript's lib typings. */
const TWIN_OPTIONS: Intl.NumberFormatOptions & { roundingMode: 'halfEven' } = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  roundingMode: 'halfEven',
  useGrouping: false,
};
const TWIN = new Intl.NumberFormat('en-US', TWIN_OPTIONS);

describe('Rectangle.toString', () => {
  it('prints top, left, bottom, right in that order with one rounded decimal', () => {
    const rectangle = new Rectangle(-1.25, 2.75, 30.5, 40.1);
    expect(rectangle.toString()).toBe(
      `[top= ${TWIN.format(2.75)},left= ${TWIN.format(-1.25)},bottom= ${TWIN.format(40.1)},right= ${TWIN.format(30.5)}]`,
    );
  });
});
