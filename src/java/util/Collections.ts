// SPDX-License-Identifier: EPL-2.0
import type { Random } from './Random.js';

/**
 * Randomly permutes `list` in place. Traverses backwards from the last element
 * to the second, swapping a randomly selected element into the current
 * position.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collections.html#shuffle(java.util.List,java.util.Random)
 */
export function shuffle<T>(list: T[], rnd: Random): void {
  for (let i = list.length; i > 1; i--) {
    const j = rnd.nextInt(i);
    const tmp = list[i - 1] as T;
    list[i - 1] = list[j] as T;
    list[j] = tmp;
  }
}
