// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect, label } from '../../../../test/helpers/lgraph-builders.js';
import { KVector } from '../../../core/math/KVector.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LEdge } from './LEdge.js';
import { LGraph } from './LGraph.js';
import { LGraphElement } from './LGraphElement.js';
import { LLabel } from './LLabel.js';
import type { LPort } from './LPort.js';

/** Nodes A and B (named by label) with one port each, `a` and `b`. */
function fixture(): { graph: LGraph; a: LPort; b: LPort } {
  const graph = new LGraph();
  const nodeA = addNode(graph);
  nodeA.getLabels().push(label('A'));
  const nodeB = addNode(graph);
  nodeB.getLabels().push(label('B'));
  const a = addPort(nodeA);
  a.getLabels().push(label('a'));
  const b = addPort(nodeB);
  b.getLabels().push(label('b'));
  return { graph, a, b };
}

describe('LEdge defaults', () => {
  it('starts unconnected with empty bend points and labels', () => {
    const edge = new LEdge();
    expect(edge).toBeInstanceOf(LGraphElement);
    expect(edge.getSource()).toBeNull();
    expect(edge.getTarget()).toBeNull();
    expect([...edge.getBendPoints()]).toEqual([]);
    expect(edge.getLabels()).toEqual([]);
  });
});

describe('LEdge.setSource / setTarget', () => {
  it('registers the edge on the port lists, in call order', () => {
    const { a, b } = fixture();
    const e1 = connect(a, b);
    const e2 = connect(a, b);
    expect(a.getOutgoingEdges()).toEqual([e1, e2]);
    expect(b.getIncomingEdges()).toEqual([e1, e2]);
    expect(e1.getSource()).toBe(a);
    expect(e1.getTarget()).toBe(b);
  });

  it('removes the edge from the old port when the end changes or is cleared', () => {
    const { graph, a, b } = fixture();
    const c = addPort(addNode(graph));
    const edge = connect(a, b);
    edge.setSource(c);
    expect(a.getOutgoingEdges()).toEqual([]);
    expect(c.getOutgoingEdges()).toEqual([edge]);
    edge.setTarget(c);
    expect(b.getIncomingEdges()).toEqual([]);
    expect(c.getIncomingEdges()).toEqual([edge]);
    edge.setSource(null);
    edge.setTarget(null);
    expect(c.getOutgoingEdges()).toEqual([]);
    expect(c.getIncomingEdges()).toEqual([]);
    expect(edge.getSource()).toBeNull();
    expect(edge.getTarget()).toBeNull();
  });

  it('setTargetAndInsertAtIndex inserts at the given index of the incoming list', () => {
    const { graph, a, b } = fixture();
    const e1 = connect(a, b);
    const e2 = connect(a, b);
    const inserted = new LEdge();
    inserted.setSource(a);
    inserted.setTargetAndInsertAtIndex(b, 1);
    expect(b.getIncomingEdges()).toEqual([e1, inserted, e2]);
    expect(inserted.getTarget()).toBe(b);

    const other = addPort(addNode(graph));
    inserted.setTargetAndInsertAtIndex(other, 0);
    expect(b.getIncomingEdges()).toEqual([e1, e2]);
    expect(other.getIncomingEdges()).toEqual([inserted]);

    inserted.setTargetAndInsertAtIndex(null, 0);
    expect(other.getIncomingEdges()).toEqual([]);
    expect(inserted.getTarget()).toBeNull();
  });

  it('setTargetAndInsertAtIndex rejects an invalid index with Java ArrayList semantics', () => {
    const { a, b } = fixture();
    const edge = connect(a, b);
    expect(() => edge.setTargetAndInsertAtIndex(b, 5)).toThrow(IndexOutOfBoundsException);
    expect(() => edge.setTargetAndInsertAtIndex(b, -1)).toThrow('Index: -1, Size: 0');
  });
});

describe('LEdge.isSelfLoop / isInLayerEdge', () => {
  it('is a self-loop only when both ends exist and share a node', () => {
    const { graph, a, b } = fixture();
    const sibling = addPort(a.getNode()!);
    expect(connect(a, sibling).isSelfLoop()).toBe(true);
    expect(connect(a, b).isSelfLoop()).toBe(false);
    expect(new LEdge().isSelfLoop()).toBe(false);
    const half = new LEdge();
    half.setSource(a);
    expect(half.isSelfLoop()).toBe(false);
    const detached = new LEdge();
    detached.setSource(addPort(addNode(graph)));
    detached.setTarget(sibling);
    expect(detached.isSelfLoop()).toBe(false);
  });

  it('is an in-layer edge when the end nodes share a layer and it is not a self-loop', () => {
    const { graph, a, b } = fixture();
    const first = addLayer(graph);
    const second = addLayer(graph);
    a.getNode()!.setLayer(first);
    b.getNode()!.setLayer(first);
    const edge = connect(a, b);
    expect(edge.isInLayerEdge()).toBe(true);
    b.getNode()!.setLayer(second);
    expect(edge.isInLayerEdge()).toBe(false);
    expect(connect(a, addPort(a.getNode()!)).isInLayerEdge()).toBe(false);
  });

  it('compares layers by identity, so two layerless end nodes count as in-layer', () => {
    const { a, b } = fixture();
    expect(connect(a, b).isInLayerEdge()).toBe(true);
  });
});

describe('LEdge.getOther', () => {
  it('returns the opposite port', () => {
    const { a, b } = fixture();
    const edge = connect(a, b);
    expect(edge.getOther(a)).toBe(b);
    expect(edge.getOther(b)).toBe(a);
  });

  it('returns the opposite node', () => {
    const { a, b } = fixture();
    const edge = connect(a, b);
    expect(edge.getOther(a.getNode()!)).toBe(b.getNode());
    expect(edge.getOther(b.getNode()!)).toBe(a.getNode());
  });

  it('throws IllegalArgumentException with the Java texts for a foreign port or node', () => {
    const { graph, a, b } = fixture();
    const edge = connect(a, b);
    const foreign = addPort(addNode(graph));
    expect(() => edge.getOther(foreign)).toThrow(IllegalArgumentException);
    expect(() => edge.getOther(foreign)).toThrow("'port' must be either the source port or target port of the edge.");
    expect(() => edge.getOther(foreign.getNode()!)).toThrow(IllegalArgumentException);
    expect(() => edge.getOther(foreign.getNode()!)).toThrow(
      "'node' must either be the source node or target node of the edge.",
    );
  });
});

describe('LEdge.reverse', () => {
  it('swaps source and target and updates both port lists', () => {
    const { graph, a, b } = fixture();
    const edge = connect(a, b);
    edge.reverse(graph, false);
    expect(edge.getSource()).toBe(b);
    expect(edge.getTarget()).toBe(a);
    expect(a.getOutgoingEdges()).toEqual([]);
    expect(a.getIncomingEdges()).toEqual([edge]);
    expect(b.getIncomingEdges()).toEqual([]);
    expect(b.getOutgoingEdges()).toEqual([edge]);
  });

  it('toggles REVERSED', () => {
    const { graph, a, b } = fixture();
    const edge = connect(a, b);
    expect(edge.getProperty(InternalProperties.REVERSED)).toBe(false);
    edge.reverse(graph, false);
    expect(edge.getProperty(InternalProperties.REVERSED)).toBe(true);
    edge.reverse(graph, false);
    expect(edge.getProperty(InternalProperties.REVERSED)).toBe(false);
  });

  it('reverses the order of the bend points', () => {
    const { graph, a, b } = fixture();
    const edge = connect(a, b);
    edge.getBendPoints().add(new KVector(1, 10));
    edge.getBendPoints().add(new KVector(2, 20));
    edge.getBendPoints().add(new KVector(3, 30));
    edge.reverse(graph, false);
    expect([...edge.getBendPoints()].map((p) => [p.x, p.y])).toEqual([
      [3, 30],
      [2, 20],
      [1, 10],
    ]);
  });

  it('swaps head and tail label placement and leaves other placements alone', () => {
    const { graph, a, b } = fixture();
    const edge = connect(a, b);
    const placements = [EdgeLabelPlacement.HEAD, EdgeLabelPlacement.TAIL, EdgeLabelPlacement.CENTER];
    for (const placement of placements) {
      const l = new LLabel('x');
      l.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, placement);
      edge.getLabels().push(l);
    }
    edge.reverse(graph, false);
    expect(edge.getLabels().map((l) => l.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT))).toEqual([
      EdgeLabelPlacement.TAIL,
      EdgeLabelPlacement.HEAD,
      EdgeLabelPlacement.CENTER,
    ]);
  });

  it('keeps collector-flagged ports when adaptPorts is false', () => {
    const { graph, a, b } = fixture();
    b.setProperty(InternalProperties.INPUT_COLLECT, true);
    a.setProperty(InternalProperties.OUTPUT_COLLECT, true);
    const edge = connect(a, b);
    edge.reverse(graph, false);
    expect(edge.getSource()).toBe(b);
    expect(edge.getTarget()).toBe(a);
    expect(a.getNode()!.getPorts()).toEqual([a]);
    expect(b.getNode()!.getPorts()).toEqual([b]);
  });

  it('creates collector ports on the old end nodes when adaptPorts is true', () => {
    const { graph, a, b } = fixture();
    b.setProperty(InternalProperties.INPUT_COLLECT, true);
    a.setProperty(InternalProperties.OUTPUT_COLLECT, true);
    const edge = connect(a, b);
    edge.reverse(graph, true);

    const newSource = edge.getSource()!;
    const newTarget = edge.getTarget()!;
    expect(newSource).not.toBe(b);
    expect(newSource.getNode()).toBe(b.getNode());
    expect(newSource.getSide()).toBe(PortSide.EAST);
    expect(newSource.getProperty(InternalProperties.OUTPUT_COLLECT)).toBe(true);
    expect(newTarget).not.toBe(a);
    expect(newTarget.getNode()).toBe(a.getNode());
    expect(newTarget.getSide()).toBe(PortSide.WEST);
    expect(newTarget.getProperty(InternalProperties.INPUT_COLLECT)).toBe(true);
    expect(b.getNode()!.getPorts()).toEqual([b, newSource]);
    expect(a.getNode()!.getPorts()).toEqual([a, newTarget]);
  });

  it('reuses an existing collector port of the needed kind', () => {
    const { graph, a, b } = fixture();
    b.setProperty(InternalProperties.INPUT_COLLECT, true);
    const existing = addPort(b.getNode()!);
    existing.setProperty(InternalProperties.OUTPUT_COLLECT, true);
    const edge = connect(a, b);
    edge.reverse(graph, true);
    expect(edge.getSource()).toBe(existing);
    expect(b.getNode()!.getPorts()).toEqual([b, existing]);
    expect(edge.getTarget()).toBe(a);
  });
});

describe('LEdge naming', () => {
  it('designates itself with the first label text, else the origin identifier, else null', () => {
    const edge = new LEdge();
    expect(edge.getDesignation()).toBeNull();
    edge.getLabels().push(label(''));
    expect(edge.getDesignation()).toBeNull();
    edge.getLabels().length = 0;
    edge.getLabels().push(label('first'), label('second'));
    expect(edge.getDesignation()).toBe('first');
  });

  it('prints e_<designation> and, for a connected edge, the end ports and nodes', () => {
    const { a, b } = fixture();
    const edge = connect(a, b);
    expect(edge.toString()).toBe('e_ a[n_A] -> b[n_B]');
    edge.getLabels().push(label('E'));
    expect(edge.toString()).toBe('e_E a[n_A] -> b[n_B]');
  });

  it('prints only the prefix for an edge missing an end', () => {
    expect(new LEdge().toString()).toBe('e_');
    const { a } = fixture();
    const half = new LEdge();
    half.setSource(a);
    half.getLabels().push(label('E'));
    expect(half.toString()).toBe('e_E');
  });
});
