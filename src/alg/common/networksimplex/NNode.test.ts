// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { NEdge } from './NEdge.js';
import { NGraph } from './NGraph.js';
import { NNode } from './NNode.js';

const makeNode = (graph: NGraph): NNode => NNode.of().create(graph);

describe('NNode', () => {
  it('has the Java default field values', () => {
    const node = makeNode(new NGraph());
    expect({
      id: node.id,
      internalId: node.internalId,
      origin: node.origin,
      type: node.type,
      layer: node.layer,
      treeNode: node.treeNode,
      unknownCutvalues: node.unknownCutvalues,
      out: node.getOutgoingEdges().size(),
      in: node.getIncomingEdges().size(),
      connected: node.getConnectedEdges(),
    }).toEqual({
      id: 0,
      internalId: 0,
      origin: null,
      type: '',
      layer: 0,
      treeNode: false,
      unknownCutvalues: [],
      out: 0,
      in: 0,
      connected: [],
    });
  });

  it('builder sets id, origin and type and appends the node to the graph', () => {
    const graph = new NGraph();
    const origin = { name: 'o' };
    const node = NNode.of().id(7).origin(origin).type('dummy').create(graph);
    expect(node.id).toBe(7);
    expect(node.origin).toBe(origin);
    expect(node.type).toBe('dummy');
    expect(graph.nodes).toEqual([node]);
  });

  it('getConnectedEdges lists incoming edges first, then outgoing, and refreshes after changes', () => {
    const graph = new NGraph();
    const a = makeNode(graph);
    const b = makeNode(graph);
    const c = makeNode(graph);
    const out1 = NEdge.of().source(b).target(c).create();
    const in1 = NEdge.of().source(a).target(b).create();
    expect(b.getConnectedEdges()).toEqual([in1, out1]);
    // cached list is returned while nothing changed
    expect(b.getConnectedEdges()).toBe(b.getConnectedEdges());
    const in2 = NEdge.of().source(c).target(b).create();
    expect(b.getConnectedEdges()).toEqual([in1, in2, out1]);
  });
});
