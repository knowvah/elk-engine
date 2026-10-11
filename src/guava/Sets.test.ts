// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from "vitest";
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";
import * as Sets from "./Sets.js";

class Side {
  constructor(
    readonly label: string,
    private readonly index: number,
  ) {}
  ordinal(): number {
    return this.index;
  }
}
const NORTH = new Side("N", 0);
const EAST = new Side("E", 1);
const SOUTH = new Side("S", 2);

describe("Sets.intersection", () => {
  it("contains elements of both and iterates in the order of the first", () => {
    const v = Sets.intersection(new Set([3, 1, 2]), new Set([2, 3, 9]));
    expect([...v]).toEqual([3, 2]);
    expect(v.size).toBe(2);
    expect(v.has(3)).toBe(true);
    expect(v.has(1)).toBe(false);
    expect(v.has(9)).toBe(false);
  });

  it("reflects later changes to either backing set", () => {
    const a = new Set([1]);
    const b = new Set([1, 2]);
    const v = Sets.intersection(a, b);
    a.add(2);
    expect([...v]).toEqual([1, 2]);
    b.delete(1);
    expect([...v]).toEqual([2]);
    expect(v.size).toBe(1);
  });

  it("supports the ReadonlySet read surface", () => {
    const v = Sets.intersection(new Set(["a", "b"]), new Set(["b"]));
    const seen: string[] = [];
    v.forEach((value, key, set) => {
      seen.push(`${value}${key}${set === v}`);
    });
    expect(seen).toEqual(["bbtrue"]);
    expect([...v.keys()]).toEqual(["b"]);
    expect([...v.values()]).toEqual(["b"]);
    expect([...v.entries()]).toEqual([["b", "b"]]);
  });

  it("is empty for disjoint sets", () => {
    const v = Sets.intersection(new Set([1]), new Set([2]));
    expect(v.size).toBe(0);
    expect([...v]).toEqual([]);
  });

  it("exposes no mutators", () => {
    const v = Sets.intersection(new Set([1]), new Set([1])) as unknown as Set<number>;
    expect(() => v.add(2)).toThrow(TypeError);
    expect(() => v.delete(1)).toThrow(TypeError);
    expect(() => v.clear()).toThrow(TypeError);
  });
});

describe("Sets.immutableEnumSet", () => {
  it("orders by ordinal regardless of input order and drops duplicates", () => {
    const s = Sets.immutableEnumSet([SOUTH, NORTH, SOUTH, EAST]);
    expect([...s]).toEqual([NORTH, EAST, SOUTH]);
  });

  it("is frozen", () => {
    const s = Sets.immutableEnumSet([NORTH]) as Set<Side>;
    expect(() => s.add(EAST)).toThrow(TypeError);
  });

  it("is empty for no elements", () => {
    expect(Sets.immutableEnumSet([]).size).toBe(0);
  });
});

describe("Sets.immutableEnumSetOf", () => {
  it("takes varargs and orders by ordinal", () => {
    expect([...Sets.immutableEnumSetOf(SOUTH, NORTH)]).toEqual([NORTH, SOUTH]);
    expect([...Sets.immutableEnumSetOf(EAST)]).toEqual([EAST]);
  });
});

describe("Sets.newLinkedHashSet", () => {
  it("creates an empty mutable set", () => {
    const s = Sets.newLinkedHashSet<number>();
    s.add(2);
    s.add(1);
    expect([...s]).toEqual([2, 1]);
  });

  it("copies elements in order, minus duplicates", () => {
    const s = Sets.newLinkedHashSet([3, 1, 3, 2]);
    expect([...s]).toEqual([3, 1, 2]);
    s.add(0);
    expect(s.size).toBe(4);
  });
});

describe("Sets.newLinkedHashSetWithExpectedSize", () => {
  it("creates an empty mutable set", () => {
    const s = Sets.newLinkedHashSetWithExpectedSize<string>(5);
    expect(s.size).toBe(0);
    s.add("a");
    expect([...s]).toEqual(["a"]);
  });

  it("accepts zero and rejects negative sizes", () => {
    expect(Sets.newLinkedHashSetWithExpectedSize(0).size).toBe(0);
    expect(() => Sets.newLinkedHashSetWithExpectedSize(-1)).toThrow(IllegalArgumentException);
  });
});

describe("Sets.newTreeSet", () => {
  it("sorts numbers by natural order", () => {
    expect([...Sets.newTreeSet([3, 1, 2, 1])]).toEqual([1, 2, 3]);
  });

  it("sorts strings by UTF-16 code units", () => {
    expect([...Sets.newTreeSet(["b", "B", "a"])]).toEqual(["B", "a", "b"]);
  });

  it("drops duplicate strings and bigints", () => {
    expect([...Sets.newTreeSet(["a", "a", "b"])]).toEqual(["a", "b"]);
    expect([...Sets.newTreeSet([2n, 2n, 1n])]).toEqual([1n, 2n]);
  });

  it("sorts bigints and objects with compareTo", () => {
    expect([...Sets.newTreeSet([3n, 1n])]).toEqual([1n, 3n]);
    const mk = (n: number): { n: number; compareTo(o: { n: number }): number } => ({
      n,
      compareTo: (o) => n - o.n,
    });
    expect([...Sets.newTreeSet([mk(2), mk(1)])].map((x) => x.n)).toEqual([1, 2]);
  });

  it("orders doubles with Double.compare (NaN last, infinities at the ends)", () => {
    const inf = Number.POSITIVE_INFINITY;
    expect([...Sets.newTreeSet([Number.NaN, inf, 0, -inf, -1])]).toEqual([
      -inf,
      -1,
      0,
      inf,
      Number.NaN,
    ]);
  });

  it("collapses -0 and 0 because a JS Set uses SameValueZero (documented limitation)", () => {
    expect(Sets.newTreeSet([0, -0]).size).toBe(1);
  });

  it("is empty with no arguments", () => {
    expect(Sets.newTreeSet().size).toBe(0);
  });

  it("sorts by a comparator and keeps the first of comparator-equal elements", () => {
    const byLength = (a: string, b: string): number => a.length - b.length;
    const s = Sets.newTreeSet(byLength);
    expect(s.size).toBe(0);
    const t = Sets.newTreeSet(["ccc", "a", "bb", "x"], byLength);
    expect([...t]).toEqual(["a", "bb", "ccc"]);
  });

  it("a comparator as sole argument gives an empty set", () => {
    expect([...Sets.newTreeSet((a: number, b: number) => b - a)]).toEqual([]);
  });

  it("rejects elements without a natural order", () => {
    expect(() => Sets.newTreeSet([{}, {}] as never)).toThrow(TypeError);
    expect(() => Sets.newTreeSet([null, null] as never)).toThrow(TypeError);
    expect(() => Sets.newTreeSet([{ compareTo: 1 }, {}] as never)).toThrow(TypeError);
    expect(() => Sets.newTreeSet([true, false] as never)).toThrow(TypeError);
  });
});
