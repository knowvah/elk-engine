// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it, vi } from 'vitest';
import { SelfLoopTestGraphCreator as Creator } from '../../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { Random } from '../../../../../java/util/Random.js';
import { InternalProperties } from '../../../options/InternalProperties.js';
import { LGraph } from '../../../graph/LGraph.js';
import { LLabel } from '../../../graph/LLabel.js';
import type { LNode } from '../../../graph/LNode.js';
import type { LPort } from '../../../graph/LPort.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import { SelfLoopHolder } from '../SelfLoopHolder.js';
import { RoutingDirector } from './RoutingDirector.js';
import { RoutingSlotAssigner } from './RoutingSlotAssigner.js';

/** Installs the holder, determines the port sides and routes of every loop, as the self loop router does. */
function prepare(node: LNode): SelfLoopHolder {
  const slHolder = SelfLoopHolder.install(node);
  for (const slLoop of slHolder.getSLHyperLoops()) {
    slLoop.computePortsPerSide();
  }
  new RoutingDirector().determineLoopRoutes(slHolder);
  return slHolder;
}

function newNode(north: number, east: number, south: number, west: number): LNode {
  const node = Creator.node(new LGraph());
  Creator.ports(node, north, east, south, west);
  return node;
}

/** The loop of the holder that contains the given edge source port. */
function loopAt(slHolder: SelfLoopHolder, port: LPort): SelfHyperLoop {
  return slHolder.getSLHyperLoops().find((slLoop) => slLoop.getSLPorts().some((slPort) => slPort.getLPort() === port))!;
}

/** Two loops on the north side that share no port, each with one label; the labels are placed on NORTH. */
function twoLabelledNorthLoops(secondLabelX: number): { slHolder: SelfLoopHolder; ports: LPort[] } {
  const node = newNode(4, 0, 0, 0);
  const ports = node.getPorts();
  Creator.edge(ports[0]!, ports[1]!).getLabels().push(new LLabel('a'));
  Creator.edge(ports[2]!, ports[3]!).getLabels().push(new LLabel('b'));
  const slHolder = prepare(node);
  for (const slLoop of slHolder.getSLHyperLoops()) {
    slLoop.getSLLabels()!.setSide(PortSide.NORTH);
  }
  loopAt(slHolder, ports[2]!).getSLLabels()!.getPosition().x = secondLabelX;
  return { slHolder, ports };
}

describe('RoutingSlotAssigner', () => {
  it('routes a loop nested inside another one closer to the node', () => {
    // Loop A spans the east ports 0 and 3, loop B the ports 1 and 2 inside it. B at A's ports would cross A twice,
    // A above B crosses nothing, so B takes the slot nearest the node.
    const node = newNode(0, 4, 0, 0);
    const ports = node.getPorts();
    Creator.edge(ports[0]!, ports[3]!);
    Creator.edge(ports[1]!, ports[2]!);
    const slHolder = prepare(node);
    new RoutingSlotAssigner().assignRoutingSlots(slHolder);

    expect(loopAt(slHolder, ports[1]!).getRoutingSlot(PortSide.EAST)).toBe(0);
    expect(loopAt(slHolder, ports[0]!).getRoutingSlot(PortSide.EAST)).toBe(1);
    expect(slHolder.getRoutingSlotCount()[PortSide.EAST.ordinal()]).toBe(2);
  });

  it('counts slots from 0 on a side without ports', () => {
    // The loop A-B runs over NORTH, EAST and SOUTH; WEST has no port, so its slots are counted from 0.
    const node = newNode(1, 1, 1, 0);
    const ports = node.getPorts();
    Creator.edge(ports[1]!, ports[2]!);
    Creator.edge(ports[0]!, ports[1]!);
    const slHolder = prepare(node);
    new RoutingSlotAssigner().assignRoutingSlots(slHolder);

    expect(slHolder.getRoutingSlotCount()[PortSide.WEST.ordinal()]).toBe(0);
    expect(slHolder.getSLHyperLoops()[0]!.getRoutingSlot(PortSide.WEST)).toBe(0);
  });

  it('assigns no slot to a side a loop does not occupy', () => {
    const node = newNode(0, 2, 1, 0);
    const ports = node.getPorts();
    Creator.edge(ports[0]!, ports[1]!);
    const slHolder = prepare(node);
    new RoutingSlotAssigner().assignRoutingSlots(slHolder);

    expect(slHolder.getRoutingSlotCount()[PortSide.SOUTH.ordinal()]).toBe(0);
    expect(slHolder.getRoutingSlotCount()[PortSide.NORTH.ordinal()]).toBe(0);
    expect(slHolder.getRoutingSlotCount()[PortSide.EAST.ordinal()]).toBe(1);
  });

  it('puts loops with overlapping labels on different slots', () => {
    const { slHolder, ports } = twoLabelledNorthLoops(0);
    new RoutingSlotAssigner().assignRoutingSlots(slHolder);

    const first = loopAt(slHolder, ports[0]!).getRoutingSlot(PortSide.NORTH);
    const second = loopAt(slHolder, ports[2]!).getRoutingSlot(PortSide.NORTH);
    expect(first).not.toBe(second);
    expect(slHolder.getRoutingSlotCount()[PortSide.NORTH.ordinal()]).toBe(2);
  });

  it('leaves loops with disjoint labels and disjoint ports on one slot', () => {
    const { slHolder, ports } = twoLabelledNorthLoops(1000);
    new RoutingSlotAssigner().assignRoutingSlots(slHolder);

    expect(loopAt(slHolder, ports[0]!).getRoutingSlot(PortSide.NORTH)).toBe(0);
    expect(loopAt(slHolder, ports[2]!).getRoutingSlot(PortSide.NORTH)).toBe(0);
    expect(slHolder.getRoutingSlotCount()[PortSide.NORTH.ordinal()]).toBe(1);
  });

  it('does not treat labels on different sides as overlapping', () => {
    const { slHolder, ports } = twoLabelledNorthLoops(0);
    loopAt(slHolder, ports[2]!).getSLLabels()!.setSide(PortSide.SOUTH);
    new RoutingSlotAssigner().assignRoutingSlots(slHolder);

    expect(loopAt(slHolder, ports[0]!).getRoutingSlot(PortSide.NORTH)).toBe(0);
    expect(loopAt(slHolder, ports[2]!).getRoutingSlot(PortSide.NORTH)).toBe(0);
  });

  it('does not treat east or west labels as overlapping', () => {
    const { slHolder, ports } = twoLabelledNorthLoops(0);
    for (const slLoop of slHolder.getSLHyperLoops()) {
      slLoop.getSLLabels()!.setSide(PortSide.EAST);
    }
    new RoutingSlotAssigner().assignRoutingSlots(slHolder);

    expect(loopAt(slHolder, ports[0]!).getRoutingSlot(PortSide.NORTH)).toBe(0);
    expect(loopAt(slHolder, ports[2]!).getRoutingSlot(PortSide.NORTH)).toBe(0);
  });

  it('does not draw when the only cycles consist of zero-weight dependencies', () => {
    // Overlapping labels create dependencies of weight 0 in both directions. The cycle detector sums weights, so both
    // segments have an out weight of 0 and are sinks: no segment has to be picked at random.
    const { slHolder } = twoLabelledNorthLoops(0);
    const random = new Random(1);
    const nextInt = vi.spyOn(random, 'nextInt');
    slHolder.getLNode().getGraph()!.setProperty(InternalProperties.RANDOM, random);
    new RoutingSlotAssigner().assignRoutingSlots(slHolder);

    expect(nextInt).not.toHaveBeenCalled();
  });

  it('can assign twice to the same holder', () => {
    const node = newNode(0, 4, 0, 0);
    const ports = node.getPorts();
    Creator.edge(ports[0]!, ports[3]!);
    Creator.edge(ports[1]!, ports[2]!);
    const slHolder = prepare(node);
    const assigner = new RoutingSlotAssigner();
    assigner.assignRoutingSlots(slHolder);
    assigner.assignRoutingSlots(slHolder);

    expect(loopAt(slHolder, ports[1]!).getRoutingSlot(PortSide.EAST)).toBe(0);
    expect(loopAt(slHolder, ports[0]!).getRoutingSlot(PortSide.EAST)).toBe(1);
  });
});
