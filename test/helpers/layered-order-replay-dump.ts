// SPDX-License-Identifier: EPL-2.0
// The order dump of mission 7c (C3): the 7b phase dump plus `ports`, the port list of every node in list order. Node
// and port paths are the 7a positional paths remembered at import (`new/n<k>`, `new/p<k>` for elements first met
// later); `phaseDump` has already named every node and port when this runs, so the names are read back from the
// graph's context. Order of traversal: layerless nodes, nodes of the layers in layer order, hidden nodes, then nodes
// of the import the graph no longer reaches. `edges` also lists the baseline edges the port traversal no longer meets
// (detached by a processor, `src`/`tgt` null; recorder header "baseline edges not met"), after the reachable ones.
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import type { LGraphDump } from './layered-framework-replay.js';
import { contextOf, phaseDump, type EdgeExpected } from './layered-phase-replay-dump.js';
import type { OrderExpected } from './layered-order-replay-rows.js';

/** The `ports` member: every node's ports in list order, keyed by node path. */
function portsOf(graph: LGraph, nodePaths: readonly string[]): Record<string, string[]> {
  const ctx = contextOf(graph);
  const ports: Record<string, string[]> = {};
  const add = (path: string, node: LNode): void => {
    ports[path] = node.getPorts().map((port) => ctx.pathOf(port));
  };
  for (const path of nodePaths) {
    add(path, ctx.get(path) as LNode);
  }
  for (const [element, path] of ctx.paths) {
    if (element instanceof LNode && !(path in ports)) {
      add(path, element);
    }
  }
  return ports;
}

/** The baseline edges `phaseDump` did not meet through a port (a same-side self loop NSP detached), by path. */
function edgesNotMet(graph: LGraph, met: readonly EdgeExpected[]): EdgeExpected[] {
  const ctx = contextOf(graph);
  const metPaths = new Set(met.map((edge) => edge.path));
  const port = (p: object | null): string | null => (p === null ? null : ctx.pathOf(p));
  const notMet: EdgeExpected[] = [];
  for (const [element, path] of ctx.paths) {
    if (element instanceof LEdge && !metPaths.has(path)) {
      notMet.push({
        path,
        src: port(element.getSource()),
        tgt: port(element.getTarget()),
        reversed: element.getProperty(InternalProperties.REVERSED),
      });
    }
  }
  return notMet;
}

/** The B2 dump of the graph's current state plus the port order of every node. */
export function orderDump(graph: LGraph, importDump: LGraphDump): OrderExpected {
  const dump = phaseDump(graph, importDump);
  const nodePaths = [...dump.layerless, ...dump.layers.flat(), ...dump.hidden];
  return {
    ...dump,
    edges: [...dump.edges, ...edgesNotMet(graph, dump.edges)],
    ports: portsOf(graph, [...new Set(nodePaths)]),
  };
}
