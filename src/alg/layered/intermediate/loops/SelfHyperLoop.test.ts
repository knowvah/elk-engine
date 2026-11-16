// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { expectSameElements } from '../../../../../test/helpers/junit-asserts.js';
import { SelfLoopTestGraphCreator } from '../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LLabel } from '../../graph/LLabel.js';
import { SelfHyperLoopLabels } from './SelfHyperLoopLabels.js';
import { SelfLoopHolder } from './SelfLoopHolder.js';
import { SelfLoopType } from './SelfLoopType.js';

/** The holder of `basicGraphWithSelfLoops`: four loops over the port pairs (0,1) W-N, (2,3) N-E, (4,5) E-S, (6,7) S-W. */
function holder(): SelfLoopHolder {
  return SelfLoopHolder.install(SelfLoopTestGraphCreator.basicGraphWithSelfLoops().getLayerlessNodes()[1]!);
}

describe('SelfHyperLoop', () => {
  it('is owned by its holder and starts without routing information', () => {
    const h = holder();
    const loop = h.getSLHyperLoops()[0]!;
    expect(loop.getSLHolder()).toBe(h);
    expect(loop.getSelfLoopType()).toBeNull();
    expect(loop.getLeftmostPort()).toBeNull();
    expect(loop.getRightmostPort()).toBeNull();
    expect(loop.getSLLabels()).toBeNull();
    expect(loop.getOccupiedPortSides().isEmpty()).toBe(true);
    expect(PortSide.values().every((side) => loop.getRoutingSlot(side) === 0)).toBe(true);
  });

  it('addSelfLoopEdge ignores an edge it already holds', () => {
    const loop = holder().getSLHyperLoops()[0]!;
    const edge = [...loop.getSLEdges()][0]!;
    const ports = [...loop.getSLPorts()];
    loop.addSelfLoopEdge(edge);
    expect(loop.getSLEdges().size).toBe(1);
    expectSameElements(loop.getSLPorts(), ports);
  });

  it('collects the labels of its edges into one SelfHyperLoopLabels', () => {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();
    const lNode = lGraph.getLayerlessNodes()[1]!;
    SelfLoopTestGraphCreator.ports(lNode, 0, 1, 0, 0);
    const edge = SelfLoopTestGraphCreator.edge(lNode.getPorts()[0]!, lNode.getPorts()[1]!);
    const first = new LLabel('a');
    const second = new LLabel('b');
    edge.getLabels().push(first, second);
    const loop = SelfLoopHolder.install(lNode).getSLHyperLoops()[0]!;
    expect(loop.getSLLabels()).toBeInstanceOf(SelfHyperLoopLabels);
    expectSameElements(loop.getSLLabels()!.getLLabels(), [first, second]);
  });

  it('computePortsPerSide groups the ports by side in insertion order and derives the loop type', () => {
    const h = holder();
    const cornerLoop = h.getSLHyperLoops()[0]!;
    cornerLoop.computePortsPerSide();
    expect(cornerLoop.getSelfLoopType()).toBe(SelfLoopType.TWO_SIDES_CORNER);
    expect(cornerLoop.getSLPortsBySide().keySet().map(String)).toEqual(['WEST', 'NORTH']);
    expect(cornerLoop.hasSLPortsOnSide(PortSide.WEST)).toBe(true);
    expect(cornerLoop.hasSLPortsOnSide(PortSide.EAST)).toBe(false);
    expect([...cornerLoop.getSLPortsBySide(PortSide.NORTH)].map((p) => p.getLPort())).toEqual([
      cornerLoop.getSLPorts()[1]!.getLPort(),
    ]);
  });

  it('setRoutingSlot records the slot and raises the holder slot count to slot + 1 on that side only', () => {
    const h = holder();
    const loop = h.getSLHyperLoops()[0]!;
    loop.setRoutingSlot(PortSide.NORTH, 2);
    expect(loop.getRoutingSlot(PortSide.NORTH)).toBe(2);
    expect(h.getRoutingSlotCount()[PortSide.NORTH.ordinal()]).toBe(3);
    loop.setRoutingSlot(PortSide.NORTH, 0);
    expect(loop.getRoutingSlot(PortSide.NORTH)).toBe(0);
    expect(h.getRoutingSlotCount()[PortSide.NORTH.ordinal()]).toBe(3);
    expect(h.getRoutingSlotCount()[PortSide.SOUTH.ordinal()]).toBe(0);
  });

  it('keeps the leftmost and rightmost ports and the occupied sides it is given', () => {
    const loop = holder().getSLHyperLoops()[0]!;
    const [left, right] = loop.getSLPorts() as [never, never];
    loop.setLeftmostPort(left);
    loop.setRightmostPort(right);
    loop.getOccupiedPortSides().add(PortSide.EAST);
    expect(loop.getLeftmostPort()).toBe(left);
    expect(loop.getRightmostPort()).toBe(right);
    expect([...loop.getOccupiedPortSides()].map(String)).toEqual(['EAST']);
  });
});
