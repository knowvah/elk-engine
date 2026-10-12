// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { longBitsToDouble } from '../../java/lang/JavaDouble.js';
import { Random } from '../../java/util/Random.js';
import { KVector } from './KVector.js';

/** JUnit `assertEquals(double expected, double actual, double delta)`. */
function assertEquals(expected: number, actual: number, delta: number): void {
  expect(Math.abs(expected - actual)).toBeLessThanOrEqual(delta);
}

const HASH_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../../test/golden/refs/java/hash.json');
const HEX_RADIX = 16;
/** Row of `kvectorHash`: x bits, y bits (16 hex digits each), `new KVector(x, y).hashCode()`. */
type HashRow = [string, string, number];

/** Runs the action and returns the message of the error it throws ('no error' if none). */
function messageOf(action: () => void): string {
  try {
    action();
  } catch (e) {
    return (e as Error).message;
  }
  return 'no error';
}

/** Ported from org.eclipse.elk.core.test KVectorTest.java (assertions unchanged). */
describe('KVectorTest (ported JUnit)', () => {
  it('testEquals', () => {
    // init 2 KVectors
    let kvector1 = new KVector(10, 10);
    const kvector2 = new KVector();
    kvector2.x = 10;
    kvector2.y = 10;

    // test if kvector1 equals to kvector2
    expect(kvector1.equals(kvector2)).toBe(true);

    // init obj
    kvector1 = new KVector();
    const obj = {};

    // test if kvector1 not equals obj
    expect(kvector1.equals(obj)).toBe(false);
  });

  it('testAddAndSub', () => {
    const kvector1 = new KVector(12, 70);
    const kvector2 = new KVector(15, 17);

    // adding and subtracting the kvector2 to kvector1 = kvector1
    expect(kvector1.equals(kvector1.add(kvector2).sub(kvector2))).toBe(true);
  });

  it('testScale', () => {
    let a = new KVector(12, 70);
    let b = new KVector(12, 70);

    const aTemp = new KVector(12, 70);

    a = a.add(aTemp).add(aTemp);
    b = b.scale(3);

    expect(a.equals(b)).toBe(true);
  });

  it('testTranslate', () => {
    const v = new KVector(10, 30);
    const b = new KVector(50, 50);
    expect(b.equals(v.add(40, 20))).toBe(true);
  });

  it('testNormalize', () => {
    let v = new KVector(2, 0);
    let n = new KVector(1, 0);
    expect(n.equals(v.normalize())).toBe(true);
    v = new KVector(0, 2);
    n = new KVector(0, 1);
    expect(n.equals(v.normalize())).toBe(true);
  });

  it('testToDegrees', () => {
    // test 0 degrees
    let v = new KVector(10, 0);
    assertEquals(0, v.toDegrees(), 0.00001);

    // test 45 degrees
    v = new KVector(10, 10);
    assertEquals(45, v.toDegrees(), 0.00001);

    // test 90 degrees
    v = new KVector(0, 10);
    assertEquals(90, v.toDegrees(), 0.00001);

    // test 135 degrees
    v = new KVector(-10, 10);
    assertEquals(135, v.toDegrees(), 0.00001);

    // test 180 degrees
    v = new KVector(-10, 0);
    assertEquals(180, v.toDegrees(), 0.00001);

    // test 225 degrees
    v = new KVector(-10, -10);
    assertEquals(225, v.toDegrees(), 0.00001);

    // test 270 degrees
    v = new KVector(0, -10);
    assertEquals(270, v.toDegrees(), 0.00001);

    // test 315 degrees
    v = new KVector(10, -10);
    assertEquals(315, v.toDegrees(), 0.00001);
  });

  it('testDistance', () => {
    let v1 = new KVector(5, 50);
    let v2 = new KVector(5, 50);
    assertEquals(0, v1.distance(v2), 0);
    v1 = new KVector(0, 20);
    v2 = new KVector(0, 50);
    assertEquals(30, v1.distance(v2), 0);
  });

  it('testParse', () => {
    const v1 = new KVector(5, 50);
    const v2 = new KVector();
    v2.parse('(5,50)');
    v2.parse('{5,50}');
    expect(v1.equals(v2)).toBe(true);
    v2.parse('[5,50]');
    expect(v1.equals(v2)).toBe(true);
    v2.parse('{(5,50)}');
    expect(v1.equals(v2)).toBe(true);
    v2.parse('[(5,50)]');
    expect(v1.equals(v2)).toBe(true);
    v2.parse('[{5,50}]');
    expect(v1.equals(v2)).toBe(true);
  });

  it('testApplyBounds', () => {
    /*
     * test if vt.x > lowx and vt.y > lowy (the result must be the same vt)
     */
    const v = new KVector(30, 30);
    // vt aliases v, as in the Java test
    let vt = v;
    let vLowerBound = new KVector(10, 10);
    let vUpperBound = new KVector(40, 40);
    vt.bound(vLowerBound.x, vLowerBound.y, vUpperBound.x, vUpperBound.y);
    expect(vt.equals(v)).toBe(true);

    /*
     * test if vt.x < lowx and vt.y < lowy (the result must be the vt(lowx,lowy))
     */
    vt = v;
    vLowerBound = new KVector(40, 40);
    vUpperBound = new KVector(60, 60);
    vt.bound(vLowerBound.x, vLowerBound.y, vUpperBound.x, vUpperBound.y);
    expect(vt.equals(vLowerBound)).toBe(true);

    /*
     * test if vt.x > highx and vt.y > highy (the result must be the vt(highx,highy))
     */
    vt = v;
    vLowerBound = new KVector(20, 20);
    vUpperBound = new KVector(30, 30);
    vt.bound(vLowerBound.x, vLowerBound.y, vUpperBound.x, vUpperBound.y);
    expect(vt.equals(vUpperBound)).toBe(true);
  });
});

describe('KVector constructors', () => {
  it('defaults to (0,0)', () => {
    const v = new KVector();
    expect([v.x, v.y]).toEqual([0, 0]);
  });

  it('takes x and y', () => {
    const v = new KVector(1.5, -2);
    expect([v.x, v.y]).toEqual([1.5, -2]);
  });

  it('copies another vector into a distinct instance', () => {
    const original = new KVector(3, 4);
    const copy = new KVector(original);
    expect(copy).not.toBe(original);
    expect([copy.x, copy.y]).toEqual([3, 4]);
    copy.x = 9;
    expect(original.x).toBe(3);
  });

  it('points from start to end', () => {
    // end - start = (4 - 1, 6 - 2)
    const v = new KVector(new KVector(1, 2), new KVector(4, 6));
    expect([v.x, v.y]).toEqual([3, 4]);
  });

  it('fromAngle yields (cos, sin): Java new KVector(double angle)', () => {
    const east = KVector.fromAngle(0);
    expect([east.x, east.y]).toEqual([1, 0]);
    const north = KVector.fromAngle(Math.PI / 2);
    assertEquals(0, north.x, 1e-15);
    expect(north.y).toBe(1);
  });
});

describe('KVector clone, toString, equals, hashCode', () => {
  it('clone is an equal, distinct instance', () => {
    const v = new KVector(7, 8);
    const c = v.clone();
    expect(c).not.toBe(v);
    expect(c.equals(v)).toBe(true);
  });

  it('toString renders Java double text', () => {
    expect(new KVector(1, 2).toString()).toBe('(1.0,2.0)');
    expect(new KVector(-0.5, 1e7).toString()).toBe('(-0.5,1.0E7)');
  });

  it('equals compares with == : 0.0 equals -0.0, NaN equals nothing', () => {
    expect(new KVector(0, 0).equals(new KVector(-0, 0))).toBe(true);
    expect(new KVector(NaN, 0).equals(new KVector(NaN, 0))).toBe(false);
    expect(new KVector(1, 2).equals(new KVector(1, 3))).toBe(false);
    expect(new KVector(1, 2).equals(new KVector(2, 2))).toBe(false);
    expect(new KVector(1, 2).equals(null)).toBe(false);
  });

  it('hashCode of (1.0, 1.0) and (1.0, -1.0) match the JVM rows', () => {
    expect(new KVector(1, 1).hashCode()).toBe(1072697340);
    expect(new KVector(1, -1).hashCode()).toBe(1072697341);
  });

  it('hashCode of (1.0, 2.0)', () => {
    // hash.json has no (1.0, 2.0) row; derived from the Java body:
    // Double.hashCode(1.0) = 0x3ff00000 = 1072693248; Double.hashCode(2.0) = 0x40000000;
    // Integer.reverse(0x40000000) = 0x00000002 = 2; 1072693248 + 2 = 1072693250.
    expect(new KVector(1, 2).hashCode()).toBe(1072693250);
  });

  it('hashCode hashes bits: 0.0 and -0.0 are equal but hash apart', () => {
    // Double.hashCode(-0.0) = 0x80000000 = -2147483648; Integer.reverse(0) = 0.
    expect(new KVector(-0, 0).hashCode()).toBe(-2147483648);
    expect(new KVector(0, 0).hashCode()).toBe(0);
  });

  it('hashCode matches every kvectorHash row of the JVM vectors', () => {
    const rows = (JSON.parse(readFileSync(HASH_PATH, 'utf8')) as { kvectorHash: HashRow[] }).kvectorHash;
    expect(rows.length).toBeGreaterThan(0);
    for (const [xBits, yBits, expected] of rows) {
      const v = new KVector(longBitsToDouble(BigInt(`0x${xBits}`)), longBitsToDouble(BigInt(`0x${yBits}`)));
      expect(v.hashCode(), `${xBits},${yBits}`).toBe(expected);
    }
  });
});

describe('KVector equalsFuzzily', () => {
  it('uses 0.05 per dimension by default, inclusive', () => {
    const v = new KVector(0, 0);
    expect(v.equalsFuzzily(new KVector(0.05, -0.05))).toBe(true);
    expect(v.equalsFuzzily(new KVector(0.0500001, 0))).toBe(false);
    expect(v.equalsFuzzily(new KVector(0, -0.0500001))).toBe(false);
  });

  it('honours an explicit fuzzyness', () => {
    const v = new KVector(0, 0);
    expect(v.equalsFuzzily(new KVector(1, 1), 1)).toBe(true);
    expect(v.equalsFuzzily(new KVector(1, 1.5), 1)).toBe(false);
  });
});

describe('KVector arithmetic', () => {
  it('length and squareLength of (3,4)', () => {
    expect(new KVector(3, 4).length()).toBe(5);
    expect(new KVector(3, 4).squareLength()).toBe(25);
  });

  it('reset and set return this', () => {
    const v = new KVector(3, 4);
    expect(v.reset()).toBe(v);
    expect([v.x, v.y]).toEqual([0, 0]);
    expect(v.set(new KVector(5, 6))).toBe(v);
    expect([v.x, v.y]).toEqual([5, 6]);
    expect(v.set(7, 8)).toBe(v);
    expect([v.x, v.y]).toEqual([7, 8]);
  });

  it('add and sub in both forms mutate and return this', () => {
    const v = new KVector(5, 5);
    expect(v.add(new KVector(1, 2))).toBe(v);
    expect([v.x, v.y]).toEqual([6, 7]);
    expect(v.add(1, 1)).toBe(v);
    expect([v.x, v.y]).toEqual([7, 8]);
    expect(v.sub(new KVector(2, 2))).toBe(v);
    expect([v.x, v.y]).toEqual([5, 6]);
    expect(v.sub(2, 3)).toBe(v);
    expect([v.x, v.y]).toEqual([3, 3]);
  });

  it('sum adds arbitrarily many vectors into a new one', () => {
    const a = new KVector(1, 2);
    const s = KVector.sum(a, new KVector(3, 4), new KVector(5, 6));
    expect([s.x, s.y]).toEqual([9, 12]);
    expect([a.x, a.y]).toEqual([1, 2]);
    const empty = KVector.sum();
    expect([empty.x, empty.y]).toEqual([0, 0]);
  });

  it('diff returns v1 - v2 as a new vector', () => {
    const d = KVector.diff(new KVector(5, 7), new KVector(2, 3));
    expect([d.x, d.y]).toEqual([3, 4]);
  });

  it('scale with one or two factors', () => {
    const v = new KVector(2, 3);
    expect(v.scale(2)).toBe(v);
    expect([v.x, v.y]).toEqual([4, 6]);
    expect(v.scale(0.5, 3)).toBe(v);
    expect([v.x, v.y]).toEqual([2, 18]);
  });

  it('normalize divides by the length and leaves the zero vector alone', () => {
    const v = new KVector(3, 4).normalize();
    expect([v.x, v.y]).toEqual([0.6, 0.8]);
    const zero = new KVector(0, 0).normalize();
    expect([zero.x, zero.y]).toEqual([0, 0]);
  });

  it('scaleToLength normalizes then scales', () => {
    // (3,4) -> (0.6,0.8) -> *10 = (6,8) after correct rounding of 0.6*10 and 0.8*10
    const v = new KVector(3, 4);
    expect(v.scaleToLength(10)).toBe(v);
    expect([v.x, v.y]).toEqual([6, 8]);
  });

  it('negate flips both signs, including 0 to -0', () => {
    const v = new KVector(1, -2);
    expect(v.negate()).toBe(v);
    expect([v.x, v.y]).toEqual([-1, 2]);
    const z = new KVector(0, 0).negate();
    expect(Object.is(z.x, -0)).toBe(true);
    expect(Object.is(z.y, -0)).toBe(true);
  });
});

describe('KVector angles', () => {
  it('toRadians covers the four quadrants', () => {
    // 1st: asin(y/l); 2nd/3rd (x < 0): pi - asin(y/l); 4th: 2 pi + asin(y/l)
    expect(new KVector(1, 0).toRadians()).toBe(0);
    expect(new KVector(0, 1).toRadians()).toBe(Math.PI / 2);
    expect(new KVector(-1, 0).toRadians()).toBe(Math.PI);
    assertEquals((3 * Math.PI) / 2, new KVector(0, -1).toRadians(), 1e-15);
    assertEquals((7 * Math.PI) / 4, new KVector(1, -1).toRadians(), 1e-15);
    assertEquals((5 * Math.PI) / 4, new KVector(-1, -1).toRadians(), 1e-15);
  });

  it('rotate turns anti-clockwise and returns this', () => {
    // (1,0) rotated by pi/2: x = cos - 0 = 6.1e-17, y = sin + 0 = 1
    const v = new KVector(1, 0);
    expect(v.rotate(Math.PI / 2)).toBe(v);
    assertEquals(0, v.x, 1e-15);
    expect(v.y).toBe(1);
    const w = new KVector(1, 2).rotate(Math.PI);
    assertEquals(-1, w.x, 1e-15);
    assertEquals(-2, w.y, 1e-15);
  });

  it('angle is acos(dot / (|a| |b|))', () => {
    expect(new KVector(1, 0).angle(new KVector(0, 1))).toBe(Math.PI / 2);
    expect(new KVector(1, 0).angle(new KVector(2, 0))).toBe(0);
  });

  it('dotProduct, crossProduct and distance', () => {
    expect(new KVector(1, 2).dotProduct(new KVector(3, 4))).toBe(11);
    // v.x * w.y - v.y * w.x = 1*4 - 2*3
    expect(KVector.crossProduct(new KVector(1, 2), new KVector(3, 4))).toBe(-2);
    expect(new KVector(0, 0).distance(new KVector(3, 4))).toBe(5);
  });
});

describe('KVector wiggle', () => {
  it('adds noise from two consecutive nextDouble draws, x first', () => {
    // Random(1): nextDouble() = 0.7308781907032909, then 0.41008081149220166 (JVM sequence).
    // amount = 2: x += d1 * 2 - 1 -> 10 + 0.4617563814065818; y += d2 * 2 - 1 -> 20 - 0.17983837701559668.
    const v = new KVector(10, 20);
    v.wiggle(new Random(1), 2);
    expect(v.x).toBe(10.461756381406582);
    expect(v.y).toBe(19.820161622984404);
  });
});

describe('KVector bound', () => {
  it('throws IllegalArgumentException when highx < lowx or highy < lowy', () => {
    const message = 'The highx must be bigger then lowx and the highy must be bigger then lowy';
    expect(() => new KVector(0, 0).bound(5, 0, 4, 10)).toThrow(new IllegalArgumentException(message));
    expect(() => new KVector(0, 0).bound(0, 5, 10, 4)).toThrow(IllegalArgumentException);
  });

  it('clamps each dimension independently', () => {
    const v = new KVector(50, -50).bound(0, 0, 10, 10);
    expect([v.x, v.y]).toEqual([10, 0]);
    const w = new KVector(-5, 50).bound(0, 0, 10, 10);
    expect([w.x, w.y]).toEqual([0, 10]);
  });
});

describe('KVector isNaN and isInfinite', () => {
  it('isNaN is true if either coordinate is NaN', () => {
    expect(new KVector(NaN, 0).isNaN()).toBe(true);
    expect(new KVector(0, NaN).isNaN()).toBe(true);
    expect(new KVector(0, 0).isNaN()).toBe(false);
  });

  it('isInfinite is true if either coordinate is infinite', () => {
    expect(new KVector(Infinity, 0).isInfinite()).toBe(true);
    expect(new KVector(0, -Infinity).isInfinite()).toBe(true);
    expect(new KVector(0, 0).isInfinite()).toBe(false);
  });
});

describe('KVector parse', () => {
  it('accepts ; and carriage return as separators and strips delimiters around', () => {
    const v = new KVector();
    v.parse(' "( 1.5 ; -2 )" ');
    expect([v.x, v.y]).toEqual([1.5, -2]);
    v.parse('3\r4');
    expect([v.x, v.y]).toEqual([3, 4]);
    v.parse('5\n6');
    expect([v.x, v.y]).toEqual([5, 6]);
  });

  it('drops trailing empty tokens like String.split', () => {
    // Java "5,50,".split(",|;|\r|\n") has length 2 (trailing empty string removed); JS split gives 3.
    const v = new KVector();
    v.parse('5,50,');
    expect([v.x, v.y]).toEqual([5, 50]);
  });

  it('rejects a string without numbers', () => {
    const message = 'The given string does not contain any numbers.';
    expect(messageOf(() => new KVector().parse(''))).toBe(message);
    expect(messageOf(() => new KVector().parse(' ()  '))).toBe(message);
  });

  it('rejects a wrong token count', () => {
    expect(messageOf(() => new KVector().parse('1,2,3'))).toBe('Exactly two numbers are expected, 3 were found.');
    expect(messageOf(() => new KVector().parse('5'))).toBe('Exactly two numbers are expected, 1 were found.');
    // "(,)" -> ",": every token empty, Java split returns an empty array
    expect(messageOf(() => new KVector().parse('(,)'))).toBe('Exactly two numbers are expected, 0 were found.');
    // "5,," -> ["5"]
    expect(messageOf(() => new KVector().parse('5,,'))).toBe('Exactly two numbers are expected, 1 were found.');
  });

  it('wraps a NumberFormatException, keeping the cause text', () => {
    const v = new KVector(1, 1);
    expect(() => v.parse('5,a')).toThrow(IllegalArgumentException);
    // x is assigned before y fails, as in the Java body
    expect([v.x, v.y]).toEqual([5, 1]);
    expect(messageOf(() => new KVector().parse('(5,a)'))).toBe(
      'The given string contains parts that cannot be parsed as numbers.NumberFormatException: For input string: "a"',
    );
    expect(messageOf(() => new KVector().parse(',5'))).toBe(
      'The given string contains parts that cannot be parsed as numbers.NumberFormatException: empty String',
    );
  });
});
