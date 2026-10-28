// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../src/core/options/PortSide.js';
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { Layer } from '../../src/alg/layered/graph/Layer.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import type { LPort } from '../../src/alg/layered/graph/LPort.js';
import { addLayer } from './lgraph-builders.js';
import { nodeAt, portAt } from './lgraph-site-shapes.js';

/**
 * The scenario of the oracle site rows `site/ledge/*` (recorder steps 0-45): layers L0 (a) and L1 (b, c); every node
 * of size 20x20 (only `endpoints` and `queries` use size 0 nodes, which no assertion depends on) has an output port on
 * the EAST side and an input port on the WEST side: `a.out`, `a.in`, `b.in`, `b.out`, `c.in`, `c.out`.
 */
export interface EdgeScenario {
  readonly graph: LGraph;
  readonly l0: Layer;
  readonly l1: Layer;
  readonly a: LNode;
  readonly b: LNode;
  readonly c: LNode;
  readonly aOut: LPort;
  readonly aIn: LPort;
  readonly bIn: LPort;
  readonly bOut: LPort;
  readonly cIn: LPort;
  readonly cOut: LPort;
}

export function edgeScenario(): EdgeScenario {
  const graph = new LGraph();
  const l0 = addLayer(graph);
  const l1 = addLayer(graph);
  const [a, b, c] = [nodeAt(graph, 0, 0, 20, 20), nodeAt(graph, 0, 0, 20, 20), nodeAt(graph, 0, 0, 20, 20)] as const;
  a.setLayer(l0);
  b.setLayer(l1);
  c.setLayer(l1);
  const out = (node: LNode): LPort => portAt(node, PortSide.EAST, 20, 5, 2, 2);
  const into = (node: LNode): LPort => portAt(node, PortSide.WEST, 0, 5, 2, 2);
  const aOut = out(a);
  const aIn = into(a);
  const bIn = into(b);
  const bOut = out(b);
  const cIn = into(c);
  const cOut = out(c);
  return { graph, l0, l1, a, b, c, aOut, aIn, bIn, bOut, cIn, cOut };
}

/** A new edge from `source` to `target` (each optional, as the recorder's steps set them one by one). */
export function edgeBetween(source: LPort | null, target: LPort | null): LEdge {
  const edge = new LEdge();
  edge.setSource(source);
  edge.setTarget(target);
  return edge;
}
