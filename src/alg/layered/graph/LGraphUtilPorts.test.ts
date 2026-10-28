// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../core/math/KVector.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import { LGraph } from './LGraph.js';
import {
  calcPortOffset,
  calcPortSide,
  centerPoint,
  createPort,
  initializePort,
  provideCollectorPort,
} from './LGraphUtilPorts.js';
import type { LNode } from './LNode.js';
import { LPort } from './LPort.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

const NODE_EXTENT = 100;

function graphWith(direction: Direction): LGraph {
  const graph = new LGraph();
  graph.setProperty(LayeredOptions.DIRECTION, direction);
  return graph;
}

/** A node at the origin, `NODE_EXTENT` wide and high. */
function sizedNode(graph: LGraph): LNode {
  const node = addNode(graph);
  node.getSize().x = NODE_EXTENT;
  node.getSize().y = NODE_EXTENT;
  return node;
}

function portAt(node: LNode, x: number, y: number): LPort {
  const port = addPort(node);
  port.getPosition().x = x;
  port.getPosition().y = y;
  return port;
}

function hasNorthSouthFlag(graph: LGraph): boolean {
  return graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.NORTH_SOUTH_PORTS);
}

describe('calcPortSide', () => {
  it('is UNDEFINED for a node of zero size', () => {
    const node = addNode(new LGraph());
    expect(calcPortSide(portAt(node, 5, 5), Direction.RIGHT)).toBe(PortSide.UNDEFINED);
  });

  it('chooses WEST or EAST for horizontal directions when the port sticks out on a side', () => {
    for (const direction of [Direction.LEFT, Direction.RIGHT]) {
      const node = sizedNode(new LGraph());
      expect(calcPortSide(portAt(node, -1, 50), direction)).toBe(PortSide.WEST);
      const east = portAt(node, NODE_EXTENT, 50);
      east.getSize().x = 1;
      expect(calcPortSide(east, direction)).toBe(PortSide.EAST);
    }
  });

  it('chooses NORTH or SOUTH for vertical directions when the port sticks out on a side', () => {
    for (const direction of [Direction.UP, Direction.DOWN]) {
      const node = sizedNode(new LGraph());
      expect(calcPortSide(portAt(node, 50, -1), direction)).toBe(PortSide.NORTH);
      const south = portAt(node, 50, NODE_EXTENT);
      south.getSize().y = 1;
      expect(calcPortSide(south, direction)).toBe(PortSide.SOUTH);
    }
  });

  it('falls back to the general criterion for ports inside the node', () => {
    for (const direction of [Direction.UNDEFINED, Direction.RIGHT, Direction.DOWN]) {
      const node = sizedNode(new LGraph());
      expect(calcPortSide(portAt(node, 0, 50), direction)).toBe(PortSide.WEST);
      expect(calcPortSide(portAt(node, NODE_EXTENT, 50), direction)).toBe(PortSide.EAST);
      expect(calcPortSide(portAt(node, 50, 0), direction)).toBe(PortSide.NORTH);
      expect(calcPortSide(portAt(node, 50, NODE_EXTENT), direction)).toBe(PortSide.SOUTH);
    }
  });
});

describe('calcPortOffset', () => {
  it('is 0 for the undefined side', () => {
    const node = sizedNode(new LGraph());
    expect(calcPortOffset(portAt(node, 3, 4), PortSide.UNDEFINED)).toBe(0);
  });
});

describe('centerPoint', () => {
  it('moves the point to the origin on each side of a zero-size boundary', () => {
    for (const side of [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST]) {
      const point = new KVector(5, 6);
      centerPoint(point, new KVector(), side);
      expect([point.x, point.y]).toEqual([0, 0]);
    }
  });

  it('leaves the point alone for the undefined side', () => {
    const point = new KVector(5, 6);
    centerPoint(point, new KVector(), PortSide.UNDEFINED);
    expect([point.x, point.y]).toEqual([5, 6]);
  });
});

describe('provideCollectorPort', () => {
  it('creates a flagged input collector on the given side, attached to the node', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    const port = provideCollectorPort(graph, node, PortType.INPUT, PortSide.WEST)!;
    expect(port.getNode()).toBe(node);
    expect(node.getPorts()).toEqual([port]);
    expect(port.getSide()).toBe(PortSide.WEST);
    expect(port.getProperty(InternalProperties.INPUT_COLLECT)).toBe(true);
    expect(port.getProperty(InternalProperties.OUTPUT_COLLECT)).toBe(false);
  });

  it('creates a flagged output collector on the given side', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    const port = provideCollectorPort(graph, node, PortType.OUTPUT, PortSide.EAST)!;
    expect(port.getSide()).toBe(PortSide.EAST);
    expect(port.getProperty(InternalProperties.OUTPUT_COLLECT)).toBe(true);
    expect(port.getProperty(InternalProperties.INPUT_COLLECT)).toBe(false);
  });

  it('places the new port at the origin of a zero-size node', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    const port = provideCollectorPort(graph, node, PortType.OUTPUT, PortSide.SOUTH)!;
    expect([port.getPosition().x, port.getPosition().y]).toEqual([0, 0]);
  });

  it('reuses the existing collector of the same kind and creates one for the other kind', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    const input = provideCollectorPort(graph, node, PortType.INPUT, PortSide.WEST)!;
    expect(provideCollectorPort(graph, node, PortType.INPUT, PortSide.NORTH)).toBe(input);
    expect(input.getSide()).toBe(PortSide.WEST);
    const output = provideCollectorPort(graph, node, PortType.OUTPUT, PortSide.EAST)!;
    expect(output).not.toBe(input);
    expect(provideCollectorPort(graph, node, PortType.OUTPUT, PortSide.NORTH)).toBe(output);
    expect(node.getPorts()).toEqual([input, output]);
  });

  it('returns null and adds nothing for the undefined port type', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    expect(provideCollectorPort(graph, node, PortType.UNDEFINED, PortSide.EAST)).toBeNull();
    expect(node.getPorts()).toEqual([]);
  });
});

describe('createPort', () => {
  it('uses collector ports for merged edges unless the port sides are fixed', () => {
    const graph = graphWith(Direction.RIGHT);
    graph.setProperty(LayeredOptions.MERGE_EDGES, true);
    const node = addNode(graph);
    const out = createPort(node, null, PortType.OUTPUT, graph);
    const into = createPort(node, null, PortType.INPUT, graph);
    expect(out.getProperty(InternalProperties.OUTPUT_COLLECT)).toBe(true);
    expect(into.getProperty(InternalProperties.INPUT_COLLECT)).toBe(true);
    expect(out.getSide()).toBe(PortSide.fromDirection(Direction.RIGHT));
    expect(into.getSide()).toBe(PortSide.fromDirection(Direction.RIGHT).opposed());
    expect(createPort(node, null, PortType.OUTPUT, graph)).toBe(out);
    expect(node.getPorts()).toEqual([out, into]);
  });

  it('uses collector ports for hypernodes', () => {
    const graph = graphWith(Direction.DOWN);
    const node = addNode(graph);
    node.setProperty(LayeredOptions.HYPERNODE, true);
    const out = createPort(node, null, PortType.OUTPUT, graph);
    expect(out.getProperty(InternalProperties.OUTPUT_COLLECT)).toBe(true);
    expect(out.getSide()).toBe(PortSide.fromDirection(Direction.DOWN));
    expect(createPort(node, null, PortType.OUTPUT, graph)).toBe(out);
  });

  it('creates a plain port per call when merging but the sides are fixed', () => {
    const graph = graphWith(Direction.RIGHT);
    graph.setProperty(LayeredOptions.MERGE_EDGES, true);
    const node = addNode(graph);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
    const first = createPort(node, null, PortType.OUTPUT, graph);
    const second = createPort(node, null, PortType.OUTPUT, graph);
    expect(second).not.toBe(first);
    expect(first.getProperty(InternalProperties.OUTPUT_COLLECT)).toBe(false);
    expect(node.getPorts()).toEqual([first, second]);
  });

  it('without an end point puts output ports on the direction side and input ports opposite', () => {
    for (const direction of [Direction.RIGHT, Direction.LEFT, Direction.DOWN, Direction.UP]) {
      const graph = graphWith(direction);
      const node = addNode(graph);
      const out = createPort(node, null, PortType.OUTPUT, graph);
      const into = createPort(node, null, PortType.INPUT, graph);
      expect(out.getSide()).toBe(PortSide.fromDirection(direction));
      expect(into.getSide()).toBe(PortSide.fromDirection(direction).opposed());
      expect(out.getNode()).toBe(node);
      expect(hasNorthSouthFlag(graph)).toBe(false);
    }
  });

  it('with an end point takes the side from the position and keeps the position inside the node', () => {
    const graph = graphWith(Direction.RIGHT);
    const node = sizedNode(graph);
    const port = createPort(node, new KVector(0, 50), PortType.INPUT, graph);
    expect(port.getSide()).toBe(PortSide.WEST);
    expect([port.getPosition().x, port.getPosition().y]).toEqual([0, 50]);
    expect(hasNorthSouthFlag(graph)).toBe(false);
  });

  it('flags north/south ports in horizontal layouts', () => {
    for (const direction of [Direction.RIGHT, Direction.LEFT]) {
      const graph = graphWith(direction);
      const node = sizedNode(graph);
      expect(createPort(node, new KVector(50, 0), PortType.OUTPUT, graph).getSide()).toBe(PortSide.NORTH);
      expect(hasNorthSouthFlag(graph)).toBe(true);
    }
  });

  it('flags east/west ports in vertical layouts', () => {
    for (const direction of [Direction.DOWN, Direction.UP]) {
      const graph = graphWith(direction);
      const node = sizedNode(graph);
      expect(createPort(node, new KVector(0, 50), PortType.OUTPUT, graph).getSide()).toBe(PortSide.WEST);
      expect(hasNorthSouthFlag(graph)).toBe(true);
    }
  });
});

describe('initializePort: side and offset', () => {
  it('computes the side of an undefined-side port when the sides are fixed', () => {
    const node = sizedNode(graphWith(Direction.RIGHT));
    const port = portAt(node, NODE_EXTENT, 50);
    initializePort(port, PortConstraints.FIXED_SIDE, Direction.RIGHT, null);
    expect(port.getSide()).toBe(PortSide.EAST);
  });

  it('records a border offset for a displaced port, for every side', () => {
    const placements: [number, number, PortSide][] = [
      [50, 0, PortSide.NORTH],
      [NODE_EXTENT, 50, PortSide.EAST],
      [50, NODE_EXTENT, PortSide.SOUTH],
      [0, 50, PortSide.WEST],
    ];
    for (const [x, y, side] of placements) {
      const port = portAt(sizedNode(new LGraph()), x, y);
      initializePort(port, PortConstraints.FIXED_POS, Direction.UNDEFINED, null);
      expect(port.getSide()).toBe(side);
      expect(port.getAllProperties().containsKey(LayeredOptions.PORT_BORDER_OFFSET)).toBe(true);
    }
  });

  it('records no offset for a port at the origin', () => {
    const port = portAt(sizedNode(new LGraph()), 0, 0);
    initializePort(port, PortConstraints.FIXED_SIDE, Direction.RIGHT, null);
    expect(port.getAllProperties().containsKey(LayeredOptions.PORT_BORDER_OFFSET)).toBe(false);
  });

  it('keeps a border offset the user set', () => {
    const port = portAt(sizedNode(new LGraph()), 0, 50);
    port.setProperty(LayeredOptions.PORT_BORDER_OFFSET, 123);
    initializePort(port, PortConstraints.FIXED_SIDE, Direction.RIGHT, null);
    expect(port.getProperty(LayeredOptions.PORT_BORDER_OFFSET)).toBe(123);
  });

  it('records no offset when no side can be determined (zero-size node)', () => {
    const port = portAt(addNode(new LGraph()), 3, 4);
    initializePort(port, PortConstraints.FIXED_SIDE, Direction.RIGHT, null);
    expect(port.getSide()).toBe(PortSide.UNDEFINED);
    expect(port.getAllProperties().containsKey(LayeredOptions.PORT_BORDER_OFFSET)).toBe(false);
  });

  it('does not compute a side when the sides are not fixed, or when a side is already set', () => {
    const free = portAt(sizedNode(new LGraph()), NODE_EXTENT, 50);
    initializePort(free, PortConstraints.FREE, Direction.RIGHT, null);
    expect(free.getSide()).toBe(PortSide.UNDEFINED);

    const set = portAt(sizedNode(new LGraph()), NODE_EXTENT, 50);
    set.setSide(PortSide.NORTH);
    initializePort(set, PortConstraints.FIXED_SIDE, Direction.RIGHT, null);
    expect(set.getSide()).toBe(PortSide.NORTH);
  });
});

describe('initializePort: ratio', () => {
  it('stores a ratio for fixed-ratio constraints and none otherwise', () => {
    const fixed = portAt(sizedNode(new LGraph()), NODE_EXTENT, 50);
    initializePort(fixed, PortConstraints.FIXED_RATIO, Direction.RIGHT, null);
    expect(fixed.getAllProperties().containsKey(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(true);

    const other = portAt(sizedNode(new LGraph()), NODE_EXTENT, 50);
    initializePort(other, PortConstraints.FIXED_SIDE, Direction.RIGHT, null);
    expect(other.getAllProperties().containsKey(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(false);
  });

  it('stores the ratio computed from a node with positive extents (a port at the origin edge gives 0)', () => {
    for (const side of [PortSide.NORTH, PortSide.SOUTH, PortSide.EAST, PortSide.WEST]) {
      const port = portAt(sizedNode(new LGraph()), 0, 0);
      port.setSide(side);
      port.setProperty(InternalProperties.PORT_RATIO_OR_POSITION, 55);
      initializePort(port, PortConstraints.FIXED_RATIO, Direction.RIGHT, null);
      expect(port.getProperty(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(0);
    }
  });

  it('stores 0 when the side is undefined or the node extent in that dimension is 0', () => {
    for (const side of [PortSide.UNDEFINED, PortSide.NORTH, PortSide.SOUTH, PortSide.EAST, PortSide.WEST]) {
      const port = portAt(addNode(new LGraph()), 7, 9);
      port.setSide(side);
      port.setProperty(InternalProperties.PORT_RATIO_OR_POSITION, 55);
      initializePort(port, PortConstraints.FIXED_RATIO, Direction.RIGHT, null);
      expect(port.getProperty(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(0);
    }
  });
});

describe('initializePort: anchor', () => {
  function anchored(side: PortSide, constraints: PortConstraints): LPort {
    const port = addPort(addNode(new LGraph()));
    port.setSide(side);
    port.getAnchor().x = 5;
    port.getAnchor().y = 7;
    initializePort(port, constraints, Direction.RIGHT, null);
    return port;
  }

  it('copies an explicit anchor and marks it as supplied', () => {
    const port = addPort(addNode(new LGraph()));
    const anchor = new KVector(3, 4);
    initializePort(port, PortConstraints.FREE, Direction.RIGHT, anchor);
    expect([port.getAnchor().x, port.getAnchor().y]).toEqual([3, 4]);
    expect(port.getAnchor()).not.toBe(anchor);
    expect(port.isExplicitlySuppliedPortAnchor()).toBe(true);
  });

  it('sets only the coordinates its side defines when the port size is zero', () => {
    expect(((p) => [p.getAnchor().x, p.getAnchor().y])(anchored(PortSide.NORTH, PortConstraints.FIXED_SIDE))).toEqual([
      0, 7,
    ]);
    expect(((p) => [p.getAnchor().x, p.getAnchor().y])(anchored(PortSide.EAST, PortConstraints.FIXED_SIDE))).toEqual([
      0, 0,
    ]);
    expect(((p) => [p.getAnchor().x, p.getAnchor().y])(anchored(PortSide.SOUTH, PortConstraints.FIXED_SIDE))).toEqual([
      0, 0,
    ]);
    expect(((p) => [p.getAnchor().x, p.getAnchor().y])(anchored(PortSide.WEST, PortConstraints.FIXED_SIDE))).toEqual([
      5, 0,
    ]);
  });

  it('centres the anchor when the sides are not fixed or the side is undefined', () => {
    for (const port of [
      anchored(PortSide.NORTH, PortConstraints.FREE),
      anchored(PortSide.UNDEFINED, PortConstraints.FIXED_SIDE),
    ]) {
      expect([port.getAnchor().x, port.getAnchor().y]).toEqual([0, 0]);
      expect(port.isExplicitlySuppliedPortAnchor()).toBe(false);
    }
  });
});
