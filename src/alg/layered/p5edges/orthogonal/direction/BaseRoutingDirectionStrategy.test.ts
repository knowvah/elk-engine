// SPDX-License-Identifier: EPL-2.0
// Structural proof of the routing direction strategies (mission 7e, T4): the port sides and the axis each strategy
// reads (WestToEastRoutingStrategy.java:30-42, NorthToSouthRoutingStrategy.java:30-42,
// SouthToNorthRoutingStrategy.java:30-42), and the factory. The bend points and junction points are proven by the
// OrthogonalEdgeRouter rows.
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { LGraph } from '../../../graph/LGraph.js';
import { LNode } from '../../../graph/LNode.js';
import { LPort } from '../../../graph/LPort.js';
import { NorthToSouthRoutingStrategy } from './NorthToSouthRoutingStrategy.js';
import { forRoutingDirection } from './BaseRoutingDirectionStrategyForRoutingDirection.js';
import { RoutingDirection } from './RoutingDirection.js';
import { SouthToNorthRoutingStrategy } from './SouthToNorthRoutingStrategy.js';
import { WestToEastRoutingStrategy } from './WestToEastRoutingStrategy.js';

/** A port on a node at (nodeX, nodeY), with the given position and anchor. */
function portAt(node: [number, number], position: [number, number], anchor: [number, number]): LPort {
  const lnode = new LNode(new LGraph());
  lnode.getPosition().x = node[0];
  lnode.getPosition().y = node[1];
  const port = new LPort();
  port.setNode(lnode);
  port.getPosition().x = position[0];
  port.getPosition().y = position[1];
  port.getAnchor().x = anchor[0];
  port.getAnchor().y = anchor[1];
  return port;
}

describe('forRoutingDirection', () => {
  it('returns the strategy class of each direction', () => {
    expect(forRoutingDirection(RoutingDirection.WEST_TO_EAST)).toBeInstanceOf(WestToEastRoutingStrategy);
    expect(forRoutingDirection(RoutingDirection.NORTH_TO_SOUTH)).toBeInstanceOf(NorthToSouthRoutingStrategy);
    expect(forRoutingDirection(RoutingDirection.SOUTH_TO_NORTH)).toBeInstanceOf(SouthToNorthRoutingStrategy);
  });

  it('returns a new strategy (with its own junction point set) on every call', () => {
    const first = forRoutingDirection(RoutingDirection.WEST_TO_EAST);
    const second = forRoutingDirection(RoutingDirection.WEST_TO_EAST);
    expect(first).not.toBe(second);
    expect(first.getCreatedJunctionPoints()).not.toBe(second.getCreatedJunctionPoints());
  });
});

describe('the strategies', () => {
  it('WEST_TO_EAST sources are the EAST ports, targets the WEST ports, the hyper node axis is y', () => {
    const strategy = forRoutingDirection(RoutingDirection.WEST_TO_EAST);
    expect(strategy.getSourcePortSide()).toBe(PortSide.EAST);
    expect(strategy.getTargetPortSide()).toBe(PortSide.WEST);
    expect(strategy.getPortPositionOnHyperNode(portAt([1, 2], [4, 8], [16, 32]))).toBe(2 + 8 + 32);
  });

  it('NORTH_TO_SOUTH sources are the SOUTH ports, targets the NORTH ports, the hyper node axis is x', () => {
    const strategy = forRoutingDirection(RoutingDirection.NORTH_TO_SOUTH);
    expect(strategy.getSourcePortSide()).toBe(PortSide.SOUTH);
    expect(strategy.getTargetPortSide()).toBe(PortSide.NORTH);
    expect(strategy.getPortPositionOnHyperNode(portAt([1, 2], [4, 8], [16, 32]))).toBe(1 + 4 + 16);
  });

  it('SOUTH_TO_NORTH sources are the NORTH ports, targets the SOUTH ports, the hyper node axis is x', () => {
    const strategy = forRoutingDirection(RoutingDirection.SOUTH_TO_NORTH);
    expect(strategy.getSourcePortSide()).toBe(PortSide.NORTH);
    expect(strategy.getTargetPortSide()).toBe(PortSide.SOUTH);
    expect(strategy.getPortPositionOnHyperNode(portAt([1, 2], [4, 8], [16, 32]))).toBe(1 + 4 + 16);
  });
});
