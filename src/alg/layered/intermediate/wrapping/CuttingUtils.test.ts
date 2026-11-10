// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LEdge } from '../../graph/LEdge.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { CuttingUtils } from './CuttingUtils.js';

interface Fixture {
  readonly graph: LGraph;
  readonly edge: LEdge;
  readonly srcPort: LPort;
  readonly tgtPort: LPort;
  readonly layerCount: number;
  readonly sizesBefore: number[];
}

/** One edge from a node in layer `from` to a node in layer `to`; every layer also holds one bystander node. */
function fixture(layerCount: number, from: number, to: number): Fixture {
  const graph = new LGraph();
  const layers = Array.from({ length: layerCount }, () => addLayer(graph));
  const place = (layerIndex: number): LNode => {
    const n = addNode(graph);
    graph.getLayerlessNodes().pop();
    n.setLayer(layers[layerIndex]!);
    return n;
  };
  for (let l = 0; l < layerCount; l++) place(l);
  const srcPort = addPort(place(from), PortSide.EAST);
  const tgtPort = addPort(place(to), PortSide.WEST);
  const edge = connect(srcPort, tgtPort);
  return { graph, edge, srcPort, tgtPort, layerCount, sizesBefore: layers.map((l) => l.getNodes().length) };
}

function dummiesOf(layerNodes: readonly LNode[]): LNode[] {
  return layerNodes.filter((n) => n.getType() === NodeType.LONG_EDGE);
}

describe('CuttingUtils.insertDummies', () => {
  it('creates one dummy and one edge per layer from the source layer to the target layer', () => {
    const f = fixture(4, 0, 3);
    const created = CuttingUtils.insertDummies(f.graph, f.edge, 1);
    const layers = f.graph.getLayers();
    // Java contract: dummies in L(u)..L(v), i.e. one per layer of the closed interval
    expect(created.length).toBe(f.layerCount);
    layers.forEach((l, i) => expect(l.getNodes().length).toBe(f.sizesBefore[i]! + 1));
    layers.forEach((l) => expect(dummiesOf(l.getNodes()).length).toBe(1));
  });

  it('chains original edge -> dummies -> original target port', () => {
    const f = fixture(3, 0, 2);
    const created = CuttingUtils.insertDummies(f.graph, f.edge, 1);
    const dummies = f.graph.getLayers().map((l) => dummiesOf(l.getNodes())[0]!);
    expect(f.edge.getTarget()!.getNode()).toBe(dummies[0]);
    created.forEach((e, i) => {
      expect(e.getSource()!.getNode()).toBe(dummies[i]);
      expect(e.getSource()!.getSide()).toBe(PortSide.EAST);
      if (i + 1 < created.length) {
        expect(e.getTarget()!.getNode()).toBe(dummies[i + 1]);
        expect(e.getTarget()!.getSide()).toBe(PortSide.WEST);
      }
    });
    expect(created.at(-1)!.getTarget()).toBe(f.tgtPort);
    expect(f.edge.getSource()).toBe(f.srcPort);
  });

  it('marks each dummy: type, origin edge, fixed port positions, long edge source and target', () => {
    const f = fixture(3, 0, 2);
    const created = CuttingUtils.insertDummies(f.graph, f.edge, 1);
    const dummies = f.graph.getLayers().map((l) => dummiesOf(l.getNodes())[0]!);
    const splitEdges = [f.edge, ...created.slice(0, -1)];
    dummies.forEach((d, i) => {
      expect(d.getProperty(InternalProperties.ORIGIN)).toBe(splitEdges[i]);
      expect(d.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_POS);
      // the first dummy takes the original ports, later ones copy from the preceding long edge dummy
      expect(d.getProperty(InternalProperties.LONG_EDGE_SOURCE)).toBe(f.srcPort);
      expect(d.getProperty(InternalProperties.LONG_EDGE_TARGET)).toBe(f.tgtPort);
    });
  });

  it('adds the wrapping spacing to the edge-node spacing of every dummy', () => {
    const f = fixture(2, 0, 1);
    CuttingUtils.insertDummies(f.graph, f.edge, 1);
    const expected =
      f.graph.getProperty(LayeredOptions.SPACING_EDGE_NODE) +
      f.graph.getProperty(LayeredOptions.WRAPPING_ADDITIONAL_EDGE_SPACING);
    for (const l of f.graph.getLayers()) {
      const d = dummiesOf(l.getNodes())[0]!;
      expect(d.getProperty(LayeredOptions.SPACING_INDIVIDUAL).getProperty(LayeredOptions.SPACING_EDGE_NODE)).toBe(
        expected,
      );
    }
  });

  it('inserts the first dummy at size - offset of the source layer, later ones at the end', () => {
    for (const offset of [0, 1]) {
      const f = fixture(3, 0, 2);
      CuttingUtils.insertDummies(f.graph, f.edge, offset);
      const layers = f.graph.getLayers();
      const first = dummiesOf(layers[0]!.getNodes())[0]!;
      expect(layers[0]!.getNodes().indexOf(first)).toBe(f.sizesBefore[0]! - offset);
      for (const l of layers.slice(1)) {
        expect(l.getNodes().at(-1)!.getType()).toBe(NodeType.LONG_EDGE);
      }
    }
  });

  it('sizes dummies by the edge thickness and centres the ports (floor(thickness / 2))', () => {
    const f = fixture(2, 0, 1);
    const thickness = f.edge.getProperty(LayeredOptions.EDGE_THICKNESS);
    CuttingUtils.insertDummies(f.graph, f.edge, 1);
    for (const l of f.graph.getLayers()) {
      const d = dummiesOf(l.getNodes())[0]!;
      expect(d.getSize().y).toBe(thickness);
      for (const p of d.getPorts()) {
        expect(p.getPosition().y).toBe(Math.floor(thickness / 2));
      }
    }
  });

  it('resets a negative thickness of the edge to 0 and stores it back', () => {
    const f = fixture(2, 0, 1);
    f.edge.setProperty(LayeredOptions.EDGE_THICKNESS, -1);
    CuttingUtils.insertDummies(f.graph, f.edge, 1);
    expect(f.edge.getProperty(LayeredOptions.EDGE_THICKNESS)).toBe(0);
    const d = dummiesOf(f.graph.getLayers()[0]!.getNodes())[0]!;
    expect(d.getSize().y).toBe(0);
  });

  it('clears the junction points of the created edges', () => {
    const f = fixture(2, 0, 1);
    f.edge.setProperty(LayeredOptions.JUNCTION_POINTS, new KVectorChain());
    const created = CuttingUtils.insertDummies(f.graph, f.edge, 1);
    // copyProperties carries the junction points over; `setProperty(..., null)` then removes them again
    created.forEach((e) => expect(e.hasProperty(LayeredOptions.JUNCTION_POINTS)).toBe(false));
    expect(f.edge.hasProperty(LayeredOptions.JUNCTION_POINTS)).toBe(true);
  });

  it('creates nothing when the target layer precedes the source layer (empty Java loop)', () => {
    const f = fixture(3, 2, 0);
    const created = CuttingUtils.insertDummies(f.graph, f.edge, 1);
    expect(created).toEqual([]);
    f.graph.getLayers().forEach((l, i) => expect(l.getNodes().length).toBe(f.sizesBefore[i]));
    expect(f.edge.getTarget()).toBe(f.tgtPort);
  });
});
