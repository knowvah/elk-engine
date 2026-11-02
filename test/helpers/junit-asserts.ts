// SPDX-License-Identifier: EPL-2.0
import { expect } from 'vitest';

/**
 * Hamcrest `assertThat(actual, is(expected))` / JUnit `assertEquals(expected, actual)` on a list of `LNode`, `LPort`,
 * `LEdge` or `Layer` (mission 7c-tests, T5): the sequences have the same length and the same objects in the same order.
 *
 * Identity only. `LNode`, `LPort`, `LEdge` and `Layer` do not override Java `equals`, so Java compares them by
 * reference; `toEqual` would accept distinct look-alikes with the same fields and would recurse through the cyclic
 * node/port/edge references. `actual` is materialised once, so a one-shot iterable (a generator, `LNode.getPorts(side)`)
 * is consumed exactly once.
 *
 * @param actual the sequence under test
 * @param expected the objects expected, in order
 */
export function expectSameElements<T>(actual: Iterable<T>, expected: readonly T[]): void {
  const elements = [...actual];
  expect(elements.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(elements[i]).toBe(expected[i]);
  }
}
