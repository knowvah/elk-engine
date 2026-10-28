// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../src/core/options/PortSide.js';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import type { LPort } from '../../src/alg/layered/graph/LPort.js';
import { addNode, addPort, connect } from './lgraph-builders.js';

/** The kinds of port in the scenario: connected by an incoming edge, an outgoing edge, both, or neither. */
export type PortKind = 'in' | 'out' | 'both' | 'none';

export const SCENARIO_SIDES: readonly PortSide[] = [
  PortSide.UNDEFINED,
  PortSide.NORTH,
  PortSide.EAST,
  PortSide.SOUTH,
  PortSide.WEST,
];
export const SCENARIO_KINDS: readonly PortKind[] = ['in', 'out', 'both', 'none'];

/**
 * The scenario of the oracle site rows `site/lnode/getPorts` and `site/lnode/edgeIterables` (recorder steps 0-129): node
 * n (40x40) has one port per side (UNDEFINED, NORTH, EAST, SOUTH, WEST, in this order) and kind, named
 * `p.<side>.<kind>`; the edges come from `farOut` and go to `farIn`, ports of the node `far`, and are named
 * `e.<side>.in.in`, `e.<side>.out.out`, `e.<side>.both.in` and `e.<side>.both.out`.
 */
export interface PortsScenario {
  readonly graph: LGraph;
  readonly n: LNode;
  readonly far: LNode;
  /** port by name `p.<side>.<kind>` (side in lower case) */
  readonly ports: ReadonlyMap<string, LPort>;
  readonly edges: ReadonlyMap<string, LEdge>;
  /** name of a port or edge of the scenario */
  readonly nameOf: (element: LPort | LEdge) => string;
}

export function portName(side: PortSide, kind: PortKind): string {
  return `p.${side.name().toLowerCase()}.${kind}`;
}

export function portsScenario(): PortsScenario {
  const graph = new LGraph();
  const n = addNode(graph);
  n.getSize().x = 40;
  n.getSize().y = 40;
  const far = addNode(graph);
  const farOut = addPort(far);
  const farIn = addPort(far);
  const ports = new Map<string, LPort>();
  const edges = new Map<string, LEdge>();
  for (const side of SCENARIO_SIDES) {
    for (const kind of SCENARIO_KINDS) {
      const port = addPort(n, side);
      const base = side.name().toLowerCase();
      ports.set(portName(side, kind), port);
      if (kind === 'in' || kind === 'both') {
        edges.set(`e.${base}.${kind}.in`, connect(farOut, port));
      }
      if (kind === 'out' || kind === 'both') {
        edges.set(`e.${base}.${kind}.out`, connect(port, farIn));
      }
    }
  }
  const names = new Map<LPort | LEdge, string>();
  for (const [name, element] of [...ports, ...edges]) {
    names.set(element, name);
  }
  return { graph, n, far, ports, edges, nameOf: (e) => names.get(e) ?? '?' };
}
