// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from "vitest";
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";
import * as Range from "./Range.js";

describe("Range.closed", () => {
  it("exposes its endpoints", () => {
    const r = Range.closed(1, 4);
    expect(r.lowerEndpoint()).toBe(1);
    expect(r.upperEndpoint()).toBe(4);
  });

  it("contains both endpoints and the interior only", () => {
    const r = Range.closed(1, 4);
    expect(r.contains(1)).toBe(true);
    expect(r.contains(4)).toBe(true);
    expect(r.contains(2.5)).toBe(true);
    expect(r.contains(0)).toBe(false);
    expect(r.contains(5)).toBe(false);
  });

  it("allows a singleton range", () => {
    const r = Range.closed(3, 3);
    expect(r.contains(3)).toBe(true);
    expect(r.contains(4)).toBe(false);
  });

  it("works for strings", () => {
    expect(Range.closed("b", "d").contains("c")).toBe(true);
    expect(Range.closed("b", "d").contains("e")).toBe(false);
  });

  it("rejects lower greater than upper", () => {
    expect(() => Range.closed(4, 1)).toThrow(IllegalArgumentException);
  });
});
