// SPDX-License-Identifier: EPL-2.0
// Structural proof of SplineSegment and the router's nested types (mission 7e, T6). The geometry the constructors
// compute (`centerControlPointY`, the hyperedge y positions, `xDelta`, the segment boxes) is proven by the `P5/SPLINES`
// rows T8 replays, so no geometry literal is asserted here: every expectation below is what the Java text states (which
// ports land left or right, which flags follow which port side, what a constructor stores) or a twin comparison with
// the port's own anchor.
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { Pair } from '../../../../core/util/Pair.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { LEdge } from '../../graph/LEdge.js';
import { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { SplineEdgeRouterDependency } from './SplineEdgeRouterDependency.js';
import { SplineEdgeRouterSideToProcess as SideToProcess } from './SplineEdgeRouterSideToProcess.js';
import { isNormalNode, isStraight, SplineSegment } from './SplineSegment.js';
import { SplineSegmentEdgeInformation } from './SplineSegmentEdgeInformation.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const NODE_GAP = 100;
const PORT_STEP = 20;

/** A node at (x, y) with one port on `side` per entry of `portYs` (the port's y relative to the node). */
function nodeWithPorts(x: number, y: number, side: PortSide, portYs: readonly number[]): [LNode, LPort[]] {
  const node = new LNode(null);
  node.getPosition().set(x, y);
  node.getSize().set(PORT_STEP, NODE_GAP);
  const ports = portYs.map((portY) => {
    const port = new LPort();
    port.setNode(node);
    port.setSide(side);
    port.getPosition().set(0, portY);
    return port;
  });
  return [node, ports];
}

function edgeBetween(source: LPort, target: LPort): LEdge {
  const edge = new LEdge();
  edge.setSource(source);
  edge.setTarget(target);
  return edge;
}

/** One east port on the left and two west ports on the right, joined by two edges: a 1:2 hyperedge. */
function hyperEdgeParts(): { source: LPort; targets: LPort[]; edges: LEdge[] } {
  const [, [source]] = nodeWithPorts(0, 0, PortSide.EAST, [40]) as [LNode, [LPort]];
  const [, targets] = nodeWithPorts(NODE_GAP, 0, PortSide.WEST, [10, 70]);
  return { source, targets, edges: targets.map((target) => edgeBetween(source, target)) };
}

describe('SplineEdgeRouterSideToProcess', () => {
  it('lists LEFT then RIGHT and resolves names like Enum.valueOf', () => {
    expect(SideToProcess.values().map((side) => side.name())).toEqual(['LEFT', 'RIGHT']);
    expect([SideToProcess.LEFT.ordinal(), SideToProcess.RIGHT.ordinal()]).toEqual([0, 1]);
    expect(String(SideToProcess.RIGHT)).toBe('RIGHT');
    expect(SideToProcess.valueOf('LEFT')).toBe(SideToProcess.LEFT);
    expect(() => SideToProcess.valueOf('UP')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.p5edges.splines.SplineEdgeRouter.SideToProcess.UP',
      ),
    );
  });
});

describe('SplineSegmentEdgeInformation', () => {
  it('holds the two y positions and the four flags, all zero or false at first', () => {
    expect({ ...new SplineSegmentEdgeInformation() }).toEqual({
      startY: 0,
      endY: 0,
      normalSourceNode: false,
      normalTargetNode: false,
      invertedLeft: false,
      invertedRight: false,
    });
  });
});

describe('SplineSegment fields', () => {
  it('starts with the Java initializers', () => {
    const { edges } = hyperEdgeParts();
    const segment = new SplineSegment(edges[0]!, SideToProcess.LEFT, SideToProcess.RIGHT);
    expect(segment.handled).toBe(false);
    expect([segment.mark, segment.inweight, segment.outweight, segment.rank]).toEqual([0, 0, 0, 0]);
    expect([segment.isWestOfInitialLayer, segment.initialSegment, segment.lastSegment, segment.inverseOrder]).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect([segment.sourcePort, segment.targetPort, segment.sourceNode, segment.targetNode]).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(segment.xDelta).toBe(0);
    expect([segment.outgoing, segment.incoming]).toEqual([[], []]);
    expect(segment.boundingBox).toBeInstanceOf(ElkRectangle);
    expect([segment.boundingBox.x, segment.boundingBox.width]).toEqual([0, 0]);
  });

  it('orders by mark like the Java int subtraction', () => {
    const { edges } = hyperEdgeParts();
    const marks = [5, -2, 9, 0];
    const segments = marks.map((mark) => {
      const segment = new SplineSegment(edges[0]!, SideToProcess.LEFT, SideToProcess.RIGHT);
      segment.mark = mark;
      return segment;
    });
    const [first, second] = segments as [SplineSegment, SplineSegment];
    expect(first.compareTo(second)).toBe(first.mark - second.mark);
    expect(segments.sort((a, b) => a.compareTo(b)).map((segment) => segment.mark)).toEqual(
      [...marks].sort((a, b) => a - b),
    );
  });
});

describe('SplineSegment(LPort, edges, sourceSide)', () => {
  it('puts the single port on the source side and each target on the side of its pair', () => {
    const { source, targets, edges } = hyperEdgeParts();
    const pairs = [new Pair(SideToProcess.RIGHT, edges[0]!), new Pair(SideToProcess.LEFT, edges[1]!)];
    const segment = new SplineSegment(source, new Set(pairs), SideToProcess.LEFT);
    expect([...segment.leftPorts]).toEqual([source, targets[1]]);
    expect([...segment.rightPorts]).toEqual([targets[0]]);
    expect(segment.isStraight).toBe(false);
    expect(segment.isHyperEdge()).toBe(true);
  });

  it('puts the single port right when it is on the right and takes the other end of an edge it is the target of', () => {
    const { source, targets } = hyperEdgeParts();
    const incoming = edgeBetween(targets[0]!, source);
    const segment = new SplineSegment(source, [new Pair(SideToProcess.LEFT, incoming)], SideToProcess.RIGHT);
    expect([...segment.rightPorts]).toEqual([source]);
    expect([...segment.leftPorts]).toEqual([targets[0]]);
    expect(segment.isHyperEdge()).toBe(false);
  });

  it('keeps the edges in the order given and describes each by its ports', () => {
    const { source, targets, edges } = hyperEdgeParts();
    const pairs = edges.map((edge) => new Pair(SideToProcess.RIGHT, edge));
    const segment = new SplineSegment(source, pairs, SideToProcess.LEFT);
    expect([...segment.edges]).toEqual(edges);
    expect([...segment.edgeInformation.keys()]).toEqual(edges);
    edges.forEach((edge, index) => {
      const info = segment.edgeInformation.get(edge)!;
      expect(info.startY).toBe(source.getAbsoluteAnchor().y);
      expect(info.endY).toBe(targets[index]!.getAbsoluteAnchor().y);
    });
  });

  it('boxes the y range from the single port to the targets', () => {
    const { source, targets, edges } = hyperEdgeParts();
    const segment = new SplineSegment(
      source,
      edges.map((edge) => new Pair(SideToProcess.RIGHT, edge)),
      SideToProcess.LEFT,
    );
    const ys = [source, ...targets].map((port) => port.getAbsoluteAnchor().y);
    expect(segment.boundingBox.y).toBe(Math.min(...ys));
    expect(segment.boundingBox.height).toBe(Math.max(...ys) - Math.min(...ys));
  });

  it('boxes the same way when the single port lies below every target', () => {
    const [, [source]] = nodeWithPorts(0, 0, PortSide.EAST, [90]) as [LNode, [LPort]];
    const [, targets] = nodeWithPorts(NODE_GAP, 0, PortSide.WEST, [10, 30]);
    const edges = targets.map((target) => edgeBetween(source, target));
    const segment = new SplineSegment(
      source,
      edges.map((edge) => new Pair(SideToProcess.RIGHT, edge)),
      SideToProcess.LEFT,
    );
    const ys = [source, ...targets].map((port) => port.getAbsoluteAnchor().y);
    expect([segment.boundingBox.y, segment.boundingBox.height]).toEqual([
      Math.min(...ys),
      Math.max(...ys) - Math.min(...ys),
    ]);
  });
});

describe('SplineSegment(LEdge, sourceSide, targetSide)', () => {
  it('puts the source and the target port on the sides given', () => {
    const { source, targets, edges } = hyperEdgeParts();
    const segment = new SplineSegment(edges[0]!, SideToProcess.RIGHT, SideToProcess.LEFT);
    expect([...segment.rightPorts]).toEqual([source]);
    expect([...segment.leftPorts]).toEqual([targets[0]]);
    const flipped = new SplineSegment(edges[0]!, SideToProcess.LEFT, SideToProcess.RIGHT);
    expect([...flipped.leftPorts]).toEqual([source]);
    expect([...flipped.rightPorts]).toEqual([targets[0]]);
    expect(segment.isHyperEdge()).toBe(false);
  });

  it('is straight exactly when isStraight says so of the two anchor y positions', () => {
    const { source, edges } = hyperEdgeParts();
    const [, [level]] = nodeWithPorts(NODE_GAP, 0, PortSide.WEST, [source.getPosition().y]) as [LNode, [LPort]];
    [...edges, edgeBetween(source, level)].forEach((edge) => {
      const segment = new SplineSegment(edge, SideToProcess.RIGHT, SideToProcess.LEFT);
      const { startY, endY } = segment.edgeInformation.get(edge)!;
      expect(segment.isStraight).toBe(isStraight(startY, endY));
    });
  });

  it('records the inverted flags from the port sides and the normal flags from the node types', () => {
    const [sourceNode, [source]] = nodeWithPorts(0, 0, PortSide.WEST, [10]) as [LNode, [LPort]];
    const [targetNode, [target]] = nodeWithPorts(NODE_GAP, 0, PortSide.EAST, [30]) as [LNode, [LPort]];
    targetNode.setType(NodeType.LONG_EDGE);
    const edge = edgeBetween(source, target);
    const segment = new SplineSegment(edge, SideToProcess.RIGHT, SideToProcess.LEFT);
    const info = segment.edgeInformation.get(edge)!;
    expect(info.invertedLeft).toBe(true);
    expect(info.invertedRight).toBe(true);
    expect(info.normalSourceNode).toBe(isNormalNode(sourceNode));
    expect(info.normalTargetNode).toBe(isNormalNode(targetNode));
    expect([info.normalSourceNode, info.normalTargetNode]).toEqual([true, false]);
  });

  it('reads the y of a north or south port from SPLINE_NS_PORT_Y_COORD instead of its anchor', () => {
    const { source } = hyperEdgeParts();
    const [, [north]] = nodeWithPorts(NODE_GAP, 0, PortSide.NORTH, [0]) as [LNode, [LPort]];
    const nsY = 123.5;
    north.setProperty(InternalProperties.SPLINE_NS_PORT_Y_COORD, nsY);
    const edge = edgeBetween(source, north);
    const segment = new SplineSegment(edge, SideToProcess.RIGHT, SideToProcess.LEFT);
    expect(segment.edgeInformation.get(edge)!.endY).toBe(nsY);
    expect(segment.edgeInformation.get(edge)!.startY).toBe(source.getAbsoluteAnchor().y);
  });
});

describe('isNormalNode', () => {
  it('accepts NORMAL and BREAKING_POINT nodes only', () => {
    const accepted = NodeType.values().filter((type) => {
      const node = new LNode(null);
      node.setType(type);
      return isNormalNode(node);
    });
    expect(accepted).toEqual([NodeType.NORMAL, NodeType.BREAKING_POINT]);
  });
});

describe('SplineEdgeRouterDependency', () => {
  it('registers itself as outgoing of its source and incoming of its target', () => {
    const { edges } = hyperEdgeParts();
    const left = new SplineSegment(edges[0]!, SideToProcess.RIGHT, SideToProcess.LEFT);
    const right = new SplineSegment(edges[1]!, SideToProcess.RIGHT, SideToProcess.LEFT);
    const dependency = new SplineEdgeRouterDependency(left, right, 3);
    expect([dependency.source, dependency.target, dependency.weight]).toEqual([left, right, 3]);
    expect(left.outgoing).toEqual([dependency]);
    expect(right.incoming).toEqual([dependency]);
    expect([left.incoming, right.outgoing]).toEqual([[], []]);
  });

  it('prints its weight between the two segments', () => {
    const { edges } = hyperEdgeParts();
    const left = new SplineSegment(edges[0]!, SideToProcess.RIGHT, SideToProcess.LEFT);
    const right = new SplineSegment(edges[1]!, SideToProcess.RIGHT, SideToProcess.LEFT);
    expect(new SplineEdgeRouterDependency(left, right, 7).toString()).toBe(`${String(left)} ->(7) ${String(right)}`);
  });
});
