// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import type { ElkPort } from '../../graph/ElkPort.js';
import type { ElkShape } from '../../graph/ElkShape.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { ElkMargin } from '../math/ElkMargin.js';
import { KVector } from '../math/KVector.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { Direction } from '../options/Direction.js';
import { PortConstraints } from '../options/PortConstraints.js';
import { PortSide } from '../options/PortSide.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import { SizeOptions } from '../options/SizeOptions.js';
import { ElkUtil } from './ElkUtil.js';

const NODE_SIZE = 100;
const PORT_SIZE = 10;

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

/** A port with a fixed (already decided) side. */
function sidedPort(
  node: ElkNode,
  side: PortSide,
  x: number,
  y: number,
  width = PORT_SIZE,
  height = PORT_SIZE,
): ElkPort {
  const port = portAt(node, x, y, width, height);
  port.setProperty(CoreOptions.PORT_SIDE, side);
  return port;
}

function sizeConstraints(node: ElkNode, ...constraints: SizeConstraint[]): void {
  const set = EnumSet.noneOf(SizeConstraint);
  constraints.forEach((constraint) => set.add(constraint));
  node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, set);
}

function locationOf(shape: ElkShape): [number, number] {
  return [shape.getX(), shape.getY()];
}

describe('ElkUtil.effectiveMinSizeConstraintFor', () => {
  // ElkUtil.java:326-346
  it('returns (0, 0) without the MINIMUM_SIZE constraint', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(50, 60));
    expect(ElkUtil.effectiveMinSizeConstraintFor(node)).toEqual(new KVector(0, 0));
  });

  it('returns a copy of NODE_SIZE_MINIMUM and fills non-positive entries with the defaults 20 (:332-340)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.MINIMUM_SIZE);
    const minimum = new KVector(30, 0);
    node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, minimum);
    const result = ElkUtil.effectiveMinSizeConstraintFor(node);
    expect([result.x, result.y]).toEqual([30, 20]);
    expect(result).not.toBe(minimum);
    expect([minimum.x, minimum.y]).toEqual([30, 0]);
  });

  it('defaults a negative width and a missing height (:333-338)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.MINIMUM_SIZE);
    node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(-5, 7));
    const result = ElkUtil.effectiveMinSizeConstraintFor(node);
    expect([result.x, result.y]).toEqual([20, 7]);
  });

  it('keeps unset minimum entries at 0 without DEFAULT_MINIMUM_SIZE (:332)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.MINIMUM_SIZE);
    node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.noneOf(SizeOptions));
    node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(30, 0));
    const result = ElkUtil.effectiveMinSizeConstraintFor(node);
    expect([result.x, result.y]).toEqual([30, 0]);
  });
});

describe('ElkUtil.resizeNode (5 arguments)', () => {
  // ElkUtil.java:238-318; old size 100x100, new 50x25: ratios 0.5/0.25, diffs -50/-75
  const NEW_WIDTH = 50;
  const NEW_HEIGHT = 25;

  function nodeWithFourPorts(fixed: boolean): { node: ElkNode; ports: ElkPort[] } {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.PORTS);
    if (fixed) {
      node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    }
    const ports = [
      sidedPort(node, PortSide.NORTH, 40, -10),
      sidedPort(node, PortSide.EAST, 100, 40),
      sidedPort(node, PortSide.SOUTH, 60, 100),
      sidedPort(node, PortSide.WEST, -10, 80),
    ];
    return { node, ports };
  }

  it('scales free ports along their side and shifts the far sides (:263-290)', () => {
    const { node, ports } = nodeWithFourPorts(false);
    const ratios = ElkUtil.resizeNode(node, NEW_WIDTH, NEW_HEIGHT, true, true);
    expect([ratios.x, ratios.y]).toEqual([0.5, 0.25]);
    expect([node.getWidth(), node.getHeight()]).toEqual([NEW_WIDTH, NEW_HEIGHT]);
    expect(ports.map(locationOf)).toEqual([
      [20, -10], // north: x * 0.5
      [50, 10], // east: x - 50, y * 0.25
      [30, 25], // south: x * 0.5, y - 75
      [-10, 20], // west: y * 0.25
    ]);
  });

  it('only shifts the far sides for FIXED_POS ports (:264-290)', () => {
    const { node, ports } = nodeWithFourPorts(true);
    ElkUtil.resizeNode(node, NEW_WIDTH, NEW_HEIGHT, true, true);
    expect(ports.map(locationOf)).toEqual([
      [40, -10],
      [50, 40],
      [60, 25],
      [-10, 80],
    ]);
  });

  it('leaves ports alone when movePorts is false (:255)', () => {
    const { node, ports } = nodeWithFourPorts(false);
    ElkUtil.resizeNode(node, NEW_WIDTH, NEW_HEIGHT, false, true);
    expect(ports.map(locationOf)).toEqual([
      [40, -10],
      [100, 40],
      [60, 100],
      [-10, 80],
    ]);
    expect([node.getWidth(), node.getHeight()]).toEqual([NEW_WIDTH, NEW_HEIGHT]);
  });

  it('decides an UNDEFINED port side from the old size and stores it (:258-262)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    const port = portAt(node, -5, 45);
    ElkUtil.resizeNode(node, NEW_WIDTH, NEW_HEIGHT, true, true);
    expect(port.getProperty(CoreOptions.PORT_SIDE)).toBe(PortSide.WEST);
    expect(locationOf(port)).toEqual([-5, 11.25]); // west: y * 0.25
  });

  it('uses the parent layout direction for a nested node and its own for a root (:251-253)', () => {
    // port (95,-3) 10x6: DOWN -> NORTH (y < 0), RIGHT -> EAST (95 + 10 > 100)
    const parent = sizedNode(NODE_SIZE * 3, NODE_SIZE * 3);
    parent.setProperty(CoreOptions.DIRECTION, Direction.DOWN);
    const child = sizedNode(NODE_SIZE, NODE_SIZE, parent);
    child.setProperty(CoreOptions.DIRECTION, Direction.RIGHT);
    const nested = portAt(child, 95, -3, PORT_SIZE, 6);
    ElkUtil.resizeNode(child, NEW_WIDTH, NEW_HEIGHT, true, false);
    expect(nested.getProperty(CoreOptions.PORT_SIDE)).toBe(PortSide.NORTH);

    const root = sizedNode(NODE_SIZE, NODE_SIZE);
    root.setProperty(CoreOptions.DIRECTION, Direction.RIGHT);
    const rooted = portAt(root, 95, -3, PORT_SIZE, 6);
    ElkUtil.resizeNode(root, NEW_WIDTH, NEW_HEIGHT, true, false);
    expect(rooted.getProperty(CoreOptions.PORT_SIDE)).toBe(PortSide.EAST);
  });

  it('keeps the minimum size when it exceeds the requested one and returns the ratios (:243-246)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.MINIMUM_SIZE);
    node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(80, 10));
    const ratios = ElkUtil.resizeNode(node, NEW_WIDTH, NEW_HEIGHT, true, true);
    expect([node.getWidth(), node.getHeight()]).toEqual([80, 25]);
    expect([ratios.x, ratios.y]).toEqual([0.8, 0.25]);
  });

  it('sets fixed size constraints afterwards (:314-316)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.PORTS, SizeConstraint.NODE_LABELS);
    ElkUtil.resizeNode(node, NEW_WIDTH, NEW_HEIGHT, true, true);
    expect(node.getProperty(CoreOptions.NODE_SIZE_CONSTRAINTS).isEmpty()).toBe(true);
  });

  describe('label movement (old 100x100, new 200x300: ratios 2/3, diffs 100/200)', () => {
    function labelAt(node: ElkNode, x: number, y: number, size: number): ElkShape {
      const label = ElkGraphUtil.createLabel(node);
      label.setLocation(x, y);
      label.setDimensions(size, size);
      return label;
    }

    it.each([
      // [x, y, size, expected x, expected y, reason]
      [90, 40, 20, 190, 140, 'right: x + 100, y + 200 * 0.5 (:296-299)'],
      [40, 90, 20, 90, 290, 'bottom: x + 100 * 0.5, y + 200 (:300-303)'],
      [0, 0, 20, 0, 0, 'top-left: sum < 1 (:294)'],
      [50, 50, 100, 50, 50, 'diagonal: difference 0 (:295-303)'],
      [290, -20, 20, 290, -20, 'right but midy < 0 (:295)'],
    ])('moves the label at (%d, %d) size %d to (%d, %d): %s', (x, y, size, expectedX, expectedY) => {
      const node = sizedNode(NODE_SIZE, NODE_SIZE);
      const label = labelAt(node, x, y, size);
      ElkUtil.resizeNode(node, 200, 300, true, true);
      expect(locationOf(label)).toEqual([expectedX, expectedY]);
    });

    it('keeps labels when moveLabels is false (:288)', () => {
      const node = sizedNode(NODE_SIZE, NODE_SIZE);
      const label = labelAt(node, 90, 40, 20);
      ElkUtil.resizeNode(node, 200, 300, true, false);
      expect(locationOf(label)).toEqual([90, 40]);
    });
  });
});

describe('ElkUtil.resizeNode (node only)', () => {
  // ElkUtil.java:190-236
  it('returns null for empty size constraints (:191-193)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    expect(ElkUtil.resizeNode(node)).toBeNull();
    expect([node.getWidth(), node.getHeight()]).toEqual([NODE_SIZE, NODE_SIZE]);
  });

  it('resizes to 0x0 when PORTS is not among the constraints (:196, :235)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.NODE_LABELS);
    const ratios = ElkUtil.resizeNode(node);
    expect([ratios?.x, ratios?.y]).toEqual([0, 0]);
    expect([node.getWidth(), node.getHeight()]).toEqual([0, 0]);
  });

  it('adds width + 2 per port to the 2-point minimum on every side (:225-232, :211-213)', () => {
    // north 2 + 12 = 14, east 2 + 10 = 12, south 2 + 32 = 34, west 2 + 22 = 24 -> 34 x 24
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.PORTS);
    sidedPort(node, PortSide.NORTH, 0, 0, 10, 99);
    sidedPort(node, PortSide.EAST, 0, 0, 99, 8);
    sidedPort(node, PortSide.SOUTH, 0, 0, 30, 99);
    sidedPort(node, PortSide.WEST, 0, 0, 99, 20);
    const ratios = ElkUtil.resizeNode(node);
    expect([node.getWidth(), node.getHeight()]).toEqual([34, 24]);
    expect(ratios?.x).toBeCloseTo(0.34, 12);
    expect(ratios?.y).toBeCloseTo(0.24, 12);
  });

  it('takes the maximum port extent for FIXED_POS (:208-218)', () => {
    // north x + w = 16, east y + h = 40, south x + w = 7, west y + h = 4 -> 16 x 40
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.PORTS);
    node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    sidedPort(node, PortSide.NORTH, 10, 0, 6, 6);
    sidedPort(node, PortSide.EAST, 0, 30, 10, 10);
    sidedPort(node, PortSide.SOUTH, 3, 0, 4, 4);
    sidedPort(node, PortSide.WEST, 0, 2, 2, 2);
    const ratios = ElkUtil.resizeNode(node);
    expect([node.getWidth(), node.getHeight()]).toEqual([16, 40]);
    expect(ratios?.x).toBeCloseTo(0.16, 12);
    expect(ratios?.y).toBeCloseTo(0.4, 12);
  });

  it('decides and stores undefined port sides (:204-208)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    sizeConstraints(node, SizeConstraint.PORTS);
    const port = portAt(node, -5, 45);
    ElkUtil.resizeNode(node);
    expect(port.getProperty(CoreOptions.PORT_SIDE)).toBe(PortSide.WEST);
  });
});

describe('ElkUtil.applyConfiguredNodeScaling', () => {
  // ElkUtil.java:359-378
  it('does nothing for the scale factor 1 (:361-363)', () => {
    const node = sizedNode(10, 20);
    const port = portAt(node, 5, 6, 7, 8);
    ElkUtil.applyConfiguredNodeScaling(node);
    expect([node.getWidth(), node.getHeight()]).toEqual([10, 20]);
    expect([port.getX(), port.getY(), port.getWidth(), port.getHeight()]).toEqual([5, 6, 7, 8]);
  });

  it('scales the node size, labels, ports, port labels and port anchors (:365-377)', () => {
    const node = sizedNode(10, 20);
    node.setLocation(7, 9);
    node.setProperty(CoreOptions.SCALE_FACTOR, 2);
    const label = ElkGraphUtil.createLabel(node);
    label.setLocation(1, 2);
    label.setDimensions(3, 4);
    const port = portAt(node, 5, 6, 7, 8);
    port.setProperty(CoreOptions.PORT_ANCHOR, new KVector(1, 3));
    const portLabel = ElkGraphUtil.createLabel(port);
    portLabel.setLocation(1, 1);
    portLabel.setDimensions(2, 2);

    ElkUtil.applyConfiguredNodeScaling(node);

    expect([node.getX(), node.getY(), node.getWidth(), node.getHeight()]).toEqual([7, 9, 20, 40]);
    expect([label.getX(), label.getY(), label.getWidth(), label.getHeight()]).toEqual([2, 4, 6, 8]);
    expect([port.getX(), port.getY(), port.getWidth(), port.getHeight()]).toEqual([10, 12, 14, 16]);
    expect([portLabel.getX(), portLabel.getY(), portLabel.getWidth(), portLabel.getHeight()]).toEqual([2, 2, 4, 4]);
    const anchor = port.getProperty(CoreOptions.PORT_ANCHOR);
    expect([anchor.x, anchor.y]).toEqual([2, 6]);
  });
});

describe('ElkUtil.computeChildAreaDimensions', () => {
  // registers the property cloners (ElkReflect) that reading the default MARGINS needs, as Java's service does
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  // ElkUtil.java:386-448
  it('is -Infinity wide and high for a node without content (:389-392, :446-447)', () => {
    const node = sizedNode(NODE_SIZE, NODE_SIZE);
    ElkUtil.computeChildAreaDimensions(node);
    expect(node.getProperty(CoreOptions.CHILD_AREA_WIDTH)).toBe(-Infinity);
    expect(node.getProperty(CoreOptions.CHILD_AREA_HEIGHT)).toBe(-Infinity);
  });

  it('spans labels with margins, children, edge labels, edge sections and bend points (:395-445)', () => {
    const parent = sizedNode(NODE_SIZE, NODE_SIZE);
    const nodeLabel = ElkGraphUtil.createLabel(parent);
    nodeLabel.setLocation(10, 10);
    nodeLabel.setDimensions(10, 5);
    const c1 = sizedNode(20, 10, parent);
    c1.setLocation(30, 40);
    c1.setProperty(CoreOptions.MARGINS, new ElkMargin(1, 2, 3, 4)); // top, right, bottom, left
    const c2 = sizedNode(5, 5, parent);
    const edge: ElkEdge = ElkGraphUtil.createSimpleEdge(c1, c2);
    const edgeLabel = ElkGraphUtil.createLabel(edge);
    edgeLabel.setLocation(-5, 60);
    edgeLabel.setDimensions(4, 4);
    const section = ElkGraphUtil.createEdgeSection(edge);
    section.setStartLocation(-10, 20);
    section.setEndLocation(60, 70);
    ElkGraphUtil.createBendPoint(section, 30, -3);

    ElkUtil.computeChildAreaDimensions(parent);

    // x: min(-10 section start) .. max(60 section end); y: min(-3 bend point) .. max(70 section end)
    expect(parent.getProperty(CoreOptions.CHILD_AREA_WIDTH)).toBe(70);
    expect(parent.getProperty(CoreOptions.CHILD_AREA_HEIGHT)).toBe(73);
  });

  it('applies the margins of a shape to the bounds (:397-410)', () => {
    const parent = sizedNode(NODE_SIZE, NODE_SIZE);
    const child = sizedNode(20, 10, parent);
    child.setLocation(30, 40);
    child.setProperty(CoreOptions.MARGINS, new ElkMargin(1, 2, 3, 4));
    ElkUtil.computeChildAreaDimensions(parent);
    // x: 26 .. 52 (30 - 4, 30 + 20 + 2); y: 39 .. 53 (40 - 1, 40 + 10 + 3); maxX/maxY start at 0.0
    expect(parent.getProperty(CoreOptions.CHILD_AREA_WIDTH)).toBe(26);
    expect(parent.getProperty(CoreOptions.CHILD_AREA_HEIGHT)).toBe(14);
  });
});
