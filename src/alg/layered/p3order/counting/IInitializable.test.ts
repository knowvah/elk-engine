// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LEdge } from '../../graph/LEdge.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { init } from './IInitializable.js';
import type { IInitializable } from './IInitializable.js';

/** Two layers, `a` east port to `b` west port by one edge; `c` alone below `a`, without ports. */
function twoLayers(): { order: LNode[][]; a: LNode; b: LNode; c: LNode; edge: LEdge } {
  const graph = new LGraph();
  const left = addLayer(graph);
  const right = addLayer(graph);
  const a = addNode(graph);
  const c = addNode(graph);
  const b = addNode(graph);
  a.setLayer(left);
  c.setLayer(left);
  b.setLayer(right);
  const edge = connect(addPort(a, PortSide.EAST), addPort(b, PortSide.WEST));
  return { order: [[a, c], [b]], a, b, c, edge };
}

/** Logs every hook as `name:args`, `edge` by the connected edge's identity index. */
function recorder(log: string[], tag: string, edge: LEdge): IInitializable {
  return {
    initAtLayerLevel: (l) => log.push(`${tag} layer ${l}`),
    initAtNodeLevel: (l, n) => log.push(`${tag} node ${l},${n}`),
    initAtPortLevel: (l, n, p) => log.push(`${tag} port ${l},${n},${p}`),
    initAtEdgeLevel: (l, n, p, e, ed) => log.push(`${tag} edge ${l},${n},${p},${e},${ed === edge}`),
    initAfterTraversal: () => log.push(`${tag} done`),
  };
}

describe('IInitializable.init', () => {
  // IInitializable.java:54 calls `i.initAtEdgeLevel(l, n, p, e++, edge, order)` inside the loop over the initializables,
  // so `e` advances once per initializable: the first sees 0, the second 1 (a Java quirk, kept).
  it('traverses layers, nodes, ports and edges in input order, every initializable at each level', () => {
    const { order, edge } = twoLayers();
    const log: string[] = [];
    init([recorder(log, 'x', edge), recorder(log, 'y', edge)], order);
    expect(log).toEqual([
      'x layer 0',
      'y layer 0',
      'x node 0,0',
      'y node 0,0',
      'x port 0,0,0',
      'y port 0,0,0',
      'x edge 0,0,0,0,true',
      'y edge 0,0,0,1,true',
      'x node 0,1',
      'y node 0,1',
      'x layer 1',
      'y layer 1',
      'x node 1,0',
      'y node 1,0',
      'x port 1,0,0',
      'y port 1,0,0',
      'x edge 1,0,0,0,true',
      'y edge 1,0,0,1,true',
      'x done',
      'y done',
    ]);
  });

  it('treats a missing hook as the Java default no-op and still finishes the traversal', () => {
    const { order } = twoLayers();
    const log: string[] = [];
    init([{ initAfterTraversal: () => log.push('done') }], order);
    expect(log).toEqual(['done']);
  });

  it('only finishes for an empty order', () => {
    const log: string[] = [];
    init([{ initAfterTraversal: () => log.push('done'), initAtLayerLevel: () => log.push('layer') }], []);
    expect(log).toEqual(['done']);
  });
});
