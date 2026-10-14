// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { EnumSet } from './EnumSet.js';

/** Minimal enum in the shape of the ported ones (static `values()`, `ordinal()`). */
class Color {
  static readonly RED: Color = new Color(0);
  static readonly GREEN: Color = new Color(1);
  static readonly BLUE: Color = new Color(2);
  static readonly ALL: readonly Color[] = [Color.RED, Color.GREEN, Color.BLUE];

  private constructor(private readonly index: number) {}

  static values(): readonly Color[] {
    return Color.ALL;
  }

  ordinal(): number {
    return this.index;
  }
}

/** A second enum class, used to prove sets over different enums are never equal unless empty. */
class Shape {
  static readonly CIRCLE: Shape = new Shape(0);
  static readonly SQUARE: Shape = new Shape(1);
  static readonly ALL: readonly Shape[] = [Shape.CIRCLE, Shape.SQUARE];

  private constructor(private readonly index: number) {}

  static values(): readonly Shape[] {
    return Shape.ALL;
  }

  ordinal(): number {
    return this.index;
  }
}

/** An enum whose constants print their name, as ported enums do (`Enum.toString`). */
class Side {
  static readonly NORTH: Side = new Side(0, 'NORTH');
  static readonly EAST: Side = new Side(1, 'EAST');
  static readonly SOUTH: Side = new Side(2, 'SOUTH');
  static readonly ALL: readonly Side[] = [Side.NORTH, Side.EAST, Side.SOUTH];

  private constructor(
    private readonly index: number,
    private readonly label: string,
  ) {}

  static values(): readonly Side[] {
    return Side.ALL;
  }

  ordinal(): number {
    return this.index;
  }

  toString(): string {
    return this.label;
  }
}

describe('EnumSet', () => {
  // AbstractCollection.toString: "[" + elements in iteration order, ", "-separated, + "]".
  it('toString lists the elements in ordinal order', () => {
    expect(EnumSet.of(Side.SOUTH, Side.NORTH).toString()).toBe('[NORTH, SOUTH]');
    expect(EnumSet.allOf(Side).toString()).toBe('[NORTH, EAST, SOUTH]');
    expect(String(EnumSet.of(Side.EAST))).toBe('[EAST]');
  });

  it('toString of an empty set is []', () => {
    expect(EnumSet.noneOf(Side).toString()).toBe('[]');
  });

  it('noneOf is empty', () => {
    const set = EnumSet.noneOf(Color);
    expect(set.size()).toBe(0);
    expect(set.isEmpty()).toBe(true);
    expect([...set]).toEqual([]);
  });

  it('allOf holds every constant in ordinal order', () => {
    const set = EnumSet.allOf(Color);
    expect(set.size()).toBe(3);
    expect(set.isEmpty()).toBe(false);
    expect([...set]).toEqual([Color.RED, Color.GREEN, Color.BLUE]);
  });

  it('of iterates in ordinal order regardless of argument order', () => {
    const set = EnumSet.of(Color.BLUE, Color.RED);
    expect([...set]).toEqual([Color.RED, Color.BLUE]);
    expect(set.size()).toBe(2);
  });

  it('of with a single element and a duplicate collapses to one', () => {
    expect(EnumSet.of(Color.GREEN).size()).toBe(1);
    expect(EnumSet.of(Color.GREEN, Color.GREEN).size()).toBe(1);
  });

  it('of derives the universe from the constructor of the first element', () => {
    const set = EnumSet.of(Shape.SQUARE);
    expect(set.contains(Shape.SQUARE)).toBe(true);
    expect(set.contains(Shape.CIRCLE)).toBe(false);
    expect(set.add(Shape.CIRCLE)).toBe(true);
  });

  it('add reports whether the set changed', () => {
    const set = EnumSet.noneOf(Color);
    expect(set.add(Color.GREEN)).toBe(true);
    expect(set.add(Color.GREEN)).toBe(false);
    expect(set.size()).toBe(1);
  });

  it('remove reports whether the set changed', () => {
    const set = EnumSet.allOf(Color);
    expect(set.remove(Color.GREEN)).toBe(true);
    expect(set.remove(Color.GREEN)).toBe(false);
    expect([...set]).toEqual([Color.RED, Color.BLUE]);
  });

  it('contains is false for an absent constant and for a constant of another enum', () => {
    const set = EnumSet.of(Color.RED);
    expect(set.contains(Color.RED)).toBe(true);
    expect(set.contains(Color.BLUE)).toBe(false);
    expect(set.contains(Shape.CIRCLE as unknown as Color)).toBe(false);
  });

  it('clear empties the set', () => {
    const set = EnumSet.allOf(Color);
    set.clear();
    expect(set.size()).toBe(0);
    expect([...set]).toEqual([]);
  });

  it('clone is a distinct equal set that does not share state', () => {
    const set = EnumSet.of(Color.RED, Color.BLUE);
    const copy = set.clone();
    expect(copy).not.toBe(set);
    expect(copy.equals(set)).toBe(true);
    copy.add(Color.GREEN);
    expect(set.contains(Color.GREEN)).toBe(false);
    expect(copy.size()).toBe(3);
  });

  it('copyOf is a distinct equal set', () => {
    const set = EnumSet.of(Color.GREEN);
    const copy = EnumSet.copyOf(set);
    expect(copy).not.toBe(set);
    expect(copy.equals(set)).toBe(true);
    copy.remove(Color.GREEN);
    expect(set.contains(Color.GREEN)).toBe(true);
  });

  it('equals compares elements, not order of insertion', () => {
    const a = EnumSet.noneOf(Color);
    a.add(Color.BLUE);
    a.add(Color.RED);
    expect(a.equals(EnumSet.of(Color.RED, Color.BLUE))).toBe(true);
    expect(a.equals(EnumSet.of(Color.RED))).toBe(false);
    expect(a.equals(EnumSet.of(Color.RED, Color.GREEN))).toBe(false);
  });

  it('equals is false for non-EnumSet arguments', () => {
    const set = EnumSet.of(Color.RED);
    expect(set.equals(new Set([Color.RED]))).toBe(false);
    expect(set.equals(null)).toBe(false);
    expect(set.equals(undefined)).toBe(false);
  });

  it('sets over different enums are equal only when both are empty', () => {
    expect(EnumSet.noneOf(Color).equals(EnumSet.noneOf(Shape))).toBe(true);
    expect(EnumSet.of(Color.RED).equals(EnumSet.of(Shape.CIRCLE))).toBe(false);
  });
});
