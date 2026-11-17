// SPDX-License-Identifier: EPL-2.0
/*
 * Port of PortRestorerTest: how PortRestorer splits the ports of a stacked one-sided self loop. The ports are sorted by net
 * flow, and the second group starts at the first port with a positive net flow, else at the first port with a non-negative
 * net flow, else at the center port, but never at the first or the last port.
 *
 * `assertEquals(Arrays.asList(...), node.getPorts())` compares the ports by identity (`LPort` has no `equals`); the
 * assertion compares the ports' indices in the original port list, which is the same statement and prints readably.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/loops/ordering/PortRestorerTest.java
 */
import { describe, expect, it } from 'vitest';
import { SelfLoopTestGraphCreator } from '../../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { PortConstraints } from '../../../../../core/options/PortConstraints.js';
import { BasicProgressMonitor } from '../../../../../core/util/BasicProgressMonitor.js';
import { LGraph } from '../../../graph/LGraph.js';
import type { LNode } from '../../../graph/LNode.js';
import { InternalProperties } from '../../../options/InternalProperties.js';
import { LayeredOptions } from '../../../options/LayeredOptions.js';
import { SelfLoopOrderingStrategy } from '../../../options/SelfLoopOrderingStrategy.js';
import { SelfLoopPreProcessor } from '../../SelfLoopPreProcessor.js';
import { PortRestorer } from './PortRestorer.js';

/** Creates a node with the given number of northern ports and connects them by self loops between the given pairs of port indices. */
function node(portCount: number, edges: readonly (readonly [number, number])[]): LNode {
  const graph = new LGraph();
  const lNode = SelfLoopTestGraphCreator.node(graph);
  lNode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
  lNode.setProperty(LayeredOptions.EDGE_ROUTING_SELF_LOOP_ORDERING, SelfLoopOrderingStrategy.STACKED);
  SelfLoopTestGraphCreator.ports(lNode, portCount, 0, 0, 0);
  for (const edge of edges) {
    SelfLoopTestGraphCreator.edge(lNode.getPorts()[edge[0]!]!, lNode.getPorts()[edge[1]!]!);
  }
  return lNode;
}

/** Hides the node's self loop ports as the pre-processor does and restores them. */
function restore(lNode: LNode): void {
  new SelfLoopPreProcessor().process(lNode.getGraph()!, new BasicProgressMonitor());
  const slHolder = lNode.getProperty(InternalProperties.SELF_LOOP_HOLDER);
  expect(slHolder.arePortsHidden()).toBe(true);
  expect(lNode.getPorts()).toHaveLength(0);

  slHolder.getSLHyperLoops().forEach((loop) => {
    loop.computePortsPerSide();
  });
  new PortRestorer().restorePorts(slHolder, new BasicProgressMonitor());
}

describe('PortRestorerTest', () => {
  it('testSplitAtFirstNonNegativeNetFlow', () => {
    // a -> b -> c -> d: net flows -1, 0, 0, 1. The only port with a positive net flow is the last one, so the
    // second group starts at b, the first port with a non-negative net flow. The center port would be c.
    const lNode = node(4, [
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
    const p = [...lNode.getPorts()];
    restore(lNode);
    expect(lNode.getPorts().map((port) => p.indexOf(port))).toEqual([0, 3, 2, 1]);
  });

  it('testSplitAtFirstPositiveNetFlow', () => {
    // a -> b, a -> c, d -> c: net flows -2, 1, 2, -1, sorted a, d, b, c. The second group starts at b.
    const lNode = node(4, [
      [0, 1],
      [0, 2],
      [3, 2],
    ]);
    const p = [...lNode.getPorts()];
    restore(lNode);
    expect(lNode.getPorts().map((port) => p.indexOf(port))).toEqual([3, 0, 2, 1]);
  });
});
