// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import type { LPort } from '../../src/alg/layered/graph/LPort.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { labelAt, nodeAt, portAt } from './lgraph-site-shapes.js';

/**
 * The S2 scenario of the oracle site rows `site/lgraphutil/coordinates/*` (steps 0-73 of the recorder): g0 (padding
 * 5/6/7/8, offset 3/4) holds P, whose nested g1 (padding 10/11/12/13, offset 1/2) holds A, B and Q, whose nested g2
 * (padding 1/2/3/4, offset 5/6) holds C; edges e1 (A to B, bend points, junction points, a label) and e2 (B to C).
 */
export interface CoordinateScenario {
  readonly g0: LGraph;
  readonly g1: LGraph;
  readonly g2: LGraph;
  readonly p: LNode;
  readonly a: LNode;
  readonly b: LNode;
  readonly q: LNode;
  readonly c: LNode;
  readonly ports: { readonly aOut: LPort; readonly bIn: LPort; readonly bOut: LPort; readonly cIn: LPort };
  readonly e1: LEdge;
  readonly e2: LEdge;
}

function nestedGraph(parent: LNode, padding: [number, number, number, number], offset: [number, number]): LGraph {
  const graph = new LGraph();
  graph.setParentNode(parent);
  parent.setNestedGraph(graph);
  graph.getPadding().set(...padding);
  graph.getOffset().x = offset[0];
  graph.getOffset().y = offset[1];
  return graph;
}

function edgeBetween(source: LPort, target: LPort): LEdge {
  const edge = new LEdge();
  edge.setSource(source);
  edge.setTarget(target);
  return edge;
}

function wireEdges(ports: CoordinateScenario['ports']): { e1: LEdge; e2: LEdge } {
  ports.aOut.getAnchor().x = 1;
  ports.aOut.getAnchor().y = 2;
  ports.bIn.getAnchor().x = 3;
  ports.bIn.getAnchor().y = 1;
  const e1 = edgeBetween(ports.aOut, ports.bIn);
  e1.getBendPoints().add(10, 10);
  e1.getBendPoints().add(20, 30);
  e1.setProperty(LayeredOptions.JUNCTION_POINTS, new KVectorChain(new KVector(10, 10), new KVector(15, 20)));
  e1.getLabels().push(labelAt('edge', 11, 12, 5, 5));
  const e2 = edgeBetween(ports.bOut, ports.cIn);
  e2.getBendPoints().add(1, 1);
  e2.getLabels().push(labelAt('second', 2, 3, 4, 4));
  return { e1, e2 };
}

/** Builds the S2 scenario. */
export function coordinateScenario(): CoordinateScenario {
  const g0 = new LGraph();
  g0.getPadding().set(5, 6, 7, 8);
  g0.getOffset().x = 3;
  g0.getOffset().y = 4;
  g0.getSize().x = 300;
  g0.getSize().y = 200;
  const p = nodeAt(g0, 100, 50, 80, 60);
  const g1 = nestedGraph(p, [10, 11, 12, 13], [1, 2]);
  g1.getSize().x = 60;
  g1.getSize().y = 40;
  const a = nodeAt(g1, 5, 6, 20, 10);
  const b = nodeAt(g1, 40, 30, 20, 10);
  const q = nodeAt(g1, 12, 14, 30, 20);
  const g2 = nestedGraph(q, [1, 2, 3, 4], [5, 6]);
  const c = nodeAt(g2, 2, 3, 8, 8);
  const ports = {
    aOut: portAt(a, PortSide.EAST, 20, 3),
    bIn: portAt(b, PortSide.WEST, -4, 3),
    bOut: portAt(b, PortSide.EAST, 20, 3),
    cIn: portAt(c, PortSide.WEST, -4, 2),
  };
  return { g0, g1, g2, p, a, b, q, c, ports, ...wireEdges(ports) };
}
