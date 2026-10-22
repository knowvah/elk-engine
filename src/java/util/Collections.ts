// SPDX-License-Identifier: EPL-2.0
import { Random } from './Random.js';

/** Lazily created default source of randomness for the one-argument {@link shuffle}. */
const defaultSource: { random: Random | null } = { random: null };

/**
 * Randomly permutes `list` in place using a default source of randomness.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collections.html#shuffle(java.util.List)
 */
export function shuffle<T>(list: T[]): void;
/**
 * Randomly permutes `list` in place. Traverses backwards from the last element
 * to the second, swapping a randomly selected element into the current
 * position.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collections.html#shuffle(java.util.List,java.util.Random)
 */
export function shuffle<T>(list: T[], rnd: Random): void;
export function shuffle<T>(list: T[], rnd?: Random): void {
  const source = rnd ?? (defaultSource.random ??= new Random());
  for (let i = list.length; i > 1; i--) {
    const j = source.nextInt(i);
    const tmp = list[i - 1] as T;
    list[i - 1] = list[j] as T;
    list[j] = tmp;
  }
}
