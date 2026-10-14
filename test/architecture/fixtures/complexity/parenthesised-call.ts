// SPDX-License-Identifier: EPL-2.0

/** Blind spot (e): lizard ends a function early at `x = (call(a) + 1) * 2`. */
export function parenthesisedCall(n: number): number {
  let r = (Math.abs(n) + 1) * 2;
  if (n < 0) {
    return -1;
  }
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
