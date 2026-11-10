// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../../core/math/KVectorChain.js';
// Enter the layered module graph through the enum before the router (7b decision E1, part 3): `PolylineSelfLoopRouter`
// extends `OrthogonalSelfLoopRouter`, the base class of `SplineSelfLoopRouter`, which the enum's import chain reaches.
import '../../IntermediateProcessorStrategy.js';
import { PolylineSelfLoopRouter } from './PolylineSelfLoopRouter.js';

/** Java's `Assert.assertEquals(expected, actual)` on two `KVectorChain`s: `List.equals`, element-wise `KVector.equals`. */
function assertEquals(expected: KVectorChain, actual: KVectorChain): void {
  expect(actual.size(), `size of ${actual.toString()}`).toBe(expected.size());
  const actualVectors = actual.toArray();
  expected.toArray().forEach((vector, index) => {
    expect(vector.equals(actualVectors[index]), `element ${String(index)} of ${actual.toString()}`).toBe(true);
  });
}

/**
 * Tests whether the {@link PolylineSelfLoopRouter}'s corner cutting works as expected.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/PolylineSelfLoopRouterTest.java
 */
describe('PolylineSelfLoopRouterTest', () => {
  const router = new PolylineSelfLoopRouter();

  it('testUsualCase', () => {
    const input = new KVectorChain();
    input.add(new KVector(0, 0));
    input.add(new KVector(100, 0));
    input.add(new KVector(100, 100));
    input.add(new KVector(-100, 100));
    input.add(new KVector(-100, -100));
    input.add(new KVector(0, -100));

    const expected = new KVectorChain();
    expected.add(new KVector(90, 0));
    expected.add(new KVector(100, 10));
    expected.add(new KVector(100, 90));
    expected.add(new KVector(90, 100));
    expected.add(new KVector(-90, 100));
    expected.add(new KVector(-100, 90));
    expected.add(new KVector(-100, -90));
    expected.add(new KVector(-90, -100));

    assertEquals(expected, router.cutCorners(input, 10));
  });

  it('testSmallerDistance', () => {
    const input = new KVectorChain();
    input.add(new KVector(0, 0));
    input.add(new KVector(100, 0));
    input.add(new KVector(100, 100));
    input.add(new KVector(-100, 100));
    input.add(new KVector(-100, -100));
    input.add(new KVector(0, -100));

    const expected = new KVectorChain();
    expected.add(new KVector(50, 0));
    expected.add(new KVector(100, 50));
    expected.add(new KVector(100, 50));
    expected.add(new KVector(50, 100));
    expected.add(new KVector(-20, 100));
    expected.add(new KVector(-100, 20));
    expected.add(new KVector(-100, -50));
    expected.add(new KVector(-50, -100));

    assertEquals(expected, router.cutCorners(input, 80));
  });
});
