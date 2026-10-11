// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from "vitest";
import { UnsupportedOperationException } from "../java/lang/UnsupportedOperationException.js";
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";
import * as ImmutableMap from "./ImmutableMap.js";

describe("ImmutableMap.of", () => {
  it("keeps entries in argument order", () => {
    const m = ImmutableMap.of("b", 2, "a", 1);
    expect([...m]).toEqual([["b", 2], ["a", 1]]);
    expect(m.get("a")).toBe(1);
    expect(m.size).toBe(2);
  });

  it("rejects duplicate keys", () => {
    expect(() => ImmutableMap.of("a", 1, "a", 2)).toThrow(IllegalArgumentException);
  });

  it("is frozen", () => {
    const m = ImmutableMap.of("a", 1, "b", 2) as Map<string, number>;
    expect(() => m.set("c", 3)).toThrow(UnsupportedOperationException);
    expect(() => m.delete("a")).toThrow(UnsupportedOperationException);
    expect(() => m.clear()).toThrow(UnsupportedOperationException);
    expect(m.size).toBe(2);
  });
});

describe("ImmutableMap.copyOf", () => {
  it("copies a map preserving its iteration order", () => {
    const src = new Map([["z", 1], ["y", 2]]);
    const m = ImmutableMap.copyOf(src);
    src.set("x", 3);
    expect([...m.keys()]).toEqual(["z", "y"]);
  });

  it("copies an entry iterable", () => {
    const m = ImmutableMap.copyOf([["a", 1], ["b", 2]] as [string, number][]);
    expect(m.get("b")).toBe(2);
  });

  it("rejects duplicate keys in an entry iterable", () => {
    expect(() => ImmutableMap.copyOf([["a", 1], ["a", 2]] as [string, number][])).toThrow(
      IllegalArgumentException,
    );
  });

  it("rejects null keys and null values", () => {
    expect(() => ImmutableMap.copyOf(new Map([[null, 1]]))).toThrow(TypeError);
    expect(() => ImmutableMap.copyOf(new Map([["a", null]]))).toThrow(TypeError);
    expect(() => ImmutableMap.copyOf(new Map([["a", undefined]]))).toThrow(TypeError);
  });
});
