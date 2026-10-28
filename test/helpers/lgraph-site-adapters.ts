// SPDX-License-Identifier: EPL-2.0
import { LabelSide } from '../../src/core/options/LabelSide.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { Layer } from '../../src/alg/layered/graph/Layer.js';
import type { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import type { LPort } from '../../src/alg/layered/graph/LPort.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { addLayer } from './lgraph-builders.js';
import { labelAt, place, portAt } from './lgraph-site-shapes.js';

/**
 * The S10 base scenario of the oracle site rows `site/lgraphAdapters/*` (recorder steps 0-154): layers L0 (A, D) and L1
 * (B, X); A is a compound node with two ports per side and labels; D is a north/south port dummy of A's port pn1;
 * C1 and C2 are the top, C3 the bottom comment nodes of A (layerless, not in a layer).
 */
export interface AdapterScenario {
  readonly g0: LGraph;
  readonly l0: Layer;
  readonly l1: Layer;
  readonly a: LNode;
  readonly d: LNode;
  readonly b: LNode;
  readonly x: LNode;
  readonly c1: LNode;
  readonly c2: LNode;
  readonly c3: LNode;
  /** A's ports by name: pn1, pn2, pe1, pe2, ps1, ps2, pw1, pw2 */
  readonly aPorts: Readonly<Record<'pn1' | 'pn2' | 'pe1' | 'pe2' | 'ps1' | 'ps2' | 'pw1' | 'pw2', LPort>>;
  readonly dIn: LPort;
  readonly dOut: LPort;
  readonly bW: LPort;
  readonly bE: LPort;
  readonly xOut: LPort;
  readonly xIn: LPort;
  readonly edges: { readonly eAB: LEdge; readonly eXD: LEdge; readonly eDX: LEdge; readonly eBA: LEdge };
  readonly aLabel: LLabel;
  readonly eABLabel: LLabel;
  /** the port labels of A by port name */
  readonly portLabels: Readonly<Record<string, LLabel>>;
}

function layeredNode(graph: LGraph, layer: Layer, width: number, height: number): LNode {
  const node = new LNode(graph);
  node.setLayer(layer);
  node.getSize().x = width;
  node.getSize().y = height;
  return node;
}

function compoundNode(
  graph: LGraph,
  layer: Layer,
): { a: LNode; ports: AdapterScenario['aPorts']; labels: Record<string, LLabel> } {
  const a = layeredNode(graph, layer, 60, 40);
  a.getMargin().set(1, 2, 3, 4);
  a.getPadding().set(5, 6, 7, 8);
  a.setProperty(InternalProperties.COMPOUND_NODE, true);
  a.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
  const spec: [string, PortSide, number, number][] = [
    ['pn1', PortSide.NORTH, 10, -8],
    ['pn2', PortSide.NORTH, 30, -8],
    ['pe1', PortSide.EAST, 60, 10],
    ['pe2', PortSide.EAST, 60, 25],
    ['ps1', PortSide.SOUTH, 45, 40],
    ['ps2', PortSide.SOUTH, 15, 40],
    ['pw1', PortSide.WEST, -8, 30],
    ['pw2', PortSide.WEST, -8, 5],
  ];
  const ports: Record<string, LPort> = {};
  const labels: Record<string, LLabel> = {};
  spec.forEach(([name, side, x, y], i) => {
    const port = portAt(a, side, x, y, 8, 8);
    const label = labelAt(`port ${name}`, i + 1, 2, 20, 10);
    port.getLabels().push(label);
    ports[name] = port;
    labels[name] = label;
  });
  ports.pw1!.setProperty(InternalProperties.INSIDE_CONNECTIONS, true);
  return { a, ports: ports as AdapterScenario['aPorts'], labels };
}

function dummyOf(graph: LGraph, layer: Layer): { d: LNode; dIn: LPort; dOut: LPort } {
  const d = layeredNode(graph, layer, 2, 2);
  d.setType(NodeType.NORTH_SOUTH_PORT);
  return { d, dIn: portAt(d, PortSide.WEST, 0, 0, 2, 2), dOut: portAt(d, PortSide.EAST, 2, 0, 2, 2) };
}

function edge(source: LPort, target: LPort): LEdge {
  const e = new LEdge();
  e.setSource(source);
  e.setTarget(target);
  return e;
}

/** Builds the S10 base scenario. */
export function adapterScenario(): AdapterScenario {
  const g0 = new LGraph();
  const l0 = addLayer(g0);
  const l1 = addLayer(g0);
  const { a, ports, labels } = compoundNode(g0, l0);
  const aLabel = labelAt('node A', 3, 4, 30, 12);
  aLabel.setProperty(LabelSide.LABEL_SIDE, LabelSide.ABOVE);
  a.getLabels().push(aLabel);
  const { d, dIn, dOut } = dummyOf(g0, l0);
  ports.pn1.setProperty(InternalProperties.PORT_DUMMY, d);
  const b = layeredNode(g0, l1, 30, 20);
  const bW = portAt(b, PortSide.WEST, -4, 8, 4, 4);
  const bE = portAt(b, PortSide.EAST, 30, 8, 4, 4);
  const x = layeredNode(g0, l1, 10, 10);
  const xOut = portAt(x, PortSide.EAST, 10, 3, 4, 4);
  const xIn = portAt(x, PortSide.WEST, -4, 3, 4, 4);
  const eAB = edge(ports.pe1, bW);
  const eABLabel = labelAt('edge', 2, 3, 25, 9);
  eABLabel.setProperty(LabelSide.LABEL_SIDE, LabelSide.BELOW);
  eAB.getLabels().push(eABLabel);
  const edges = { eAB, eXD: edge(xOut, dIn), eDX: edge(dOut, xIn), eBA: edge(bE, ports.pw1) };
  const [c1, c2, c3] = [
    place(new LNode(g0), 0, 0, 20, 8),
    place(new LNode(g0), 0, 0, 21, 9),
    place(new LNode(g0), 0, 0, 22, 10),
  ];
  a.setProperty(InternalProperties.TOP_COMMENTS, [c1, c2]);
  a.setProperty(InternalProperties.BOTTOM_COMMENTS, [c3]);
  return {
    g0,
    l0,
    l1,
    a,
    d,
    b,
    x,
    c1,
    c2,
    c3,
    aPorts: ports,
    dIn,
    dOut,
    bW,
    bE,
    xOut,
    xIn,
    edges,
    aLabel,
    eABLabel,
    portLabels: labels,
  };
}

/** The wrapped element of an adapter, read from its `element` field (the recorder reads the same field). */
export function elementOf(adapter: object): unknown {
  return (adapter as { element: unknown }).element;
}

/** The recorder's names of the scenario elements: nodes A, B, X, D, C1-C3; ports pn1..pw2, D.in, B.w, ...; edges; labels. */
export function scenarioNames(s: AdapterScenario): Map<unknown, string> {
  const names = new Map<unknown, string>([
    [s.g0, 'g0'],
    [s.a, 'A'],
    [s.d, 'D'],
    [s.b, 'B'],
    [s.x, 'X'],
    [s.c1, 'C1'],
    [s.c2, 'C2'],
    [s.c3, 'C3'],
    [s.dIn, 'D.in'],
    [s.dOut, 'D.out'],
    [s.bW, 'B.w'],
    [s.bE, 'B.e'],
    [s.xOut, 'X.out'],
    [s.xIn, 'X.in'],
    [s.aLabel, 'A.l'],
    [s.eABLabel, 'eAB.l'],
  ]);
  for (const [name, port] of Object.entries(s.aPorts)) {
    names.set(port, name);
    names.set(s.portLabels[name], `${name}.l`);
  }
  for (const [name, edge] of Object.entries(s.edges)) {
    names.set(edge, name);
  }
  return names;
}

/** The names of the elements wrapped by the given adapters, in order. */
export function namesOf(adapters: Iterable<object>, names: Map<unknown, string>): string[] {
  return [...adapters].map((a) => names.get(elementOf(a)) ?? '?');
}
