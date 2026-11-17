// SPDX-License-Identifier: EPL-2.0
/*
 * Port of LabelPlacerTest: where LabelPlacer puts the labels of four-sided self loops. Such a loop leaves a gap between its
 * rightmost and its leftmost port. Its label goes on the southern side if either of those ports is on the northern side,
 * and on the northern side otherwise.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/LabelPlacerTest.java
 */
import { describe, expect, it } from 'vitest';
import { SelfLoopTestGraphCreator } from '../../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../../../core/util/BasicProgressMonitor.js';
import { LGraph } from '../../../graph/LGraph.js';
import { LLabel } from '../../../graph/LLabel.js';
import { LPort } from '../../../graph/LPort.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import { Alignment } from '../SelfHyperLoopLabels.js';
import { SelfLoopHolder } from '../SelfLoopHolder.js';
import { SelfLoopType } from '../SelfLoopType.js';
import { LabelPlacer } from './LabelPlacer.js';
import { RoutingDirector } from './RoutingDirector.js';

/**
 * Creates a node with one port per given side, in that order, and a labelled self hyper loop that connects the ports at the
 * given indices. Then routes the loop and places its label.
 */
function placeLabel(sides: readonly PortSide[], ...connectedPorts: number[]): SelfHyperLoop {
  const graph = new LGraph();
  const node = SelfLoopTestGraphCreator.node(graph);
  for (const side of sides) {
    const port = new LPort();
    port.setNode(node);
    port.setSide(side);
  }

  for (let i = 1; i < connectedPorts.length; i++) {
    SelfLoopTestGraphCreator.edge(node.getPorts()[connectedPorts[i - 1]!]!, node.getPorts()[connectedPorts[i]!]!);
  }
  const labelledEdge = node.getPorts()[connectedPorts[0]!]!.getOutgoingEdges()[0]!;
  labelledEdge.getLabels().push(new LLabel('label'));

  const slHolder = SelfLoopHolder.install(node);
  const slLoop = slHolder.getSLHyperLoops()[0]!;
  slLoop.computePortsPerSide();
  expect(slLoop.getSelfLoopType()).toBe(SelfLoopType.FOUR_SIDES);

  new RoutingDirector().determineLoopRoutes(slHolder);
  new LabelPlacer().placeLabels(slHolder, null, new BasicProgressMonitor());
  return slLoop;
}

function assertLoop(slLoop: SelfHyperLoop, leftmostSide: PortSide, rightmostSide: PortSide, labelSide: PortSide): void {
  expect(slLoop.getLeftmostPort()!.getLPort().getSide()).toBe(leftmostSide);
  expect(slLoop.getRightmostPort()!.getLPort().getSide()).toBe(rightmostSide);

  const slLabels = slLoop.getSLLabels()!;
  expect(slLabels.getSide()).toBe(labelSide);
  expect(slLabels.getAlignment()).toBe(Alignment.CENTER);
}

describe('LabelPlacerTest', () => {
  it('testFourSidesLoopEndingOnNorthernSide', () => {
    // The unconnected northern port makes the loop leave its gap between the northern and the eastern port, so
    // the loop starts on the eastern side and ends on the northern side, which it does not cover completely
    const slLoop = placeLabel(
      [PortSide.NORTH, PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST],
      0,
      2,
      3,
      4,
    );
    assertLoop(slLoop, PortSide.EAST, PortSide.NORTH, PortSide.SOUTH);
  });

  it('testFourSidesLoopStartingOnNorthernSide', () => {
    // The unconnected western port puts the gap between the western and the northern port
    const slLoop = placeLabel(
      [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST, PortSide.WEST],
      0,
      1,
      2,
      3,
    );
    assertLoop(slLoop, PortSide.NORTH, PortSide.WEST, PortSide.SOUTH);
  });

  it('testFourSidesLoopCoveringNorthernSide', () => {
    // The unconnected eastern port puts the gap between the eastern and the southern port
    const slLoop = placeLabel(
      [PortSide.NORTH, PortSide.EAST, PortSide.EAST, PortSide.SOUTH, PortSide.WEST],
      0,
      1,
      3,
      4,
    );
    assertLoop(slLoop, PortSide.SOUTH, PortSide.EAST, PortSide.NORTH);
  });
});
