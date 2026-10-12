// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import { NoSuchElementException } from '../../java/util/NoSuchElementException.js';
import { KVector } from './KVector.js';
import { KVectorChain } from './KVectorChain.js';

/** JUnit `assertEquals(double expected, double actual, double delta)`. */
function assertEquals(expected: number, actual: number, delta: number): void {
  expect(Math.abs(expected - actual)).toBeLessThanOrEqual(delta);
}

/** Runs the action and returns the message of the error it throws ('no error' if none). */
function messageOf(action: () => void): string {
  try {
    action();
  } catch (e) {
    return (e as Error).message;
  }
  return 'no error';
}

/** Coordinates of the chain as `[x, y]` pairs. */
function coordinates(chain: Iterable<KVector>): number[][] {
  return [...chain].map((v) => [v.x, v.y]);
}

/** Ported from org.eclipse.elk.core.test KVectorChainTest.java (assertions unchanged). */
describe('KVectorChainTest (ported JUnit)', () => {
  it('testParse', () => {
    const v0 = new KVector(5, 50);
    const v1 = new KVector(10, 50);
    const v2 = new KVector(30, 50);
    let kv = new KVectorChain();
    kv.parse('{(5,50),(10,50),(30,50)}');

    expect(v0.equals(kv.get(0))).toBe(true);
    expect(v1.equals(kv.get(1))).toBe(true);
    expect(v2.equals(kv.get(2))).toBe(true);

    // ignore a dangling element
    kv = new KVectorChain();
    kv.parse('{(5,50),(10,50),(30,)}');

    expect(v0.equals(kv.get(0))).toBe(true);
    expect(v1.equals(kv.get(1))).toBe(true);
    expect(kv.size() === 2).toBe(true);

    // some weird syntax
    kv = new KVectorChain();
    kv.parse('{(5; 50 ], [10 , 50 ),(30,,,)}');

    expect(v0.equals(kv.get(0))).toBe(true);
    expect(v1.equals(kv.get(1))).toBe(true);
    expect(kv.size() === 2).toBe(true);
  });

  it('testParseIllegalArgumentException', () => {
    const kv = new KVectorChain();
    expect(() => kv.parse('{(5,a),(10,50),(30,50)}')).toThrow(IllegalArgumentException);
  });

  it('testGetLength', () => {
    // 3 overlaped KVectors
    const kv = new KVectorChain();
    kv.parse('{(10,50),(10,50),(10,50)}');
    assertEquals(0, kv.totalLength(), 0);

    // 3 differing KVecors
    kv.parse('{(10,0),(10,20),(10,30)}');
    assertEquals(30, kv.totalLength(), 0);
  });

  it('testGetPointOnLine', () => {
    const v0 = new KVector(5, 50);
    const v1 = new KVector(10, 50);
    const v2 = new KVector(30, 50);
    const kv = new KVectorChain(v0, v1, v2);

    // test if resturns v0 for distance = 0
    expect(v0.equals(kv.pointOnLine(0))).toBe(true);

    // test if resturns v1 for distance = 5
    expect(v1.equals(kv.pointOnLine(5))).toBe(true);

    // test if resturns endpoint  for distance > KVectorChain's length
    expect(v2.equals(kv.pointOnLine(40))).toBe(true);
  });
});

describe('KVectorChain construction', () => {
  it('is a LinkedList of vectors, empty by default', () => {
    const chain = new KVectorChain();
    expect(chain).toBeInstanceOf(LinkedList);
    expect(chain.size()).toBe(0);
  });

  it('copies the elements of a collection, sharing the vector instances', () => {
    const a = new KVector(1, 2);
    const b = new KVector(3, 4);
    const source = new LinkedList<KVector>([a, b]);
    const chain = new KVectorChain(source);
    source.clear();
    expect(chain.size()).toBe(2);
    expect(chain.get(0)).toBe(a);
    expect(chain.get(1)).toBe(b);
  });

  it('accepts a plain array as the collection', () => {
    const a = new KVector(1, 2);
    const chain = new KVectorChain([a]);
    expect(chain.toArray()).toEqual([a]);
  });

  it('adds the vectors of the varargs constructor in order', () => {
    const a = new KVector(1, 2);
    const b = new KVector(3, 4);
    const chain = new KVectorChain(a, b);
    expect(chain.toArray()).toEqual([a, b]);
    expect(chain.get(0)).toBe(a);
  });
});

describe('KVectorChain toString and toArray', () => {
  it('toString joins vectors with "; " inside parentheses', () => {
    expect(new KVectorChain(new KVector(1, 2), new KVector(3, 4.5)).toString()).toBe('(1.0,2.0; 3.0,4.5)');
    expect(new KVectorChain(new KVector(0, -1)).toString()).toBe('(0.0,-1.0)');
    expect(new KVectorChain().toString()).toBe('()');
  });

  it('toArray returns the elements in order as a fresh array', () => {
    const a = new KVector(1, 1);
    const b = new KVector(2, 2);
    const chain = new KVectorChain(a, b);
    const array = chain.toArray();
    expect(array).toEqual([a, b]);
    expect(array[1]).toBe(b);
    array.length = 0;
    expect(chain.size()).toBe(2);
  });

  it('toArray(beginIndex) returns the tail starting at the index', () => {
    const a = new KVector(1, 1);
    const b = new KVector(2, 2);
    const c = new KVector(3, 3);
    const chain = new KVectorChain(a, b, c);
    expect(chain.toArray(0)).toEqual([a, b, c]);
    expect(chain.toArray(1)).toEqual([b, c]);
    expect(chain.toArray(3)).toEqual([]);
  });

  it('toArray(beginIndex) rejects indices outside 0..size', () => {
    const chain = new KVectorChain(new KVector(), new KVector());
    expect(() => chain.toArray(-1)).toThrow(IndexOutOfBoundsException);
    expect(() => chain.toArray(3)).toThrow(IndexOutOfBoundsException);
  });
});

describe('KVectorChain parse', () => {
  it('clears the previous content', () => {
    const chain = new KVectorChain(new KVector(9, 9));
    chain.parse('(1,2)');
    expect(coordinates(chain)).toEqual([[1, 2]]);
  });

  it('ignores an extra token and treats any delimiter or blank as a separator', () => {
    // tokens 1,2,3: (1,2) is added when y arrives; 3 would be the next x and is dropped
    const chain = new KVectorChain();
    chain.parse('(1,2) 3');
    expect(coordinates(chain)).toEqual([[1, 2]]);
    chain.parse('1\t2\n3 4');
    expect(coordinates(chain)).toEqual([
      [1, 2],
      [3, 4],
    ]);
    chain.parse('');
    expect(chain.size()).toBe(0);
  });

  it('wraps a NumberFormatException, keeping the vectors parsed so far', () => {
    const chain = new KVectorChain();
    // (1,2) is complete before "x" fails as the y of the second vector
    expect(messageOf(() => chain.parse('1,2,3,x'))).toBe(
      'The given string does not match the expected format for vectors.NumberFormatException: For input string: "x"',
    );
    expect(coordinates(chain)).toEqual([[1, 2]]);
  });
});

describe('KVectorChain add overloads', () => {
  it('add() appends (0,0), add(x, y) appends (x,y), add(v) is inherited', () => {
    const chain = new KVectorChain();
    chain.add();
    chain.add(1, 2);
    const v = new KVector(3, 4);
    expect(chain.add(v)).toBe(true);
    expect(coordinates(chain)).toEqual([
      [0, 0],
      [1, 2],
      [3, 4],
    ]);
    expect(chain.get(2)).toBe(v);
  });

  it('addFirst variants prepend', () => {
    const chain = new KVectorChain(new KVector(5, 5));
    chain.addFirst();
    chain.addFirst(1, 2);
    chain.addFirst(new KVector(7, 8));
    expect(coordinates(chain)).toEqual([
      [7, 8],
      [1, 2],
      [0, 0],
      [5, 5],
    ]);
  });

  it('addLast variants append', () => {
    const chain = new KVectorChain(new KVector(5, 5));
    chain.addLast();
    chain.addLast(1, 2);
    chain.addLast(new KVector(7, 8));
    expect(coordinates(chain)).toEqual([
      [5, 5],
      [0, 0],
      [1, 2],
      [7, 8],
    ]);
  });

  it('addAll takes varargs vectors or a collection', () => {
    const a = new KVector(1, 1);
    const b = new KVector(2, 2);
    const c = new KVector(3, 3);
    const chain = new KVectorChain();
    chain.addAll(a, b);
    expect(chain.toArray()).toEqual([a, b]);
    expect(chain.addAll([c])).toBe(true);
    expect(chain.toArray()).toEqual([a, b, c]);
    chain.addAll();
    expect(chain.size()).toBe(3);
    expect(chain.get(2)).toBe(c);
  });

  it('addAllAsCopies inserts copies at the index', () => {
    const a = new KVector(1, 1);
    const b = new KVector(2, 2);
    const chain = new KVectorChain(new KVector(0, 0), new KVector(9, 9));
    chain.addAllAsCopies(1, [a, b]);
    expect(coordinates(chain)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [9, 9],
    ]);
    expect(chain.get(1)).not.toBe(a);
    a.x = 100;
    expect(chain.get(1).x).toBe(1);
  });
});

describe('KVectorChain transformations', () => {
  it('scale(s) and scale(sx, sy) scale every vector and return this', () => {
    const chain = new KVectorChain(new KVector(1, 2), new KVector(3, 4));
    expect(chain.scale(2)).toBe(chain);
    expect(coordinates(chain)).toEqual([
      [2, 4],
      [6, 8],
    ]);
    expect(chain.scale(0.5, 10)).toBe(chain);
    expect(coordinates(chain)).toEqual([
      [1, 40],
      [3, 80],
    ]);
  });

  it('offset adds a vector or dx/dy to every vector and returns this', () => {
    const chain = new KVectorChain(new KVector(1, 2), new KVector(3, 4));
    expect(chain.offset(new KVector(10, 20))).toBe(chain);
    expect(coordinates(chain)).toEqual([
      [11, 22],
      [13, 24],
    ]);
    expect(chain.offset(1, -1)).toBe(chain);
    expect(coordinates(chain)).toEqual([
      [12, 21],
      [14, 23],
    ]);
  });

  it('offsetNonMutating leaves the original untouched', () => {
    const a = new KVector(1, 2);
    const chain = new KVectorChain(a);
    const result = chain.offsetNonMutating(new KVector(10, 20));
    expect(coordinates(result)).toEqual([[11, 22]]);
    expect(result.get(0)).not.toBe(a);
    expect(coordinates(chain)).toEqual([[1, 2]]);
  });
});

describe('KVectorChain measurements', () => {
  it('totalLength is 0 for fewer than two points and sums the segment lengths', () => {
    expect(new KVectorChain().totalLength()).toBe(0);
    expect(new KVectorChain(new KVector(4, 4)).totalLength()).toBe(0);
    expect(new KVectorChain(new KVector(0, 0), new KVector(3, 4)).totalLength()).toBe(5);
    expect(new KVectorChain(new KVector(0, 0), new KVector(3, 4), new KVector(3, 10)).totalLength()).toBe(11);
  });

  it('hasNaN and hasInfinite look at every vector', () => {
    const clean = new KVectorChain(new KVector(0, 0), new KVector(1, 1));
    expect(clean.hasNaN()).toBe(false);
    expect(clean.hasInfinite()).toBe(false);
    expect(new KVectorChain(new KVector(0, 0), new KVector(NaN, 1)).hasNaN()).toBe(true);
    expect(new KVectorChain(new KVector(0, 0), new KVector(1, Infinity)).hasInfinite()).toBe(true);
  });
});

describe('KVectorChain pointOnLine', () => {
  it('interpolates inside a segment', () => {
    // (0,0)->(3,4): length 5, relative = 2.5 / 5 = 0.5; (3,4) * 0.5 + (0,0) = (1.5,2)
    const chain = new KVectorChain(new KVector(0, 0), new KVector(3, 4));
    expect(chain.pointOnLine(2.5).toString()).toBe('(1.5,2.0)');
    expect(chain.totalLength()).toBe(5);
  });

  it('stays on the last point beyond the chain length', () => {
    const chain = new KVectorChain(new KVector(0, 0), new KVector(10, 0));
    expect(chain.pointOnLine(100).toString()).toBe('(10.0,0.0)');
  });

  it('skips zero-length segments', () => {
    // #0 = #1 = (0,0): first segment skipped; (0,0)->(4,0), relative 2/4 = 0.5 -> (2,0)
    const chain = new KVectorChain(new KVector(0, 0), new KVector(0, 0), new KVector(4, 0));
    expect(chain.pointOnLine(2).toString()).toBe('(2.0,0.0)');
  });

  it('negative distances start at listIterator(size - 1).previous(): the second-to-last point', () => {
    // Java quirk kept as is: the reverse traversal begins at index size - 2, so the last segment is
    // never measured. Chain (0,0),(10,0),(10,10): current = (10,0), next = (0,0), length 10,
    // relative 2/10 = 0.2, (0,0)-(10,0) = (-10,0), *0.2 = (-2,0), +(10,0) = (8,0).
    const chain = new KVectorChain(new KVector(0, 0), new KVector(10, 0), new KVector(10, 10));
    expect(chain.pointOnLine(-2).toString()).toBe('(8.0,0.0)');
    // beyond the traversed length the loop ends at index 0 and returns iter.next() = the first point
    expect(chain.pointOnLine(-100).toString()).toBe('(0.0,0.0)');
  });

  it('negative distances skip zero-length segments', () => {
    // A(0,0) B(4,0) C(4,0) D(9,9): current = C, next = B (length 0, skipped), then current = B,
    // next = A (length 4), relative 1/4 = 0.25, A-B = (-4,0), *0.25 = (-1,0), +B = (3,0)
    const chain = new KVectorChain(new KVector(0, 0), new KVector(4, 0), new KVector(4, 0), new KVector(9, 9));
    expect(chain.pointOnLine(-1).toString()).toBe('(3.0,0.0)');
  });

  it('negative distances on a two-point chain run off the iterator', () => {
    // listIterator(1).previous() yields #0, the second previous() has nothing left
    const chain = new KVectorChain(new KVector(0, 0), new KVector(10, 0));
    expect(() => chain.pointOnLine(-2)).toThrow(NoSuchElementException);
  });

  it('returns the only point of a one-point chain and rejects an empty chain', () => {
    const only = new KVector(7, 8);
    expect(new KVectorChain(only).pointOnLine(5)).toBe(only);
    expect(() => new KVectorChain().pointOnLine(1)).toThrow(
      new IllegalStateException('Cannot determine a point on an empty vector chain.'),
    );
  });
});

describe('KVectorChain angleOnLine', () => {
  const corner = (): KVectorChain => new KVectorChain(new KVector(0, 0), new KVector(0, 5), new KVector(5, 5));

  it('returns the angle of the segment containing the distance', () => {
    // dist 1 hits (0,0)->(0,5): direction (0,5), asin(5/5) = pi/2
    expect(corner().angleOnLine(1)).toBe(Math.PI / 2);
    // dist 7: first segment sums to 5 < 7, second (0,5)->(5,5): direction (5,0) -> 0
    expect(corner().angleOnLine(7)).toBe(0);
    // dist beyond the chain ends on the last segment
    expect(corner().angleOnLine(100)).toBe(0);
  });

  it('skips zero-length segments', () => {
    const chain = new KVectorChain(new KVector(0, 0), new KVector(0, 0), new KVector(3, 0));
    expect(chain.angleOnLine(1)).toBe(0);
  });

  it('negative distances traverse from index size - 2 backwards (Java quirk kept)', () => {
    // corner: nextPoint = #1 (0,5), then #0 (0,0): (0,0)-(0,5) = (0,-5), 4th quadrant: 2 pi + asin(-1)
    assertEquals((3 * Math.PI) / 2, corner().angleOnLine(-1), 1e-15);
    assertEquals((3 * Math.PI) / 2, corner().angleOnLine(-100), 1e-15);
    // (0,0),(5,0),(9,9): #1 (5,0), #0 (0,0): (0,0)-(5,0) = (-5,0): pi - asin(0) = pi
    const flat = new KVectorChain(new KVector(0, 0), new KVector(5, 0), new KVector(9, 9));
    expect(flat.angleOnLine(-1)).toBe(Math.PI);
  });

  it('negative distances skip zero-length segments', () => {
    // (0,0),(2,0),(2,0),(9,9): #2 -> #1 has length 0, then #1 -> #0: (0,0)-(2,0) = (-2,0) -> pi
    const chain = new KVectorChain(new KVector(0, 0), new KVector(2, 0), new KVector(2, 0), new KVector(9, 9));
    expect(chain.angleOnLine(-1)).toBe(Math.PI);
  });

  it('negative distances on a two-point chain run off the iterator', () => {
    const chain = new KVectorChain(new KVector(0, 0), new KVector(3, 0));
    expect(() => chain.angleOnLine(-1)).toThrow(NoSuchElementException);
  });

  it('needs two points', () => {
    expect(() => new KVectorChain(new KVector(1, 1)).angleOnLine(0)).toThrow(
      new IllegalStateException('Need at least two points to determine an angle.'),
    );
  });
});

describe('KVectorChain.reverse', () => {
  it('returns copies in reverse order', () => {
    const a = new KVector(1, 2);
    const chain = new KVectorChain(a, new KVector(3, 4), new KVector(5, 6));
    const reversed = KVectorChain.reverse(chain);
    expect(coordinates(reversed)).toEqual([
      [5, 6],
      [3, 4],
      [1, 2],
    ]);
    expect(reversed.get(2)).not.toBe(a);
    a.x = 100;
    expect(reversed.get(2).x).toBe(1);
    expect(chain.get(0)).toBe(a);
  });
});
