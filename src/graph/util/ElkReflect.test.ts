// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { EnumSet } from '../../java/util/EnumSet.js';
import { SizeConstraint } from '../../core/options/SizeConstraint.js';
import { ElkReflect } from './ElkReflect.js';

class Plain {
  constructor(public value: number = 0) {}
}

class PlainSub extends Plain {}

class WithClone {
  constructor(public value: number = 0) {}
  clone(): WithClone {
    return new WithClone(this.value);
  }
}

class OnlyNew {}
class OnlyClone {
  constructor(public value: number = 0) {}
}
class Nothing {}
class RegisteredNoCloneMethod {}
class NullFuns {}

const MARKER = 7;

describe('ElkReflect', () => {
  describe('register', () => {
    it('registers both a new instance and a clone function', () => {
      ElkReflect.register(
        Plain,
        () => new Plain(MARKER),
        (o) => new Plain((o as Plain).value),
      );
      const fresh = ElkReflect.newInstance(Plain);
      expect(fresh).toBeInstanceOf(Plain);
      expect(fresh?.value).toBe(MARKER);
      const source = new Plain(3);
      const copy = ElkReflect.clone(source);
      expect(copy).not.toBe(source);
      expect(copy?.value).toBe(3);
    });

    it('ignores a null new instance function and a null clone function', () => {
      ElkReflect.register(NullFuns, null, null);
      expect(ElkReflect.newInstance(NullFuns)).toBeNull();
      expect(ElkReflect.clone(new NullFuns())).toBeNull();
    });

    it('registerNewInstance registers only the new instance function', () => {
      ElkReflect.registerNewInstance(OnlyNew, () => new OnlyNew());
      expect(ElkReflect.newInstance(OnlyNew)).toBeInstanceOf(OnlyNew);
      expect(ElkReflect.clone(new OnlyNew())).toBeNull();
    });

    it('registerClone registers only the clone function', () => {
      ElkReflect.registerClone(OnlyClone, (o) => new OnlyClone((o as OnlyClone).value + 1));
      expect(ElkReflect.newInstance(OnlyClone)).toBeNull();
      expect(ElkReflect.clone(new OnlyClone(1))?.value).toBe(2);
    });
  });

  describe('newInstance', () => {
    it('returns null for an unregistered class', () => {
      expect(ElkReflect.newInstance(Nothing)).toBeNull();
    });
  });

  describe('clone', () => {
    it('returns null for an unregistered class', () => {
      expect(ElkReflect.clone(new Nothing())).toBeNull();
    });

    it('needs the exact class: a subclass of a registered class is unknown', () => {
      ElkReflect.registerClone(Plain, (o) => new Plain((o as Plain).value));
      expect(ElkReflect.clone(new PlainSub(1))).toBeNull();
    });

    it('clones an EnumSet through the built-in registration', () => {
      const set = EnumSet.allOf(SizeConstraint);
      const copy = ElkReflect.clone(set);
      expect(copy).not.toBe(set);
      expect(copy?.equals(set)).toBe(true);
      copy?.clear();
      expect(set.size()).toBe(SizeConstraint.values().length);
    });
  });

  describe('isCloneable', () => {
    it('accepts arrays, sets, maps and EnumSets', () => {
      expect(ElkReflect.isCloneable([])).toBe(true);
      expect(ElkReflect.isCloneable(new Set())).toBe(true);
      expect(ElkReflect.isCloneable(new Map())).toBe(true);
      expect(ElkReflect.isCloneable(EnumSet.noneOf(SizeConstraint))).toBe(true);
    });

    it('accepts an object with a clone() method', () => {
      expect(ElkReflect.isCloneable(new WithClone())).toBe(true);
      expect(ElkReflect.isCloneable({ clone: () => 1 })).toBe(true);
    });

    it('accepts an object whose class has a registered clone function', () => {
      ElkReflect.registerClone(RegisteredNoCloneMethod, () => new RegisteredNoCloneMethod());
      expect(ElkReflect.isCloneable(new RegisteredNoCloneMethod())).toBe(true);
    });

    it('rejects primitives, null, undefined, plain objects and non-function clone members', () => {
      expect(ElkReflect.isCloneable(43)).toBe(false);
      expect(ElkReflect.isCloneable('foo')).toBe(false);
      expect(ElkReflect.isCloneable(true)).toBe(false);
      expect(ElkReflect.isCloneable(null)).toBe(false);
      expect(ElkReflect.isCloneable(undefined)).toBe(false);
      expect(ElkReflect.isCloneable(new Nothing())).toBe(false);
      expect(ElkReflect.isCloneable({ clone: 3 })).toBe(false);
      expect(ElkReflect.isCloneable(() => 1)).toBe(false);
    });
  });
});
