// SPDX-License-Identifier: EPL-2.0
// `BasicEdgeRouterTest.checkEdgeRouteIsOrthogonal` and its private `isHorizontal` (mission 7e, T10), shared by
// BasicEdgeRouterTest.test.ts and Issue726Test.test.ts as the Java shares them: the same tolerance, the same checks in
// the same order, the same messages (JUnit 4 `fail(message)` and `assertEquals(message, expected, actual, delta)`).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p5edges/BasicEdgeRouterTest.java:96-148
import type { KVector } from '../../src/core/math/KVector.js';
import type { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { compare } from '../../src/java/lang/DoubleCompare.js';
import { toString as doubleToString } from '../../src/java/lang/DoubleToString.js';

/** `BasicEdgeRouterTest.TOLERANCE` (`:96`). */
export const TOLERANCE = 0.05;

/** The shortest legal route (`route.size() < 2` fails, `:105`). */
const MIN_ROUTE_POINTS = 2;

/** The failure of a JUnit `fail` or `assertEquals`: the message is what the Java would print. */
export class AssertionFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionFailure';
  }
}

/** JUnit 4 `Assert.assertEquals(message, expected, actual, delta)`: equal under `Double.compare` or within `delta`. */
function assertEqualsWithin(message: string, expected: number, actual: number, delta: number): void {
  if (compare(expected, actual) === 0 || Math.abs(expected - actual) <= delta) {
    return;
  }
  throw new AssertionFailure(`${message} expected:<${doubleToString(expected)}> but was:<${doubleToString(actual)}>`);
}

/** Whether the line from `p1` to `p2` is horizontal (`BasicEdgeRouterTest.isHorizontal`, `:143-146`). */
export function isHorizontal(p1: KVector, p2: KVector): boolean {
  return Math.abs(p1.y - p2.y) < TOLERANCE;
}

/**
 * Ensures that the given list of points describe an orthogonal route through the diagram (`:96-134`).
 *
 * @param edge the edge, named in the failure messages through its `toString()`
 * @param route the route: at least two points, alternating horizontal and vertical segments
 * @throws AssertionFailure when the route is too short or a segment is neither horizontal nor vertical as expected
 */
export function checkEdgeRouteIsOrthogonal(edge: { toString(): string }, route: KVectorChain): void {
  // The route should contain at least two points
  if (route.size() < MIN_ROUTE_POINTS) {
    throw new AssertionFailure(`${edge.toString()}: Route with less than 2 points`);
  }

  let horizontal = isHorizontal(route.get(0), route.get(1));
  const points = route[Symbol.iterator]();

  let prev = points.next().value as KVector;
  for (let next = points.next(); next.done !== true; next = points.next()) {
    const curr = next.value;

    const error = `${edge.toString()}: horizontal = ${String(horizontal)} prev = ${prev.toString()} curr = ${curr.toString()}`;

    if (horizontal) {
      assertEqualsWithin(error, prev.y, curr.y, TOLERANCE);
    } else {
      assertEqualsWithin(error, prev.x, curr.x, TOLERANCE);
    }

    horizontal = !horizontal;

    prev = curr;
  }
}
