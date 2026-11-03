// SPDX-License-Identifier: EPL-2.0
import * as DoubleCompare from '../../../../java/lang/DoubleCompare.js';
import type { LinkedList } from '../../../../java/util/LinkedList.js';

/**
 * The conflict-counting methods of `OrthogonalRoutingGenerator` (`:261-280` and `:387-446`) as module functions behind
 * the facade (file-size limit). The two thresholds, instance fields in the Java, are parameters here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/OrthogonalRoutingGenerator.java
 */

/** a special return value used by the conflict counting method. */
export const CRITICAL_CONFLICTS_DETECTED = -1;

/**
 * Returns the smallest difference between any two numbers in the given stream of numbers. If there are less than two
 * numbers, we return `Double.MAX_VALUE`. The Java stream is `sorted().distinct()` on boxed `Double`s: the natural
 * order is `Double.compareTo` and `distinct` uses `Double.equals`, so `-0.0` sorts before and differs from `0.0` and
 * NaN equals NaN ({@link DoubleCompare}, R6).
 *
 * @see OrthogonalRoutingGenerator.java:261
 */
export function minimumDifference(numberStream: Iterable<number>): number {
  const sorted = [...numberStream].sort(DoubleCompare.compare);
  const numbers: number[] = [];
  for (const number of sorted) {
    if (numbers.length === 0 || DoubleCompare.compare(numbers[numbers.length - 1]!, number) !== 0) {
      numbers.push(number);
    }
  }

  let minDifference = Number.MAX_VALUE;

  if (numbers.length >= 2) {
    const iter = numbers[Symbol.iterator]();
    let currentNumber = iter.next().value!;

    for (let next = iter.next(); next.done !== true; next = iter.next()) {
      const previousNumber = currentNumber;
      currentNumber = next.value;

      // This relies on the fact that the numbers are distinct and sorted ascendingly
      minDifference = Math.min(minDifference, currentNumber - previousNumber);
    }
  }

  return minDifference;
}

/**
 * Counts the number of conflicts for the given lists of positions.
 *
 * @param posis1 sorted list of positions
 * @param posis2 sorted list of positions
 * @param conflictThreshold threshold at which horizontal line segments are considered to be too close to one another
 * @param criticalConflictThreshold threshold at which horizontal line segments are considered to overlap
 * @returns number of positions that overlap, or {@link CRITICAL_CONFLICTS_DETECTED} if a critical conflict was
 *   detected.
 * @see OrthogonalRoutingGenerator.java:397
 */
export function countConflicts(
  posis1: LinkedList<number>,
  posis2: LinkedList<number>,
  conflictThreshold: number,
  criticalConflictThreshold: number,
): number {
  let conflicts = 0;

  if (!posis1.isEmpty() && !posis2.isEmpty()) {
    const iter1 = posis1.listIterator();
    const iter2 = posis2.listIterator();
    let pos1 = iter1.next();
    let pos2 = iter2.next();
    let hasMore = true;

    do {
      if (isWithin(pos1, pos2, criticalConflictThreshold)) {
        // We're done as soon as we find a single critical conflict
        return CRITICAL_CONFLICTS_DETECTED;
      } else if (isWithin(pos1, pos2, conflictThreshold)) {
        conflicts++;
      }

      if (pos1 <= pos2 && iter1.hasNext()) {
        pos1 = iter1.next();
      } else if (pos2 <= pos1 && iter2.hasNext()) {
        pos2 = iter2.next();
      } else {
        hasMore = false;
      }
    } while (hasMore);
  }

  return conflicts;
}

/**
 * The test `pos1 > pos2 - threshold && pos1 < pos2 + threshold` that `countConflicts` applies twice (`:408`, `:411`),
 * split from the Java method body (complexity limits).
 */
function isWithin(pos1: number, pos2: number, threshold: number): boolean {
  return pos1 > pos2 - threshold && pos1 < pos2 + threshold;
}

/**
 * Counts the number of crossings for a given list of positions.
 *
 * @param posis sorted list of positions
 * @param start start of the critical area
 * @param end end of the critical area
 * @returns number of positions in the critical area
 * @see OrthogonalRoutingGenerator.java:436
 */
export function countCrossings(posis: Iterable<number>, start: number, end: number): number {
  let crossings = 0;
  for (const pos of posis) {
    if (pos > end) {
      break;
    } else if (pos >= start) {
      crossings++;
    }
  }
  return crossings;
}
