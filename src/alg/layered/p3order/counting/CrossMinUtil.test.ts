// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import { nodeWithPorts } from '../../../../../test/helpers/lgraph-builders.js';
import { CrossMinUtil } from './CrossMinUtil.js';

/** Ports in the clockwise order the side view needs: N, N, E, E, S, S, W, W. */
const SIDES = [
  PortSide.NORTH,
  PortSide.NORTH,
  PortSide.EAST,
  PortSide.EAST,
  PortSide.SOUTH,
  PortSide.SOUTH,
  PortSide.WEST,
  PortSide.WEST,
];

describe('CrossMinUtil.inNorthSouthEastWestOrder', () => {
  const setup = () => {
    const { node, ports } = nodeWithPorts(new LGraph(), SIDES);
    return { node, ports };
  };

  it('keeps the side view order for NORTH and EAST', () => {
    const { node, ports } = setup();
    expect([...CrossMinUtil.inNorthSouthEastWestOrder(node, PortSide.NORTH)]).toEqual([ports[0], ports[1]]);
    expect([...CrossMinUtil.inNorthSouthEastWestOrder(node, PortSide.EAST)]).toEqual([ports[2], ports[3]]);
  });

  it('reverses the side view order for SOUTH and WEST', () => {
    const { node, ports } = setup();
    expect([...CrossMinUtil.inNorthSouthEastWestOrder(node, PortSide.SOUTH)]).toEqual([ports[5], ports[4]]);
    expect([...CrossMinUtil.inNorthSouthEastWestOrder(node, PortSide.WEST)]).toEqual([ports[7], ports[6]]);
  });

  it('answers an empty list for any other side', () => {
    const { node } = setup();
    expect([...CrossMinUtil.inNorthSouthEastWestOrder(node, PortSide.UNDEFINED)]).toEqual([]);
  });
});
