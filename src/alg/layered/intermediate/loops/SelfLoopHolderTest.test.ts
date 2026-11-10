// SPDX-License-Identifier: EPL-2.0
// Port of SelfLoopHolderTest.java (3 runs). Java literals and assertions are unchanged; `JUnit assertEquals(slHolder, ...)`
// on a class without `equals` is identity.
import { describe, expect, it } from 'vitest';
import { SelfLoopTestGraphCreator } from '../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import type { LEdge } from '../../graph/LEdge.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { SelfLoopHolder } from './SelfLoopHolder.js';

/** `java.lang.AssertionError`: thrown by JUnit's `fail()` and, with `-ea`, by a failed `assert`. */
class AssertionError extends Error {}

/** JUnit's `fail()`. */
function fail(): never {
  throw new AssertionError();
}

/**
 * Tests whether the data model created by {@link SelfLoopHolder} is correct.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopHolderTest.java
 */
describe('SelfLoopHolderTest', () => {
  it('testNonSelfLoopGraph', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();

    for (const lNode of lGraph.getLayerlessNodes()) {
      expect(SelfLoopHolder.needsSelfLoopProcessing(lNode)).toBe(false);

      // This should throw an AssertionError
      try {
        SelfLoopHolder.install(lNode);
        fail();
      } catch (e) {
        if (!(e instanceof AssertionError)) {
          throw e;
        }
        // If this happens, everything's good
      }
    }
  });

  it('testBasicSelfLoops', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithSelfLoops();

    // The second node is the one with self loops
    const lNode = lGraph.getLayerlessNodes()[1]!;
    expect(SelfLoopHolder.needsSelfLoopProcessing(lNode)).toBe(true);

    const slHolder = SelfLoopHolder.install(lNode);
    expect(slHolder).not.toBeNull();
    expect(slHolder).toBe(lNode.getProperty(InternalProperties.SELF_LOOP_HOLDER));

    // All ports have incident self loops
    expect(slHolder.getSLPortMap().size).toBe(lNode.getPorts().length);

    // There should be half as many hyper loops
    expect(slHolder.getSLHyperLoops().length).toBe(Math.trunc(lNode.getPorts().length / 2));
  });

  it('testDifferentSelfHyperLoops', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();

    const lNode = lGraph.getLayerlessNodes()[1]!;

    // Add further ports
    SelfLoopTestGraphCreator.ports(lNode, 2, 2, 2, 1);

    // Connect the first half of the ports with self loops
    const firstLoops = new Set<LEdge>();
    for (let i = 1; i < Math.trunc(lNode.getPorts().length / 2); i++) {
      const lEdge = SelfLoopTestGraphCreator.edge(lNode.getPorts()[i - 1]!, lNode.getPorts()[i]!);
      firstLoops.add(lEdge);
    }

    // Connect the other half
    const secondLoops = new Set<LEdge>();
    for (let i = Math.trunc(lNode.getPorts().length / 2) + 1; i < lNode.getPorts().length; i++) {
      const lEdge = SelfLoopTestGraphCreator.edge(lNode.getPorts()[i - 1]!, lNode.getPorts()[i]!);
      secondLoops.add(lEdge);
    }

    // Install self loop holder and check that we have two self hyper loops
    const slHolder = SelfLoopHolder.install(lNode);
    expect(slHolder.getSLHyperLoops().length).toBe(2);

    // Test the edges of the two hyper loops
    const firstHLEdges = new Set([...slHolder.getSLHyperLoops()[0]!.getSLEdges()].map((slEdge) => slEdge.getLEdge()));
    const secondHLEdges = new Set([...slHolder.getSLHyperLoops()[1]!.getSLEdges()].map((slEdge) => slEdge.getLEdge()));

    const sameSet = (a: ReadonlySet<LEdge>, b: ReadonlySet<LEdge>): boolean =>
      a.size === b.size && [...a].every((e) => b.has(e));

    // They can match in either way
    let match = sameSet(firstHLEdges, firstLoops) && sameSet(secondHLEdges, secondLoops);
    match ||= sameSet(firstHLEdges, secondLoops) && sameSet(secondHLEdges, firstLoops);

    expect(match).toBe(true);
  });
});
