// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from "vitest";
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";
import { IndexOutOfBoundsException } from "../java/lang/IndexOutOfBoundsException.js";
import * as Lists from "./Lists.js";

describe("Lists.newArrayList", () => {
  it("creates an empty list without arguments", () => {
    expect(Lists.newArrayList()).toEqual([]);
  });

  it("copies the elements of an iterable", () => {
    const source = [1, 2, 3];
    const copy = Lists.newArrayList(source);
    expect(copy).toEqual([1, 2, 3]);
    expect(copy).not.toBe(source);
    source.push(4);
    expect(copy).toEqual([1, 2, 3]);
  });

  it("copies from non-array iterables", () => {
    expect(Lists.newArrayList(new Set(["a", "b"]))).toEqual(["a", "b"]);
  });
});

describe("Lists.newArrayListOf", () => {
  it("collects the given elements in order", () => {
    expect(Lists.newArrayListOf("a", "b", "c")).toEqual(["a", "b", "c"]);
  });

  it("keeps a single iterable argument as one element", () => {
    const inner = [1, 2];
    expect(Lists.newArrayListOf(inner)).toEqual([[1, 2]]);
  });
});

describe("Lists.newLinkedList", () => {
  it("creates an empty list without arguments", () => {
    expect(Lists.newLinkedList()).toEqual([]);
  });

  it("copies the elements of an iterable", () => {
    const source = ["x", "y"];
    const copy = Lists.newLinkedList(source);
    expect(copy).toEqual(["x", "y"]);
    expect(copy).not.toBe(source);
  });
});

describe("Lists.newArrayListWithCapacity", () => {
  it("creates an empty list", () => {
    expect(Lists.newArrayListWithCapacity(5)).toEqual([]);
  });

  it("throws IllegalArgumentException for a negative capacity", () => {
    expect(() => Lists.newArrayListWithCapacity(-1)).toThrow(
      IllegalArgumentException,
    );
  });
});

describe("Lists.newArrayListWithExpectedSize", () => {
  it("creates an empty list", () => {
    expect(Lists.newArrayListWithExpectedSize(7)).toEqual([]);
  });
});

describe("Lists.reverse", () => {
  it("reads elements in reverse order", () => {
    const view = Lists.reverse([1, 2, 3]);
    expect(view.size()).toBe(3);
    expect(view.get(0)).toBe(3);
    expect(view.get(2)).toBe(1);
    expect([...view]).toEqual([3, 2, 1]);
    expect(view.toArray()).toEqual([3, 2, 1]);
  });

  it("reflects later source changes at its start", () => {
    const a = [1, 2];
    const view = Lists.reverse(a);
    a.push(9);
    expect(view.size()).toBe(3);
    expect(view.get(0)).toBe(9);
    expect([...view]).toEqual([9, 2, 1]);
  });

  it("writes through to the source and returns the previous value", () => {
    const a = [1, 2, 3];
    const view = Lists.reverse(a);
    expect(view.set(0, 7)).toBe(3);
    expect(a).toEqual([1, 2, 7]);
    view.set(2, 5);
    expect(a).toEqual([5, 2, 7]);
  });

  it("toArray returns a copy that does not alias the source", () => {
    const a = [1, 2];
    const copy = Lists.reverse(a).toArray();
    copy[0] = 100;
    expect(a).toEqual([1, 2]);
  });

  it("throws IndexOutOfBoundsException for bad indexes", () => {
    const view = Lists.reverse([1, 2]);
    expect(() => view.get(2)).toThrow(IndexOutOfBoundsException);
    expect(() => view.get(2)).toThrow("index (2) must be less than size (2)");
    expect(() => view.get(-1)).toThrow("index (-1) must not be negative");
    expect(() => view.set(5, 0)).toThrow(IndexOutOfBoundsException);
  });

  it("is empty for an empty source", () => {
    const view = Lists.reverse<number>([]);
    expect(view.size()).toBe(0);
    expect([...view]).toEqual([]);
  });
});
