// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import type { ElkPort } from '../../graph/ElkPort.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { Direction } from '../options/Direction.js';
import { PortSide } from '../options/PortSide.js';
import { ElkUtil } from './ElkUtil.js';

const NODE_SIZE = 100;
const PORT_SIZE = 10;
const NO_PARENT_MESSAGE = 'port must have a parent node to calculate the port side';

/** A node of the given size. */
function sizedNode(width: number, height: number, parent: ElkNode | null = null): ElkNode {
  const node = ElkGraphUtil.createNode(parent);
  node.setDimensions(width, height);
  return node;
}

/** A port on `node` at the given location and size. */
function portAt(node: ElkNode, x: number, y: number, width = PORT_SIZE, height = PORT_SIZE): ElkPort {
  const port = ElkGraphUtil.createPort(node);
  port.setLocation(x, y);
  port.setDimensions(width, height);
  return port;
}

describe('ElkUtil.calcPortSide', () => {
  // ElkUtil.java:100-158
  it('throws IllegalStateException for a port without a parent (:101-103)', () => {
    const port = ElkGraphUtil.createPort(null);
    expect(() => ElkUtil.calcPortSide(port, Direction.RIGHT)).toThrow(new IllegalStateException(NO_PARENT_MESSAGE));
  });

  it('returns UNDEFINED for a node of zero width and height (:108-110)', () => {
    const port = portAt(sizedNode(0, 0), 0, 0);
    expect(ElkUtil.calcPortSide(port, Direction.RIGHT)).toBe(PortSide.UNDEFINED);
  });

  it('does not return UNDEFINED when only one dimension is zero (:109 uses &&)', () => {
    // widthPercent = 0/0 = NaN, heightPercent = 5/10 = 0.5; every comparison is false, 0.5 < 0.5 is false: SOUTH
    const port = portAt(sizedNode(0, 10), 0, 0, 0, 10);
    expect(ElkUtil.calcPortSide(port, Direction.UNDEFINED)).toBe(PortSide.SOUTH);
  });

  it.each([Direction.LEFT, Direction.RIGHT])('uses the x criterion for %s (:114-122)', (direction) => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    expect(ElkUtil.calcPortSide(portAt(node, -5, 40), direction)).toBe(PortSide.WEST);
    expect(ElkUtil.calcPortSide(portAt(node, 95, 40), direction)).toBe(PortSide.EAST);
  });

  it.each([Direction.UP, Direction.DOWN])('uses the y criterion for %s (:123-130)', (direction) => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    expect(ElkUtil.calcPortSide(portAt(node, 40, -5), direction)).toBe(PortSide.NORTH);
    expect(ElkUtil.calcPortSide(portAt(node, 40, 95), direction)).toBe(PortSide.SOUTH);
  });

  it('is direction dependent: x < 0 means WEST only for LEFT/RIGHT (:114-130)', () => {
    // UP: y = 45 is inside; general criterion widthPercent 0, heightPercent 0.5 -> WEST as well, so use y outside
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    const port = portAt(node, 95, -3, PORT_SIZE, 6);
    expect(ElkUtil.calcPortSide(port, Direction.DOWN)).toBe(PortSide.NORTH);
    expect(ElkUtil.calcPortSide(port, Direction.RIGHT)).toBe(PortSide.EAST);
  });

  it('falls back to the general criterion for an inside port and UNDEFINED direction (:133-153)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    // (x + w/2)/100 and (y + h/2)/100: west (0, 0.5), east (0.95, 0.5), south (0.5, 0.95), north (0.5, 0.05)
    expect(ElkUtil.calcPortSide(portAt(node, -5, 45), Direction.UNDEFINED)).toBe(PortSide.WEST);
    expect(ElkUtil.calcPortSide(portAt(node, 90, 45), Direction.UNDEFINED)).toBe(PortSide.EAST);
    expect(ElkUtil.calcPortSide(portAt(node, 45, 90), Direction.UNDEFINED)).toBe(PortSide.SOUTH);
    expect(ElkUtil.calcPortSide(portAt(node, 45, 0), Direction.UNDEFINED)).toBe(PortSide.NORTH);
  });

  it('falls back to the general criterion when the direction criterion does not match (:133)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    expect(ElkUtil.calcPortSide(portAt(node, 45, 0), Direction.RIGHT)).toBe(PortSide.NORTH);
  });
});

describe('ElkUtil.calcPortOffset', () => {
  // ElkUtil.java:172-190, port (10,20) 4x6 on a 100x80 node
  const setup = (): ElkPort => portAt(sizedNode(NODE_SIZE, 80), 10, 20, 4, 6);

  it('throws IllegalStateException for a port without a parent (:173-175)', () => {
    expect(() => ElkUtil.calcPortOffset(ElkGraphUtil.createPort(null), PortSide.NORTH)).toThrow(
      new IllegalStateException(NO_PARENT_MESSAGE),
    );
  });

  it.each([
    [PortSide.NORTH, -26], // -(20 + 6), :179
    [PortSide.EAST, -90], // 10 - 100, :181
    [PortSide.SOUTH, -60], // 20 - 80, :183
    [PortSide.WEST, -14], // -(10 + 4), :185
    [PortSide.UNDEFINED, 0], // :188
  ])('computes the offset for %s', (side, expected) => {
    expect(ElkUtil.calcPortOffset(setup(), side)).toBe(expected);
  });
});
