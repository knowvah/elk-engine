// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { ElkMargin } from '../../core/math/ElkMargin.js';
import { ElkPadding } from '../../core/math/ElkPadding.js';
import { KVector } from '../../core/math/KVector.js';
import { KVectorChain } from '../../core/math/KVectorChain.js';
import { PortSide } from '../../core/options/PortSide.js';
import { SizeConstraint } from '../../core/options/SizeConstraint.js';
import type { Comparable } from '../../java/lang/Comparable.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import { ElkReflect } from '../util/ElkReflect.js';
import type { IProperty } from './IProperty.js';
import { Property, compareStrings, isIProperty } from './Property.js';

function hasEquals(a: unknown): a is { equals(o: unknown): boolean } {
  return typeof a === 'object' && a !== null && 'equals' in a && typeof a.equals === 'function';
}

function setsEqual(a: Set<unknown>, b: Set<unknown>): boolean {
  return a.size === b.size && [...a].every((x) => [...b].some((y) => javaEquals(x, y)));
}

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((x, i) => javaEquals(x, b[i]));
}

/** Java `Object.equals` for the value kinds `PropertyTest` uses (value equality, element-wise for collections). */
function javaEquals(a: unknown, b: unknown): boolean {
  if (hasEquals(a)) {
    return a.equals(b);
  }
  if (a instanceof Set && b instanceof Set) {
    return setsEqual(a, b);
  }
  if (a instanceof LinkedList && b instanceof LinkedList) {
    return arraysEqual([...a], [...b]);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return arraysEqual(a, b);
  }
  return a === b;
}

/** Ported from org.eclipse.elk.core.test PropertyTest.java (assertions unchanged). */
describe('PropertyTest (ported JUnit)', () => {
  beforeAll(() => {
    // Temporary seam: Java's `LayoutMetaDataService.getInstance()` (the JUnit @BeforeClass) registers these
    // in `initElkReflect`; that class is ported in a later mission, so the registrations are mirrored here.
    // `Array` stands for ArrayList and `Set` for HashSet, LinkedHashSet and TreeSet (AD-10). The Java
    // `IndividualSpacings` registration is omitted: that class is not ported yet.
    ElkReflect.register(
      KVector,
      () => new KVector(),
      (v) => (v as KVector).clone(),
    );
    ElkReflect.register(
      KVectorChain,
      () => new KVectorChain(),
      (vc) => new KVectorChain(vc as KVectorChain),
    );
    ElkReflect.register(
      ElkMargin,
      () => new ElkMargin(),
      (m) => new ElkMargin(m as ElkMargin),
    );
    ElkReflect.register(
      ElkPadding,
      () => new ElkPadding(),
      (p) => new ElkPadding(p as ElkPadding),
    );
    ElkReflect.register(
      Array,
      () => [],
      (al) => [...(al as unknown[])],
    );
    ElkReflect.register(
      LinkedList,
      () => new LinkedList(),
      (ll) => new LinkedList(ll as LinkedList<unknown>),
    );
    ElkReflect.register(
      Set,
      () => new Set(),
      (hs) => new Set(hs as Set<unknown>),
    );
  });

  function testPropertyObject<T extends object>(defaultValue: T): void {
    const name = defaultValue.constructor.name;
    const p: IProperty<T> = new Property<T>(`dummy${name}`, defaultValue);
    const copy = p.getDefault();
    expect(defaultValue !== copy, `Default value is not a copy: ${name}`).toBe(true);
    expect(javaEquals(defaultValue, copy), `Copied value is not equal: ${name}`).toBe(true);
  }

  function testPropertyPrimitive<T>(defaultValue: T): void {
    const name = typeof defaultValue === 'object' ? (defaultValue as object).constructor.name : typeof defaultValue;
    const p: IProperty<T> = new Property<T>(`dummy${name}`, defaultValue);
    const copy = p.getDefault();
    expect(defaultValue === copy, `Copied value is not equal: ${name}`).toBe(true);
    expect(javaEquals(defaultValue, copy), `Copied value is not equal: ${name}`).toBe(true);
  }

  it('testPropertyDefaultPrimitive', () => {
    const i = 43;
    testPropertyPrimitive(i);

    const f = Math.fround(23.3);
    testPropertyPrimitive(f);

    const d = 32.3;
    testPropertyPrimitive(d);

    const s = 'foo';
    testPropertyPrimitive(s);
  });

  it('testPropertyDefaultIDataObject', () => {
    // all IDataObjects
    const v = new KVector(2, 3);
    testPropertyObject(v);

    const vc = new KVectorChain(v, v);
    testPropertyObject(vc);

    const ep = new ElkPadding(2, 3);
    testPropertyObject(ep);

    const em = new ElkMargin(3, 2);
    testPropertyObject(em);
  });

  it('testPropertyDefaultObject', () => {
    const v = new KVector(3, 2);

    const al = [v, v.normalize(), v.negate()];
    testPropertyObject(al);

    const ll = new LinkedList(al);
    testPropertyObject(ll);

    const hs = new Set([v, v.normalize(), v.negate()]);
    testPropertyObject(hs);

    const lhs = new Set(al);
    testPropertyObject(lhs);

    const ts = new Set([1, 2, 3, 4]);
    testPropertyObject(ts);
  });

  it('testPropertyDefaultEnum', () => {
    const ps = PortSide.EAST;
    testPropertyPrimitive(ps);
  });

  it('testPropertyDefaultEnumSet', () => {
    const sc = EnumSet.allOf(SizeConstraint);
    testPropertyObject(sc);
  });

  it('testUnknownPropertyGetDefault', () => {
    // `Cloneable o = new Cloneable() { }` has no registered clone function
    const o = {
      clone(): void {},
    };
    const p: IProperty<object> = new Property<object>('o', o);
    expect(() => p.getDefault()).toThrow(IllegalStateException);
    expect(() => p.getDefault()).toThrow(
      "Couldn't clone property 'o'. Make sure its type is registered with the ElkReflect utility class.",
    );
  });
});

describe('Property', () => {
  describe('construction', () => {
    it('has null as default value and infinite bounds when only an id is given', () => {
      const p = new Property<number>('a.b');
      expect(p.getId()).toBe('a.b');
      expect(p.getDefault()).toBeNull();
      expect(p.getLowerBound()).toBe(Property.NEGATIVE_INFINITY);
      expect(p.getUpperBound()).toBe(Property.POSITIVE_INFINITY);
    });

    it('stores the default value', () => {
      expect(new Property<number>('a', 0).getDefault()).toBe(0);
      expect(new Property<string>('a', 'x').getDefault()).toBe('x');
    });

    it('takes the lower bound and keeps the default upper bound', () => {
      const lower: Comparable<number> = { compareTo: (o) => 1 - o };
      const p = new Property<number>('a', 1, lower);
      expect(p.getLowerBound()).toBe(lower);
      expect(p.getUpperBound()).toBe(Property.POSITIVE_INFINITY);
    });

    it('keeps the default lower bound for a null lower bound', () => {
      const upper: Comparable<number> = { compareTo: (o) => 9 - o };
      const p = new Property<number>('a', 1, null, upper);
      expect(p.getLowerBound()).toBe(Property.NEGATIVE_INFINITY);
      expect(p.getUpperBound()).toBe(upper);
    });

    it('takes both bounds, and keeps the default upper bound for a null upper bound', () => {
      const lower: Comparable<number> = { compareTo: (o) => 1 - o };
      const upper: Comparable<number> = { compareTo: (o) => 9 - o };
      const both = new Property<number>('a', 1, lower, upper);
      expect(both.getLowerBound()).toBe(lower);
      expect(both.getUpperBound()).toBe(upper);
      const noUpper = new Property<number>('a', 1, lower, null);
      expect(noUpper.getUpperBound()).toBe(Property.POSITIVE_INFINITY);
    });

    it('withDefault reuses the identifier of another property with a new default value', () => {
      const other = new Property<number>('x.y', 1);
      const changed = Property.withDefault(other, 5);
      expect(changed.getId()).toBe('x.y');
      expect(changed.getDefault()).toBe(5);
      expect(other.getDefault()).toBe(1);
    });
  });

  describe('infinity bounds', () => {
    it('NEGATIVE_INFINITY is smaller than everything', () => {
      expect(Property.NEGATIVE_INFINITY.compareTo(0)).toBe(-1);
      expect(Property.NEGATIVE_INFINITY.compareTo(Property.NEGATIVE_INFINITY)).toBe(-1);
      expect(Property.NEGATIVE_INFINITY.compareTo(null)).toBe(-1);
      expect(Property.NEGATIVE_INFINITY.toString()).toBe('-∞');
    });

    it('POSITIVE_INFINITY is greater than everything', () => {
      expect(Property.POSITIVE_INFINITY.compareTo(0)).toBe(1);
      expect(Property.POSITIVE_INFINITY.compareTo(Property.POSITIVE_INFINITY)).toBe(1);
      expect(Property.POSITIVE_INFINITY.compareTo('x')).toBe(1);
      expect(Property.POSITIVE_INFINITY.toString()).toBe('+∞');
    });
  });

  describe('identity by id', () => {
    it('equals any IProperty with the same id', () => {
      const p = new Property<number>('same.id', 1);
      const other = new Property<string>('same.id', 'x');
      const foreign: IProperty<number> = {
        getDefault: () => 0,
        getId: () => 'same.id',
        getLowerBound: () => Property.NEGATIVE_INFINITY,
        getUpperBound: () => Property.POSITIVE_INFINITY,
      };
      expect(p.equals(other)).toBe(true);
      expect(p.equals(foreign)).toBe(true);
      expect(p.equals(new Property<number>('other.id', 1))).toBe(false);
    });

    it('does not equal anything that is not an IProperty', () => {
      const p = new Property<number>('same.id');
      expect(p.equals('same.id')).toBe(false);
      expect(p.equals(null)).toBe(false);
      expect(p.equals({ getId: 3 })).toBe(false);
    });

    it('hashes like String.hashCode of the id', () => {
      expect(new Property<number>('abc').hashCode()).toBe(96354);
      expect(new Property<number>('').hashCode()).toBe(0);
    });

    it('prints its id', () => {
      expect(new Property<number>('a.b.c').toString()).toBe('a.b.c');
    });
  });

  describe('compareTo', () => {
    const compare = (a: string, b: string): number => new Property<number>(a).compareTo(new Property<string>(b));

    it('is the difference of the first differing code units', () => {
      expect(compare('a', 'c')).toBe(-2);
      expect(compare('b', 'a')).toBe(1);
      expect(compare('xay', 'xcy')).toBe(-2);
    });

    it('is the length difference when one id is a prefix of the other', () => {
      expect(compare('ab', 'abcd')).toBe(-2);
      expect(compare('abcd', 'ab')).toBe(2);
      expect(compare('', 'abc')).toBe(-3);
    });

    it('is 0 for equal ids', () => {
      expect(compare('same', 'same')).toBe(0);
    });

    it('compares UTF-16 code units, not code points', () => {
      // U+FF5E (BMP) versus U+1F600 (surrogate pair, first unit 0xD83D)
      expect(compare('～', '\u{1f600}')).toBe(0xff5e - 0xd83d);
    });
  });

  describe('compareStrings', () => {
    it('follows String.compareTo', () => {
      expect(compareStrings('a', 'c')).toBe(-2);
      expect(compareStrings('abcd', 'ab')).toBe(2);
      expect(compareStrings('z', 'z')).toBe(0);
    });
  });

  describe('getDefault', () => {
    it('returns the same non-cloneable value every time', () => {
      const value = { n: 1 };
      const p = new Property<object>('o', value);
      expect(p.getDefault()).toBe(value);
    });

    it('returns a fresh clone of a cloneable value every time', () => {
      const value = EnumSet.allOf(SizeConstraint);
      const p = new Property<EnumSet<SizeConstraint>>('set', value);
      const first = p.getDefault();
      first.clear();
      const second = p.getDefault();
      expect(second).not.toBe(first);
      expect(second.equals(value)).toBe(true);
      expect(value.size()).toBe(SizeConstraint.values().length);
    });
  });

  describe('isIProperty', () => {
    it('accepts an object with a getId function', () => {
      expect(isIProperty({ getId: () => 'x' })).toBe(true);
      expect(isIProperty(new Property<number>('x'))).toBe(true);
    });

    it('rejects everything else', () => {
      expect(isIProperty(null)).toBe(false);
      expect(isIProperty(undefined)).toBe(false);
      expect(isIProperty('getId')).toBe(false);
      expect(isIProperty({})).toBe(false);
      expect(isIProperty({ getId: 'x' })).toBe(false);
    });
  });
});
