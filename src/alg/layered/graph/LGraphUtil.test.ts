// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect, label } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { Alignment } from '../../../core/options/Alignment.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../core/options/SizeConstraint.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import { LGraph } from './LGraph.js';
import { LGraphUtil } from './LGraphUtil.js';
import type { LNode } from './LNode.js';
import { LPort } from './LPort.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

const EXTENT = 80;

/** A node of the given size with one port per side, each at a different non-zero position, and two labels. */
function fullNode(graph: LGraph): { node: LNode; ports: LPort[] } {
  const node = addNode(graph);
  node.getSize().x = EXTENT;
  node.getSize().y = EXTENT;
  const placements: [PortSide, number, number][] = [
    [PortSide.NORTH, 20, 0],
    [PortSide.EAST, EXTENT, 30],
    [PortSide.SOUTH, 40, EXTENT],
    [PortSide.WEST, 0, 50],
  ];
  const ports = placements.map(([side, x, y]) => {
    const port = addPort(node, side);
    port.getPosition().x = x;
    port.getPosition().y = y;
    return port;
  });
  for (const [x, y] of [
    [EXTENT - 10, 10],
    [10, EXTENT - 10],
    [0, 0],
    [EXTENT / 2, EXTENT / 2],
  ]) {
    const l = label('l');
    l.getPosition().x = x!;
    l.getPosition().y = y!;
    node.getLabels().push(l);
  }
  return { node, ports };
}

function positions(node: LNode): number[][] {
  return [
    ...node.getPorts().map((p) => [p.getPosition().x, p.getPosition().y]),
    ...node.getLabels().map((l) => [l.getPosition().x, l.getPosition().y]),
  ];
}

describe('LGraphUtil array conversions', () => {
  it('copies collections into arrays', () => {
    const graph = new LGraph();
    const a = addNode(graph);
    const pa = addPort(a);
    const pb = addPort(addNode(graph));
    const edge = connect(pa, pb);
    expect(LGraphUtil.toNodeArray(graph.getLayerlessNodes())).toEqual(graph.getLayerlessNodes());
    expect(LGraphUtil.toPortArray(a.getPorts())).toEqual([pa]);
    expect(LGraphUtil.toEdgeArray(pa.getOutgoingEdges())).toEqual([edge]);
  });
});

describe('LGraphUtil.resizeNode', () => {
  it('sets the new size and fixes the size constraints', () => {
    const { node } = fullNode(new LGraph());
    LGraphUtil.resizeNode(node, new KVector(120, 90), false, false);
    expect([node.getSize().x, node.getSize().y]).toEqual([120, 90]);
    expect(node.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS).equals(SizeConstraint.fixed())).toBe(true);
  });

  it('moves neither ports nor labels unless asked to', () => {
    const { node } = fullNode(new LGraph());
    const before = positions(node);
    LGraphUtil.resizeNode(node, new KVector(120, 90), false, false);
    expect(positions(node)).toEqual(before);
  });

  it('leaves ports and labels in place when the size does not change, for fixed and free ports', () => {
    for (const constraints of [PortConstraints.FIXED_POS, PortConstraints.FREE]) {
      const { node } = fullNode(new LGraph());
      node.setProperty(LayeredOptions.PORT_CONSTRAINTS, constraints);
      const before = positions(node);
      LGraphUtil.resizeNode(node, new KVector(EXTENT, EXTENT), true, true);
      expect(positions(node)).toEqual(before);
      expect([node.getSize().x, node.getSize().y]).toEqual([EXTENT, EXTENT]);
    }
  });

  it('moves the east and south ports of a grown node away from the origin side', () => {
    const { node, ports } = fullNode(new LGraph());
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    LGraphUtil.resizeNode(node, new KVector(EXTENT * 2, EXTENT * 2), true, false);
    const [north, east, south, west] = ports as [LPort, LPort, LPort, LPort];
    // fixed positions: north and west ports stay, east moves right, south moves down
    expect([north.getPosition().x, north.getPosition().y]).toEqual([20, 0]);
    expect([west.getPosition().x, west.getPosition().y]).toEqual([0, 50]);
    expect(east.getPosition().x).toBeGreaterThan(EXTENT);
    expect(east.getPosition().y).toBe(30);
    expect(south.getPosition().y).toBeGreaterThan(EXTENT);
    expect(south.getPosition().x).toBe(40);
  });
});

describe('LGraphUtil offsets', () => {
  function graphWithEdge(): { graph: LGraph; node: LNode; edgeLabelPosition: KVector; bend: KVector } {
    const graph = new LGraph();
    const node = addNode(graph);
    node.getPosition().x = 10;
    node.getPosition().y = 20;
    const target = addPort(addNode(graph));
    const edge = connect(addPort(node), target);
    const bend = new KVector(30, 40);
    edge.getBendPoints().add(bend);
    const edgeLabel = label('e');
    edgeLabel.getPosition().x = 5;
    edgeLabel.getPosition().y = 6;
    edge.getLabels().push(edgeLabel);
    return { graph, node, edgeLabelPosition: edgeLabel.getPosition(), bend };
  }

  it('offsetGraph moves nodes, bend points and edge labels, and an inverse offset restores them', () => {
    const { graph, node, edgeLabelPosition, bend } = graphWithEdge();
    LGraphUtil.offsetGraph(graph, 7, 9);
    expect([node.getPosition().x, node.getPosition().y]).not.toEqual([10, 20]);
    expect([bend.x, bend.y]).not.toEqual([30, 40]);
    expect([edgeLabelPosition.x, edgeLabelPosition.y]).not.toEqual([5, 6]);
    LGraphUtil.offsetGraph(graph, -7, -9);
    expect([node.getPosition().x, node.getPosition().y]).toEqual([10, 20]);
    expect([bend.x, bend.y]).toEqual([30, 40]);
    expect([edgeLabelPosition.x, edgeLabelPosition.y]).toEqual([5, 6]);
  });

  it('offsetGraph also moves junction points when the edge has them', () => {
    const { graph, node } = graphWithEdge();
    const edge = node.getPorts()[0]!.getOutgoingEdges()[0]!;
    const junctions = new KVectorChain();
    junctions.add(new KVector(1, 2));
    edge.setProperty(LayeredOptions.JUNCTION_POINTS, junctions);
    LGraphUtil.offsetGraph(graph, 3, 4);
    const moved = [...junctions][0]!;
    expect([moved.x, moved.y]).not.toEqual([1, 2]);
    LGraphUtil.offsetGraph(graph, -3, -4);
    expect([moved.x, moved.y]).toEqual([1, 2]);
  });

  it('offsetGraphs applies the offset to every graph', () => {
    const first = graphWithEdge();
    const second = graphWithEdge();
    LGraphUtil.offsetGraphs([first.graph, second.graph], 7, 9);
    expect([first.node.getPosition().x, first.node.getPosition().y]).not.toEqual([10, 20]);
    expect([second.node.getPosition().x, second.node.getPosition().y]).not.toEqual([10, 20]);
    LGraphUtil.offsetGraphs([first.graph, second.graph], -7, -9);
    expect([first.node.getPosition().x, second.node.getPosition().y]).toEqual([10, 20]);
  });
});

describe('LGraphUtil compound graphs', () => {
  /** root graph holds `outer`; `outer` nests `middleGraph`, holding `middle`, which nests `innerGraph`, holding `inner`. */
  function nested(): { outer: LNode; middle: LNode; inner: LNode; innerGraph: LGraph; rootGraph: LGraph } {
    const rootGraph = new LGraph();
    const outer = addNode(rootGraph);
    const middleGraph = new LGraph();
    middleGraph.setParentNode(outer);
    outer.setNestedGraph(middleGraph);
    const middle = addNode(middleGraph);
    const innerGraph = new LGraph();
    innerGraph.setParentNode(middle);
    middle.setNestedGraph(innerGraph);
    const inner = addNode(innerGraph);
    return { outer, middle, inner, innerGraph, rootGraph };
  }

  it('isDescendant is true for direct and indirect children only', () => {
    const { outer, middle, inner } = nested();
    expect(LGraphUtil.isDescendant(inner, middle)).toBe(true);
    expect(LGraphUtil.isDescendant(inner, outer)).toBe(true);
    expect(LGraphUtil.isDescendant(middle, outer)).toBe(true);
    expect(LGraphUtil.isDescendant(outer, inner)).toBe(false);
    expect(LGraphUtil.isDescendant(middle, inner)).toBe(false);
    expect(LGraphUtil.isDescendant(inner, inner)).toBe(false);
    expect(LGraphUtil.isDescendant(outer, outer)).toBe(false);
  });

  it('changeCoordSystem does nothing for identical graphs', () => {
    const { rootGraph } = nested();
    rootGraph.getOffset().x = 5;
    const point = new KVector(1, 2);
    LGraphUtil.changeCoordSystem(point, rootGraph, rootGraph);
    expect([point.x, point.y]).toEqual([1, 2]);
  });

  it('changeCoordSystem is undone by the converse conversion', () => {
    const { outer, middle, innerGraph, rootGraph } = nested();
    const middleGraph = outer.getNestedGraph()!;
    middleGraph.getPadding().setLeft(3);
    middleGraph.getPadding().setTop(4);
    middleGraph.getOffset().x = 5;
    innerGraph.getPadding().setLeft(6);
    innerGraph.getOffset().y = 7;
    rootGraph.getOffset().x = 8;
    outer.getPosition().x = 100;
    middle.getPosition().y = 200;

    const point = new KVector(1, 2);
    LGraphUtil.changeCoordSystem(point, innerGraph, rootGraph);
    expect([point.x, point.y]).not.toEqual([1, 2]);
    LGraphUtil.changeCoordSystem(point, rootGraph, innerGraph);
    expect([point.x, point.y]).toEqual([1, 2]);

    LGraphUtil.changeCoordSystem(point, innerGraph, middleGraph);
    LGraphUtil.changeCoordSystem(point, middleGraph, innerGraph);
    expect([point.x, point.y]).toEqual([1, 2]);
  });
});

describe('LGraphUtil delegations', () => {
  it('delegates the layer helpers', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const node = addNode(graph);
    node.setLayer(layer);
    node.setProperty(LayeredOptions.ALIGNMENT, Alignment.CENTER);
    node.getPosition().x = 9;
    LGraphUtil.placeNodesHorizontally(layer, 12);
    expect(node.getPosition().x).toBe(12);
    graph.setProperty(LayeredOptions.DIRECTION, Direction.DOWN);
    expect(LGraphUtil.findMaxNonDummyNodeWidth(layer, true)).toBe(0);
  });

  it('delegates computeGraphProperties, getDirection, getMinimalModelOrder, getIndividualOrInherited', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.DIRECTION, Direction.UNDEFINED);
    graph.setProperty(LayeredOptions.ASPECT_RATIO, 0.5);
    const node = addNode(graph);
    node.setProperty(LayeredOptions.COMMENT_BOX, true);
    node.setProperty(InternalProperties.MODEL_ORDER, 4);
    LGraphUtil.computeGraphProperties(graph);
    expect(graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.COMMENTS)).toBe(true);
    expect(LGraphUtil.getDirection(graph)).toBe(Direction.DOWN);
    expect(LGraphUtil.getMinimalModelOrder(graph)).toBe(4);
    graph.setProperty(LayeredOptions.SPACING_NODE_NODE, 13);
    expect(LGraphUtil.getIndividualOrInherited(node, LayeredOptions.SPACING_NODE_NODE)).toBe(13);
  });

  it('delegates the port helpers', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.DIRECTION, Direction.RIGHT);
    const node = addNode(graph);
    node.getSize().x = EXTENT;
    node.getSize().y = EXTENT;

    const created = LGraphUtil.createPort(node, null, PortType.OUTPUT, graph);
    expect(created.getNode()).toBe(node);
    expect(created.getSide()).toBe(PortSide.fromDirection(Direction.RIGHT));

    const probe = addPort(node);
    probe.getPosition().x = 0;
    probe.getPosition().y = EXTENT / 2;
    expect(LGraphUtil.calcPortSide(probe, Direction.RIGHT)).toBe(PortSide.WEST);
    expect(LGraphUtil.calcPortOffset(probe, PortSide.UNDEFINED)).toBe(0);

    const point = new KVector(3, 3);
    LGraphUtil.centerPoint(point, new KVector(), PortSide.NORTH);
    expect([point.x, point.y]).toEqual([0, 0]);

    const collector = LGraphUtil.provideCollectorPort(graph, node, PortType.INPUT, PortSide.WEST)!;
    expect(collector.getProperty(InternalProperties.INPUT_COLLECT)).toBe(true);

    LGraphUtil.initializePort(probe, PortConstraints.FIXED_SIDE, Direction.RIGHT, new KVector(1, 1));
    expect(probe.isExplicitlySuppliedPortAnchor()).toBe(true);
    expect(probe.getSide()).toBe(PortSide.WEST);
  });

  it('delegates the external port helpers', () => {
    const graph = new LGraph();
    const dummy = LGraphUtil.createExternalPortDummy({
      propertyHolder: new LPort(),
      portConstraints: PortConstraints.FIXED_SIDE,
      portSide: PortSide.EAST,
      netFlow: 0,
      portNodeSize: new KVector(1, 1),
      portPosition: new KVector(),
      portSize: new KVector(2, 2),
      layoutDirection: Direction.RIGHT,
      layeredGraph: graph,
    });
    expect(dummy.getProperty(InternalProperties.EXT_PORT_SIDE)).toBe(PortSide.EAST);
    const position = LGraphUtil.getExternalPortPosition(graph, dummy, 2, 2);
    expect(position).not.toBe(dummy.getPosition());
  });
});
