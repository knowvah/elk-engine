// SPDX-License-Identifier: EPL-2.0

/** Blind spots (a)+(h): a function-typed constructor parameter hides every later member, `#private` ones included. */
export class PrivateMethod {
  constructor(private readonly f: (key: string) => number) {}

  #overComplexPrivate(n: number): number {
    let r = this.f('k');
    if (n === 1) r += 1;
    if (n === 2) r += 2;
    if (n === 3) r += 3;
    if (n === 4) r += 4;
    if (n === 5) r += 5;
    if (n === 6) r += 6;
    if (n === 7) r += 7;
    if (n === 8) r += 8;
    if (n === 9) r += 9;
    if (n === 10) r += 10;
    if (n === 11) r += 11;
    if (r > 99) {
      r = 0;
    }
    return r;
  }

  run(): number {
    return this.#overComplexPrivate(1);
  }
}
