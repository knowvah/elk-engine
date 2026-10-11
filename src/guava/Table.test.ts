// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from "vitest";
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";
import * as Table from "./Table.js";

const ROWS = ["north", "east"] as const;
const COLS = ["start", "end"] as const;

describe("Table.createArrayTable", () => {
  it("starts filled with null", () => {
    const t = Table.createArrayTable<string, string, number>(ROWS, COLS);
    expect(t.get("north", "start")).toBeNull();
    expect([...t.values()]).toEqual([null, null, null, null]);
  });

  it("put returns the previous value and get reads it back", () => {
    const t = Table.createArrayTable<string, string, number>(ROWS, COLS);
    expect(t.put("east", "end", 7)).toBeNull();
    expect(t.put("east", "end", 8)).toBe(7);
    expect(t.get("east", "end")).toBe(8);
    expect(t.get("east", "start")).toBeNull();
  });

  it("get with keys outside the table returns null", () => {
    const t = Table.createArrayTable<string, string, number>(ROWS, COLS);
    expect(t.get("west", "start")).toBeNull();
    expect(t.get("north", "middle")).toBeNull();
  });

  it("put with keys outside the table throws IllegalArgumentException", () => {
    const t = Table.createArrayTable<string, string, number>(ROWS, COLS);
    expect(() => t.put("west", "start", 1)).toThrow(IllegalArgumentException);
    expect(() => t.put("north", "middle", 1)).toThrow(IllegalArgumentException);
  });

  it("values iterates row-major and is a live view", () => {
    const t = Table.createArrayTable<string, string, number>(ROWS, COLS);
    const view = t.values();
    t.put("north", "end", 2);
    t.put("east", "start", 3);
    t.put("north", "start", 1);
    expect([...view]).toEqual([1, 2, 3, null]);
  });

  it("accepts any iterable of keys, including enum-like objects by identity", () => {
    const a = { ordinal: 0 };
    const b = { ordinal: 1 };
    const t = Table.createArrayTable<object, object, string>(new Set([a, b]), [a]);
    t.put(b, a, "x");
    expect(t.get(b, a)).toBe("x");
    expect(t.get({ ordinal: 1 }, a)).toBeNull();
  });

  it("rejects duplicate keys", () => {
    expect(() => Table.createArrayTable(["a", "a"], ["c"])).toThrow(IllegalArgumentException);
    expect(() => Table.createArrayTable(["a"], ["c", "c"])).toThrow(IllegalArgumentException);
  });

  it("rejects exactly one empty key set but allows both empty", () => {
    expect(() => Table.createArrayTable([], ["c"])).toThrow(IllegalArgumentException);
    expect(() => Table.createArrayTable(["r"], [])).toThrow(IllegalArgumentException);
    expect([...Table.createArrayTable([], []).values()]).toEqual([]);
  });
});
