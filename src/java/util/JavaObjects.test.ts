// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { TEdge } from '../../alg/common/TEdge.js';
import { TTriangle } from '../../alg/common/TTriangle.js';
import { KVector } from '../../core/math/KVector.js';
import { decodeHex, loadSporeRows, type ObjectsRow, type ObjectSpec } from '../../../test/helpers/spore-replay-rows.js';
import { identityHashCode } from '../lang/IdentityHashCode.js';
import * as JavaObjects from './JavaObjects.js';

class Valued {
  constructor(private readonly v: number) {}
  equals(o: unknown): boolean {
    return o instanceof Valued && o.v === this.v;
  }
  hashCode(): number {
    return this.v * 31;
  }
}

describe('JavaObjects.equals', () => {
  it('equates null only with null', () => {
    expect(JavaObjects.equals(null, null)).toBe(true);
    expect(JavaObjects.equals(null, 'a')).toBe(false);
    expect(JavaObjects.equals('a', null)).toBe(false);
  });

  it('uses value equals when defined and identity otherwise', () => {
    expect(JavaObjects.equals(new Valued(2), new Valued(2))).toBe(true);
    expect(JavaObjects.equals(new Valued(2), new Valued(3))).toBe(false);
    expect(JavaObjects.equals({}, {})).toBe(false);
    const o = {};
    expect(JavaObjects.equals(o, o)).toBe(true);
  });

  it('equates an object with itself even when its equals is not reflexive (T13: spore NaN hitbox centres)', () => {
    class NeverEqual {
      equals(): boolean {
        return false;
      }
    }
    const o = new NeverEqual();
    expect(JavaObjects.equals(o, o)).toBe(true);
    expect(JavaObjects.equals(o, new NeverEqual())).toBe(false);
  });

  it('follows Double.equals for NaN and signed zero', () => {
    expect(JavaObjects.equals(Number.NaN, Number.NaN)).toBe(true);
    expect(JavaObjects.equals(0, -0)).toBe(false);
  });
});

describe('JavaObjects.hashCode', () => {
  it('hashes null as 0 and strings, booleans as Java does', () => {
    expect(JavaObjects.hashCode(null)).toBe(0);
    expect(JavaObjects.hashCode('ab')).toBe(3105);
    expect(JavaObjects.hashCode(true)).toBe(1231);
    expect(JavaObjects.hashCode(false)).toBe(1237);
  });

  it('hashes int32 numbers as Integer and others as Double', () => {
    expect(JavaObjects.hashCode(7)).toBe(7);
    expect(JavaObjects.hashCode(1.0)).toBe(1);
    expect(JavaObjects.hashCode(1.5)).toBe(1073217536);
  });

  it('uses the object hashCode or the identity hash', () => {
    expect(JavaObjects.hashCode(new Valued(2))).toBe(62);
    const o = {};
    expect(JavaObjects.hashCode(o)).toBe(identityHashCode(o));
  });
});

describe('JavaObjects.toString', () => {
  it('renders null, Integer and Double texts', () => {
    expect(JavaObjects.toString(null)).toBe('null');
    expect(JavaObjects.toString(3)).toBe('3');
    expect(JavaObjects.toString(1.5)).toBe('1.5');
    expect(JavaObjects.toString(1e10)).toBe('1.0E10');
    expect(JavaObjects.toString('x')).toBe('x');
    expect(JavaObjects.toString(true)).toBe('true');
  });
});

describe('JavaObjects.equals: the JVM `objects` rows of the spore ref (T13b)', () => {
  const rows = loadSporeRows('objects');

  /** Builds each named operand once: a name is one object, so two args naming it are the same object. */
  function build(specs: Readonly<Record<string, ObjectSpec>>): Map<string, unknown> {
    const made = new Map<string, unknown>();
    const make = (name: string): unknown => {
      if (!made.has(name)) {
        made.set(name, instantiate(specs[name]!, make));
      }
      return made.get(name);
    };
    for (const name of Object.keys(specs)) {
      make(name);
    }
    return made;
  }

  function instantiate(spec: ObjectSpec, make: (name: string) => unknown): unknown {
    switch (spec.type) {
      case 'KVector':
        return new KVector(decodeHex(spec.x), decodeHex(spec.y));
      case 'Double':
        return decodeHex(spec.bits);
      case 'TEdge':
        return new TEdge(make(spec.u) as KVector, make(spec.v) as KVector);
      case 'TTriangle':
        return new TTriangle(make(spec.a) as KVector, make(spec.b) as KVector, make(spec.c) as KVector);
    }
  }

  function portResult(row: ObjectsRow): boolean {
    const made = build(row.input.objects);
    const [a, b] = row.input.args.map((name) => (name === null ? null : made.get(name)));
    switch (row.input.call) {
      case 'Objects.equals':
        return JavaObjects.equals(a, b);
      case 'equals':
        // Double.equals (a primitive here) is Object.is on the shim, as JavaObjects.equals documents
        return typeof a === 'number' ? Object.is(a, b) : (a as KVector | TEdge).equals(b);
      case 'TTriangle.contains':
        return (a as TTriangle).contains(b as KVector);
    }
  }

  it('the ref has 63 objects rows covering the four calls of the recorder', () => {
    expect(rows).toHaveLength(63);
    expect(new Set(rows.map((row) => row.input.call))).toEqual(
      new Set(['Objects.equals', 'equals', 'TTriangle.contains']),
    );
  });

  it.each(rows.map((row) => row.id))('%s: the port returns what the JVM returned', (id) => {
    const row = rows.find((r) => r.id === id)!;
    expect(portResult(row)).toBe(row.expected.result);
  });
});
