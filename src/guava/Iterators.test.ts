// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from "vitest";
import * as Iterators from "./Iterators.js";

function drain<T>(it: Iterator<T>): T[] {
  const out: T[] = [];
  for (let r = it.next(); r.done !== true; r = it.next()) {
    out.push(r.value);
  }
  return out;
}

class Animal {}
class Dog extends Animal {}

describe("Iterators.filter", () => {
  it("keeps matching elements in order", () => {
    const it = Iterators.filter(
      [1, 2, 3, 4][Symbol.iterator](),
      (n) => n % 2 === 0,
    );
    expect(drain(it)).toEqual([2, 4]);
  });

  it("is lazy: the source is not advanced until next()", () => {
    let pulled = 0;
    function* source(): Generator<number> {
      for (const n of [1, 2, 3]) {
        pulled++;
        yield n;
      }
    }
    const it = Iterators.filter(source(), () => true);
    expect(pulled).toBe(0);
    expect(it.next().value).toBe(1);
    expect(pulled).toBe(1);
  });
});

describe("Iterators.filterInstances", () => {
  it("keeps only instances of the class", () => {
    const dog = new Dog();
    const cat = new Animal();
    const it = Iterators.filterInstances(
      [cat, dog, "x", 3][Symbol.iterator](),
      Dog,
    );
    expect(drain(it)).toEqual([dog]);
  });
});

describe("Iterators.concat", () => {
  it("chains iterators in order", () => {
    const it = Iterators.concat(
      [1, 2][Symbol.iterator](),
      [][Symbol.iterator](),
      [3][Symbol.iterator](),
    );
    expect(drain(it)).toEqual([1, 2, 3]);
  });

  it("is empty with no arguments", () => {
    expect(drain(Iterators.concat<number>())).toEqual([]);
  });
});

describe("Iterators.singletonIterator", () => {
  it("yields exactly the one element", () => {
    const it = Iterators.singletonIterator("only");
    expect(it.next()).toEqual({ done: false, value: "only" });
    expect(it.next().done).toBe(true);
  });
});

describe("Iterators.unmodifiableIterator", () => {
  it("yields the underlying elements", () => {
    expect(
      drain(Iterators.unmodifiableIterator([1, 2][Symbol.iterator]())),
    ).toEqual([1, 2]);
  });

  it("exposes only next()", () => {
    const it = Iterators.unmodifiableIterator([1][Symbol.iterator]());
    expect(Object.keys(it)).toEqual([]);
    expect(
      Object.getOwnPropertyNames(Object.getPrototypeOf(it) as object).sort(),
    ).toEqual(["constructor", "next"]);
  });
});
