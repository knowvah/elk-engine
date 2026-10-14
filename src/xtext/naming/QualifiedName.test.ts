// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { hashCode as stringHashCode } from '../../java/lang/JavaString.js';
import { QualifiedName } from './QualifiedName.js';

const SEGMENT_NULL_MESSAGE = 'Segment cannot be null';

describe('QualifiedName.create', () => {
  it('returns EMPTY for no segments and for a null or empty list', () => {
    expect(QualifiedName.create()).toBe(QualifiedName.EMPTY);
    expect(QualifiedName.createFromList(null)).toBe(QualifiedName.EMPTY);
    expect(QualifiedName.createFromList([])).toBe(QualifiedName.EMPTY);
  });

  it('creates single and multi segment names', () => {
    expect(QualifiedName.create('a').getSegments()).toEqual(['a']);
    expect(QualifiedName.create('a', 'b').getSegments()).toEqual(['a', 'b']);
    expect(QualifiedName.createFromList(['a']).getSegments()).toEqual(['a']);
    expect(QualifiedName.createFromList(['a', 'b', 'c']).getSegments()).toEqual(['a', 'b', 'c']);
  });

  it('rejects a null segment in every factory with the source message', () => {
    expect(() => QualifiedName.create(null)).toThrow(new IllegalArgumentException(SEGMENT_NULL_MESSAGE));
    expect(() => QualifiedName.create('a', null)).toThrow(SEGMENT_NULL_MESSAGE);
    expect(() => QualifiedName.createFromList([null])).toThrow(SEGMENT_NULL_MESSAGE);
    expect(() => QualifiedName.createFromList(['a', null])).toThrow(SEGMENT_NULL_MESSAGE);
    expect(() => QualifiedName.create(null)).toThrow(IllegalArgumentException);
  });

  it('does not alias the caller array', () => {
    const list = ['a', 'b'];
    const name = QualifiedName.createFromList(list);
    list[0] = 'x';
    expect(name.toString()).toBe('a.b');
  });
});

describe('QualifiedName accessors', () => {
  const name = QualifiedName.create('a', 'b', 'c');

  it('reports segments', () => {
    expect(name.getSegmentCount()).toBe(3);
    expect(name.getFirstSegment()).toBe('a');
    expect(name.getLastSegment()).toBe('c');
    expect(name.getSegment(1)).toBe('b');
    expect(name.isEmpty()).toBe(false);
    expect(QualifiedName.EMPTY.isEmpty()).toBe(true);
    expect(QualifiedName.EMPTY.getSegmentCount()).toBe(0);
  });

  it('throws ArrayIndexOutOfBounds outside the segments', () => {
    expect(() => name.getSegment(3)).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => name.getSegment(-1)).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => QualifiedName.EMPTY.getFirstSegment()).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => QualifiedName.EMPTY.getLastSegment()).toThrow(ArrayIndexOutOfBoundsException);
  });

  it('getSegments is a snapshot that cannot change the name', () => {
    const segments = name.getSegments() as string[];
    expect(Object.isFrozen(segments)).toBe(true);
    expect(name.toString()).toBe('a.b.c');
  });
});

describe('QualifiedName append', () => {
  it('appends a segment', () => {
    expect(QualifiedName.create('a', 'b').append('c').toString('.')).toBe('a.b.c');
    expect(QualifiedName.EMPTY.append('x')).toEqual(QualifiedName.create('x'));
  });

  it('rejects a null segment', () => {
    expect(() => QualifiedName.create('a').append(null as unknown as string)).toThrow(SEGMENT_NULL_MESSAGE);
  });

  it('appends a name; EMPTY returns the argument itself', () => {
    const rel = QualifiedName.create('c', 'd');
    expect(QualifiedName.create('a', 'b').append(rel).toString()).toBe('a.b.c.d');
    expect(QualifiedName.EMPTY.append(rel)).toBe(rel);
    expect(rel.append(QualifiedName.EMPTY).toString()).toBe('c.d');
  });
});

describe('QualifiedName skip', () => {
  const name = QualifiedName.create('a', 'b', 'c');

  it('skipFirst', () => {
    expect(name.skipFirst(0)).toBe(name);
    expect(name.skipFirst(1).toString()).toBe('b.c');
    expect(name.skipFirst(3)).toBe(QualifiedName.EMPTY);
  });

  it('skipLast', () => {
    expect(name.skipLast(0)).toBe(name);
    expect(name.skipLast(2).toString()).toBe('a');
    expect(name.skipLast(3)).toBe(QualifiedName.EMPTY);
  });

  it('throws with the source message for out-of-range counts', () => {
    const message = 'Cannot skip 4 fragments from QualifiedName with 3 segments';
    expect(() => name.skipFirst(4)).toThrow(new IllegalArgumentException(message));
    expect(() => name.skipLast(4)).toThrow(message);
    expect(() => name.skipFirst(-1)).toThrow('Cannot skip -1 fragments from QualifiedName with 3 segments');
    expect(() => name.skipLast(-2)).toThrow(IllegalArgumentException);
  });
});

describe('QualifiedName case folding', () => {
  it('toLowerCase equals the lower-case name with an equal hash', () => {
    const lower = QualifiedName.create('A', 'b').toLowerCase();
    expect(lower.equals(QualifiedName.create('a', 'b'))).toBe(true);
    expect(lower.hashCode()).toBe(QualifiedName.create('a', 'b').hashCode());
    expect(lower.toString()).toBe('a.b');
  });

  it('toLowerCase is cached and idempotent', () => {
    const name = QualifiedName.create('A', 'b');
    expect(name.toLowerCase()).toBe(name.toLowerCase());
    expect(name.toLowerCase().toLowerCase()).toBe(name.toLowerCase());
  });

  it('a name that is already lower case is its own lower case', () => {
    const name = QualifiedName.create('a', 'b');
    expect(name.toLowerCase()).toBe(name);
  });

  it('EMPTY is its own folding', () => {
    expect(QualifiedName.EMPTY.toLowerCase()).toBe(QualifiedName.EMPTY);
    expect(QualifiedName.EMPTY.toUpperCase()).toBe(QualifiedName.EMPTY);
  });

  it('toUpperCase upper-cases every segment', () => {
    const upper = QualifiedName.create('a', 'bc').toUpperCase();
    expect(upper.toString()).toBe('A.BC');
    expect(upper.toLowerCase().toString()).toBe('a.bc');
  });

  it('toUpperCase carries the cached lower case over', () => {
    const name = QualifiedName.create('Ab');
    const lower = name.toLowerCase();
    expect(name.toUpperCase().toLowerCase()).toBe(lower);
  });
});

describe('QualifiedName equals and hashCode', () => {
  it('equal segments give equal names and hashes', () => {
    const a = QualifiedName.create('a', 'b');
    const b = QualifiedName.createFromList(['a', 'b']);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(a)).toBe(true);
    expect(a.hashCode()).toBe(b.hashCode());
  });

  it('hash is Arrays.hashCode over the segment hashes', () => {
    const expected = (31 * (31 * 1 + stringHashCode('a')) + stringHashCode('b')) | 0;
    expect(QualifiedName.create('a', 'b').hashCode()).toBe(expected);
    expect(QualifiedName.EMPTY.hashCode()).toBe(1);
  });

  it('differs on content, length and foreign objects', () => {
    const a = QualifiedName.create('a', 'b');
    expect(a.equals(QualifiedName.create('a', 'c'))).toBe(false);
    expect(a.equals(QualifiedName.create('a'))).toBe(false);
    expect(a.equals('a.b')).toBe(false);
    expect(a.equals(null)).toBe(false);
  });

  it('a hash collision with different segments is not equal', () => {
    // "Aa" and "BB" have the same String.hashCode
    expect(stringHashCode('Aa')).toBe(stringHashCode('BB'));
    expect(QualifiedName.create('Aa').equals(QualifiedName.create('BB'))).toBe(false);
  });
});

describe('QualifiedName equalsIgnoreCase', () => {
  it('compares segments ignoring case', () => {
    const a = QualifiedName.create('Ab', 'C');
    expect(a.equalsIgnoreCase(QualifiedName.create('aB', 'c'))).toBe(true);
    expect(a.equalsIgnoreCase(a)).toBe(true);
    expect(a.equalsIgnoreCase(QualifiedName.create('ab'))).toBe(false);
    expect(a.equalsIgnoreCase(QualifiedName.create('ab', 'd'))).toBe(false);
    expect(a.equalsIgnoreCase('Ab.C')).toBe(false);
  });

  it('uses the lower-case form when both sides have one', () => {
    const a = QualifiedName.create('Ab');
    const b = QualifiedName.create('aB');
    a.toLowerCase();
    b.toLowerCase();
    expect(a.equalsIgnoreCase(b)).toBe(true);
    expect(a.equalsIgnoreCase(QualifiedName.create('ac').toLowerCase())).toBe(false);
  });

  it('compares per char: sharp s does not fold to SS', () => {
    expect(QualifiedName.create('ß').equalsIgnoreCase(QualifiedName.create('SS'))).toBe(false);
  });
});

describe('QualifiedName compareTo', () => {
  it('orders by segments then by count', () => {
    const ab = QualifiedName.create('a', 'b');
    expect(ab.compareTo(QualifiedName.create('a', 'b'))).toBe(0);
    expect(ab.compareTo(QualifiedName.create('a', 'c'))).toBe(-1);
    expect(ab.compareTo(QualifiedName.create('a'))).toBe(1);
    expect(QualifiedName.create('a').compareTo(ab)).toBe(-1);
    expect(QualifiedName.create('B').compareTo(QualifiedName.create('a'))).toBe(-31);
  });

  it('compareToIgnoreCase folds per character', () => {
    expect(QualifiedName.create('B').compareToIgnoreCase(QualifiedName.create('a'))).toBe(1);
    expect(QualifiedName.create('A', 'x').compareToIgnoreCase(QualifiedName.create('a', 'X'))).toBe(0);
    expect(QualifiedName.create('a').compareToIgnoreCase(QualifiedName.create('a', 'b'))).toBe(-1);
    expect(QualifiedName.create('ab').compareToIgnoreCase(QualifiedName.create('a'))).toBe(0 + 1);
  });
});

describe('QualifiedName startsWith', () => {
  const name = QualifiedName.create('a', 'b', 'c');

  it('matches a prefix', () => {
    expect(name.startsWith(QualifiedName.create('a', 'b'))).toBe(true);
    expect(name.startsWith(QualifiedName.EMPTY)).toBe(true);
    expect(name.startsWith(name)).toBe(true);
    expect(name.startsWith(QualifiedName.create('a', 'c'))).toBe(false);
  });

  it('a longer prefix is false', () => {
    expect(name.startsWith(QualifiedName.create('a', 'b', 'c', 'd'))).toBe(false);
    expect(name.startsWithIgnoreCase(QualifiedName.create('a', 'b', 'c', 'd'))).toBe(false);
  });

  it('startsWithIgnoreCase folds case', () => {
    expect(name.startsWithIgnoreCase(QualifiedName.create('A', 'B'))).toBe(true);
    expect(name.startsWith(QualifiedName.create('A', 'B'))).toBe(false);
    expect(name.startsWithIgnoreCase(QualifiedName.create('A', 'X'))).toBe(false);
  });

  it('rejects a null prefix', () => {
    expect(() => name.startsWith(null as unknown as QualifiedName)).toThrow(
      new IllegalArgumentException('prefix must not be null'),
    );
  });
});

describe('QualifiedName toString', () => {
  it('joins with the delimiter', () => {
    expect(QualifiedName.EMPTY.toString()).toBe('');
    expect(QualifiedName.create('a').toString('::')).toBe('a');
    expect(QualifiedName.create('a', 'b', 'c').toString('::')).toBe('a::b::c');
    expect(QualifiedName.create('a', 'b').toString()).toBe('a.b');
    expect(`${QualifiedName.create('a', 'b')}`).toBe('a.b');
  });

  it('a null delimiter prints as the text null', () => {
    expect(QualifiedName.create('a', 'b').toString(null)).toBe('anullb');
  });

  it('EMPTY ignores the delimiter', () => {
    expect(QualifiedName.EMPTY.toString('::')).toBe('');
  });
});

describe('QualifiedName.wrapper', () => {
  it('wraps a name function; null stays null', () => {
    const wrap = QualifiedName.wrapper((s: string | null) => s);
    expect(wrap('x')).toEqual(QualifiedName.create('x'));
    expect(wrap(null)).toBeNull();
  });
});
