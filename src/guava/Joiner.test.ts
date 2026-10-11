// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from "vitest";
import * as Joiner from "./Joiner.js";

class Named {
  constructor(private readonly name: string) {}
  toString(): string {
    return `<${this.name}>`;
  }
}

describe("Joiner.join", () => {
  it("places the separator between consecutive strings", () => {
    expect(Joiner.on(", ").join(["a", "b"])).toBe("a, b");
    expect(Joiner.on(".").join(["x", "y", "z"])).toBe("x.y.z");
  });

  it("returns the single element or the empty string for tiny inputs", () => {
    expect(Joiner.on(",").join(["only"])).toBe("only");
    expect(Joiner.on(",").join([])).toBe("");
  });

  it("keeps empty strings as elements", () => {
    expect(Joiner.on(",").join(["", ""])).toBe(",");
  });

  it("converts objects through toString and accepts any iterable", () => {
    expect(Joiner.on(", ").join(new Set([new Named("a"), new Named("b")]))).toBe("<a>, <b>");
  });

  it("converts numbers like JS String (ints)", () => {
    expect(Joiner.on("-").join([1, 2])).toBe("1-2");
  });

  it("throws a TypeError naming the index for null or undefined elements", () => {
    expect(() => Joiner.on(",").join(["a", null])).toThrow(TypeError);
    expect(() => Joiner.on(",").join([undefined])).toThrow("index 0");
  });
});

describe("Joiner.joinDoubles", () => {
  it("renders numbers with Java Double.toString", () => {
    expect(Joiner.on(",").joinDoubles([1, 2.5])).toBe("1.0,2.5");
    expect(Joiner.on(",").joinDoubles([1e7, Number.NaN])).toBe("1.0E7,NaN");
    expect(Joiner.on(",").joinDoubles([])).toBe("");
  });
});
