// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { Property } from '../../graph/properties/Property.js';
import { ElkReflect } from '../../graph/util/ElkReflect.js';
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { JavaClass, javaInterface, type JavaClassRef } from '../../java/lang/JavaClass.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { KVector } from '../math/KVector.js';
import { Direction } from '../options/Direction.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import { ExclusiveBounds } from '../util/ExclusiveBounds.js';
import { LayoutOptionData } from './LayoutOptionData.js';
import type { LayoutOptionDataType } from './LayoutOptionDataType.js';

const { Type, Target, Visibility } = LayoutOptionData;

class Unregistered {
  clone(): Unregistered {
    return new Unregistered();
  }
}

class Parsable {
  parse(_s: string): void {}
}

function option(type: LayoutOptionDataType, optionClass: JavaClassRef | null = null): LayoutOptionData {
  const builder = new LayoutOptionData.Builder().id('test.option').type(type);
  return builder.optionClass(optionClass).create();
}

beforeAll(() => {
  ElkReflect.registerNewInstance(KVector, () => new KVector());
  ElkReflect.registerClone(KVector, (v) => (v as KVector).clone());
});

describe('nested types', () => {
  it('re-exposes the type, target and visibility enums', () => {
    expect(Type.valueOf('ENUMSET').ordinal()).toBe(6);
    expect(Target.values()).toHaveLength(5);
    expect(Visibility.HIDDEN.name()).toBe('HIDDEN');
  });
});

describe('identity', () => {
  it('equals by id, against any property', () => {
    const a = option(Type.INT);
    const b = new LayoutOptionData.Builder().id('test.option').create();
    expect(a.equals(b)).toBe(true);
    expect(a.equals(new Property('test.option'))).toBe(true);
    expect(a.equals(new Property('other'))).toBe(false);
    expect(a.equals('test.option')).toBe(false);
    expect(a.hashCode()).toBe(b.hashCode());
  });

  it('orders by id and prints', () => {
    const a = new LayoutOptionData.Builder().id('a').create();
    const b = new LayoutOptionData.Builder().id('b').create();
    expect(a.compareTo(b)).toBe(-1);
    expect(b.compareTo(new Property('a'))).toBe(1);
    expect(a.toString()).toBe('Layout Option: a');
    expect(new LayoutOptionData.Builder().create().getId()).toBe('');
  });

  it('defaults targets to the empty set and keeps no dependencies', () => {
    const a = option(Type.INT);
    expect(a.getTargets().isEmpty()).toBe(true);
    expect(a.getDependencies()).toEqual([]);
    expect(a.getVisibility()).toBeNull();
    expect(a.getLegacyIds()).toBeNull();
    expect(a.getName()).toBeNull();
    expect(a.getDescription()).toBeNull();
    expect(a.getGroup()).toBeNull();
  });
});

describe('canParseValue', () => {
  it('follows the type', () => {
    expect(option(Type.UNDEFINED).canParseValue()).toBe(false);
    expect(option(Type.INT).canParseValue()).toBe(true);
    expect(option(Type.OBJECT, KVector).canParseValue()).toBe(true);
    expect(option(Type.OBJECT, Unregistered).canParseValue()).toBe(false);
    expect(option(Type.OBJECT, null).canParseValue()).toBe(false);
    expect(option(Type.OBJECT, JavaClass.String).canParseValue()).toBe(false);
  });
});

describe('parseValue', () => {
  it('returns null for null text, "null" and forbidden empty text', () => {
    expect(option(Type.STRING).parseValue(null)).toBeNull();
    expect(option(Type.STRING).parseValue('null')).toBeNull();
    expect(option(Type.STRING).parseValue('')).toBeNull();
    expect(option(Type.INT).parseValue('')).toBeNull();
  });

  it('parses booleans case-insensitively', () => {
    const o = option(Type.BOOLEAN);
    expect(o.parseValue('TRUE')).toBe(true);
    expect(o.parseValue('False')).toBe(false);
    expect(o.parseValue('yes')).toBeNull();
  });

  it('parses integers and doubles, invalid text is null', () => {
    expect(option(Type.INT).parseValue('42')).toBe(42);
    expect(option(Type.INT).parseValue('1.0')).toBeNull();
    expect(option(Type.INT).parseValue('abc')).toBeNull();
    expect(option(Type.DOUBLE).parseValue('1.5')).toBe(1.5);
    expect(option(Type.DOUBLE).parseValue('x')).toBeNull();
  });

  it('returns strings unchanged', () => {
    expect(option(Type.STRING).parseValue('hello')).toBe('hello');
  });

  it('parses enum constants by name and by ordinal', () => {
    const o = option(Type.ENUM, Direction);
    expect(o.parseValue('DOWN')).toBe(Direction.DOWN);
    expect(o.parseValue('3')).toBe(Direction.DOWN);
    expect(o.parseValue('nonsense')).toBeNull();
    expect(o.parseValue('9')).toBeNull();
    expect(o.parseValue('-1')).toBeNull();
  });

  it('parses enum sets with every separator', () => {
    const o = option(Type.ENUMSET, SizeConstraint);
    const expected = EnumSet.of(SizeConstraint.PORTS, SizeConstraint.MINIMUM_SIZE);
    for (const text of [
      '[PORTS, MINIMUM_SIZE]',
      'PORTS,MINIMUM_SIZE',
      'PORTS MINIMUM_SIZE',
      ' [PORTS ,\tMINIMUM_SIZE]\n',
      '0 3',
    ]) {
      expect((o.parseValue(text) as EnumSet<SizeConstraint>).equals(expected)).toBe(true);
    }
    expect((o.parseValue('') as EnumSet<SizeConstraint>).isEmpty()).toBe(true);
    expect((o.parseValue('[]') as EnumSet<SizeConstraint>).isEmpty()).toBe(true);
    expect(o.parseValue('[PORTS, BOGUS]')).toBeNull();
  });

  it('parses data objects', () => {
    const value = option(Type.OBJECT, KVector).parseValue('(1,2)') as KVector;
    expect(value).toBeInstanceOf(KVector);
    expect([value.x, value.y]).toEqual([1, 2]);
    expect(option(Type.OBJECT, KVector).parseValue('garbage')).toBeNull();
  });

  it('fails on a bad option class or an unregistered data object', () => {
    expect(() => option(Type.ENUM, JavaClass.String).parseValue('A')).toThrow(
      'Enumeration class expected for layout option test.option',
    );
    expect(() => option(Type.ENUMSET, null).parseValue('A')).toThrow(IllegalStateException);
    expect(() => option(Type.OBJECT, JavaClass.Object).parseValue('A')).toThrow(
      'IDataType class expected for layout option test.option',
    );
    expect(() => option(Type.OBJECT, Parsable).parseValue('A')).toThrow(
      "Couldn't create new instance of property 'test.option'",
    );
    expect(() => option(Type.UNDEFINED).parseValue('A')).toThrow('Invalid type set for this layout option.');
    expect(() => new LayoutOptionData.Builder().create().parseValue('A')).toThrow(IllegalStateException);
  });
});

describe('getDefaultDefault', () => {
  it('follows every type', () => {
    expect(option(Type.STRING).getDefaultDefault()).toBe('');
    expect(option(Type.BOOLEAN).getDefaultDefault()).toBe(false);
    expect(option(Type.INT).getDefaultDefault()).toBe(0);
    expect(option(Type.DOUBLE).getDefaultDefault()).toBe(0);
    expect(option(Type.ENUM, Direction).getDefaultDefault()).toBe(Direction.UNDEFINED);
    expect((option(Type.ENUMSET, SizeConstraint).getDefaultDefault() as EnumSet<SizeConstraint>).isEmpty()).toBe(true);
    expect(option(Type.OBJECT, KVector).getDefaultDefault()).toBeNull();
  });

  it('fails for undefined types and bad enum classes', () => {
    expect(() => option(Type.UNDEFINED).getDefaultDefault()).toThrow('Invalid type set for this layout option.');
    expect(() => option(Type.ENUM, JavaClass.Double).getDefaultDefault()).toThrow(IllegalStateException);
    expect(() => option(Type.ENUMSET, javaInterface('X')).getDefaultDefault()).toThrow(IllegalStateException);
  });

  it('fails on an empty enumeration like a Java array access', () => {
    class Empty {
      static values(): never[] {
        return [];
      }
    }
    expect(() => option(Type.ENUM, Empty).getDefaultDefault()).toThrow(ArrayIndexOutOfBoundsException);
  });
});

describe('choices and enum values', () => {
  it('lists the choices once per type', () => {
    expect(option(Type.BOOLEAN).getChoices()).toEqual(['false', 'true']);
    expect(option(Type.ENUM, Direction).getChoices()).toEqual(['UNDEFINED', 'RIGHT', 'LEFT', 'DOWN', 'UP']);
    expect(option(Type.ENUMSET, SizeConstraint).getChoices()).toHaveLength(4);
    expect(option(Type.INT).getChoices()).toEqual([]);
    const cached = option(Type.ENUM, Direction);
    expect(cached.getChoices()).toBe(cached.getChoices());
  });

  it('counts and indexes the constants', () => {
    expect(option(Type.ENUM, Direction).getEnumValueCount()).toBe(5);
    expect(option(Type.ENUMSET, SizeConstraint).getEnumValueCount()).toBe(4);
    expect(option(Type.INT).getEnumValueCount()).toBe(0);
    expect(option(Type.ENUM, Direction).getEnumValue(4)).toBe(Direction.UP);
    expect(option(Type.ENUMSET, SizeConstraint).getEnumValue(0)).toBe(SizeConstraint.PORTS);
    expect(option(Type.INT).getEnumValue(0)).toBeNull();
    expect(() => option(Type.ENUM, Direction).getEnumValue(5)).toThrow('Index 5 out of bounds for length 5');
    expect(() => option(Type.ENUM, Direction).getEnumValue(-1)).toThrow(ArrayIndexOutOfBoundsException);
  });
});

describe('default value and bounds', () => {
  it('clones cloneable defaults and shares the rest', () => {
    const vector = new KVector(1, 2);
    const o = new LayoutOptionData.Builder().id('v').defaultValue(vector).create();
    const clone = o.getDefault() as KVector;
    expect(clone).not.toBe(vector);
    expect([clone.x, clone.y]).toEqual([1, 2]);
    expect(new LayoutOptionData.Builder().id('s').defaultValue('x').create().getDefault()).toBe('x');
  });

  it('fails when a cloneable default has no registered clone function', () => {
    const o = new LayoutOptionData.Builder().id('u').defaultValue(new Unregistered()).create();
    expect(() => o.getDefault()).toThrow("Couldn't clone property 'u'");
  });

  it('falls back to the infinite sentinels', () => {
    const o = option(Type.INT);
    expect(o.getLowerBound()).toBe(Property.NEGATIVE_INFINITY);
    expect(o.getUpperBound()).toBe(Property.POSITIVE_INFINITY);
  });

  it('uses set bounds, including exclusive bounds', () => {
    const o = option(Type.DOUBLE);
    o.setLowerBound(ExclusiveBounds.greaterThan(0));
    o.setUpperBound(10);
    expect(o.getLowerBound().compareTo(0)).toBe(1);
    expect(o.getLowerBound().compareTo(-1)).toBe(1);
    expect(o.getUpperBound().compareTo(11)).toBe(-1);
    o.setUpperBound({});
    expect(o.getUpperBound()).toBe(Property.POSITIVE_INFINITY);
  });
});
