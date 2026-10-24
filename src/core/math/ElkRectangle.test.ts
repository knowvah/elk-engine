// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from './ElkRectangle.js';
import { KVector } from './KVector.js';

// ElkRectangle.java; the four ElkMathTest cases that use a rectangle (:27, :43, :55, :106) all call
// ElkMath.contains/intersects, which are not ported yet (5b), so they are not ported here.
const RECT_X = 23;
const RECT_Y = 14;
const RECT_SIZE = 20;

const rect = (): ElkRectangle => new ElkRectangle(RECT_X, RECT_Y, RECT_SIZE, RECT_SIZE);
const xy = (v: KVector): [number, number] => [v.x, v.y];

describe('ElkRectangle constructors and setRect', () => {
  it('creates an empty rectangle (:36-38)', () => {
    const r = new ElkRectangle();
    expect([r.x, r.y, r.width, r.height]).toEqual([0, 0, 0, 0]);
  });

  it('copies coordinates (:56-61) and the copy constructor (:75-80)', () => {
    const r = rect();
    const copy = new ElkRectangle(r);
    r.x = 99;
    expect([copy.x, copy.y, copy.width, copy.height]).toEqual([23, 14, 20, 20]);
  });

  it('setRect replaces all four values (:96-101)', () => {
    const r = rect();
    r.setRect(1, 2, 3, 4);
    expect([r.x, r.y, r.width, r.height]).toEqual([1, 2, 3, 4]);
  });
});

describe('ElkRectangle corners', () => {
  it('computes the position and corners (:106-141)', () => {
    const r = rect();
    expect(xy(r.getPosition())).toEqual([23, 14]);
    expect(xy(r.getTopLeft())).toEqual([23, 14]);
    expect(xy(r.getTopRight())).toEqual([43, 14]);
    expect(xy(r.getBottomLeft())).toEqual([23, 34]);
    expect(xy(r.getBottomRight())).toEqual([43, 34]);
    expect(xy(r.getCenter())).toEqual([33, 24]);
    expect([r.getMaxX(), r.getMaxY()]).toEqual([43, 34]);
  });
});

describe('ElkRectangle.union', () => {
  it('covers both rectangles (:150-166)', () => {
    const r = rect();
    r.union(new ElkRectangle(30, 0, 50, 10));
    // x: 23..80, y: 0..34
    expect([r.x, r.y, r.width, r.height]).toEqual([23, 0, 57, 34]);
  });

  it('swaps the corners when a rectangle has a negative size (:158-165)', () => {
    const r = new ElkRectangle(10, 10, -4, -6);
    r.union(new ElkRectangle(10, 10, -4, -6));
    // x1 = 10, x2 = 6 -> swapped to 6..10; y1 = 10, y2 = 4 -> 4..10
    expect([r.x, r.y, r.width, r.height]).toEqual([6, 4, 4, 6]);
  });
});

describe('ElkRectangle.move', () => {
  it('adds the offset to the position only (:173-176)', () => {
    const r = rect();
    r.move(new KVector(-3, 6));
    expect([r.x, r.y, r.width, r.height]).toEqual([20, 20, 20, 20]);
  });
});

describe('ElkRectangle.intersects', () => {
  it.each([
    [new ElkRectangle(30, 20, 5, 5), true], // inside
    [new ElkRectangle(40, 30, 20, 20), true], // overlapping corner
    [new ElkRectangle(43, 14, 5, 5), false], // touching the right border: strict
    [new ElkRectangle(0, 0, 23, 14), false], // touching the corner
    [new ElkRectangle(0, 40, 100, 5), false], // below
    [new ElkRectangle(0, 0, 5, 5), false], // above left
  ])('%o intersects: %s (:216-218)', (other, expected) => {
    expect(rect().intersects(other)).toBe(expected);
  });
});

describe('ElkRectangle.toString', () => {
  it('uses Java double text (:179-181)', () => {
    expect(rect().toString()).toBe('Rect[x=23.0,y=14.0,w=20.0,h=20.0]');
    expect(new ElkRectangle(1.5, -2.5, 0, 1e7).toString()).toBe('Rect[x=1.5,y=-2.5,w=0.0,h=1.0E7]');
  });
});

describe('ElkRectangle.equals and hashCode', () => {
  it('compares the four values as Double.equals (:183-191)', () => {
    expect(rect().equals(rect())).toBe(true);
    expect(rect().equals(new ElkRectangle(23, 14, 20, 21))).toBe(false);
    expect(rect().equals(new ElkRectangle(24, 14, 20, 20))).toBe(false);
    expect(rect().equals(new ElkRectangle(23, 15, 20, 20))).toBe(false);
    expect(rect().equals(new ElkRectangle(23, 14, 21, 20))).toBe(false);
  });

  it('treats NaN as equal to NaN and 0.0 as different from -0.0 (Double.equals)', () => {
    expect(new ElkRectangle(NaN, 0, 0, 0).equals(new ElkRectangle(NaN, 0, 0, 0))).toBe(true);
    expect(new ElkRectangle(0, 0, 0, 0).equals(new ElkRectangle(-0, 0, 0, 0))).toBe(false);
  });

  it('is false for null and other types (:184)', () => {
    expect(rect().equals(null)).toBe(false);
    expect(rect().equals(new KVector(23, 14))).toBe(false);
  });

  it('hashes as Objects.hash(x, y, width, height) (:194-196)', () => {
    // all zeros: Double.hashCode(0.0) = 0, so 31^4 = 923521
    expect(new ElkRectangle().hashCode()).toBe(923521);
    // h = 31 * h + Double.hashCode(v), int arithmetic, per the Arrays.hashCode Javadoc
    expect(rect().hashCode()).toBe(-1406986367);
    expect(new ElkRectangle(1.5, -2.5, 0.0, 3.0).hashCode()).toBe(740431745);
  });
});
