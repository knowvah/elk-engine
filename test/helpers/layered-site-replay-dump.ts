// SPDX-License-Identifier: EPL-2.0
// The whole-graph dump of the layered site replay: T1's `dumpLGraph` (layered-framework-replay.ts), with the property
// values that dump cannot encode filled in. T1's encoder knows a TS array but not the port's `KVectorChain` (a
// `LinkedList`), so it writes { class: "KVectorChain" } where the recorder writes the list; this module re-encodes
// exactly those values from the live element with the replay's own C4 encoder.
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import { dumpLGraph, type LGraphDump } from './layered-framework-replay.js';
import { assignPaths } from './layered-site-replay-args.js';
import { Ctx } from './layered-site-replay-context.js';

type Obj = Record<string, unknown>;

/** A value T1's encoder gave up on: { class } and nothing else. */
function isUnencoded(value: unknown): boolean {
  const keys = value !== null && typeof value === 'object' ? Object.keys(value) : [];
  return keys.length === 1 && keys[0] === 'class';
}

function liveValue(element: LGraphElement, id: string): unknown {
  for (const [property, value] of element.getAllProperties() as Iterable<[{ getId(): string }, unknown]>) {
    if (property.getId() === id) {
      return value;
    }
  }
  throw new Error(`property ${id} is not set on the dumped element`);
}

function patchProperties(node: Obj, ctx: Ctx, byPath: ReadonlyMap<string, object>): void {
  const element = byPath.get(node.path as string) as LGraphElement | undefined;
  const properties = node.properties as Obj | undefined;
  if (element === undefined || properties === undefined) {
    return;
  }
  for (const [id, value] of Object.entries(properties)) {
    if (isUnencoded(value)) {
      properties[id] = ctx.encode(liveValue(element, id), 0);
    }
  }
}

function patch(node: unknown, ctx: Ctx, byPath: ReadonlyMap<string, object>): void {
  if (Array.isArray(node)) {
    node.forEach((child) => patch(child, ctx, byPath));
  } else if (node !== null && typeof node === 'object') {
    if (typeof (node as Obj).path === 'string') {
      patchProperties(node as Obj, ctx, byPath);
    }
    Object.values(node).forEach((child) => patch(child, ctx, byPath));
  }
}

/** T1's dump of the graph (and its nested graphs) with every property value encoded. */
export function dumpWithPropertyValues(graph: LGraph): LGraphDump {
  const dump = dumpLGraph(graph);
  const paths = assignPaths(graph);
  const ctx = new Ctx({});
  ctx.bindAll(paths);
  patch(dump, ctx, new Map([...paths].map(([element, path]) => [path, element])));
  return dump;
}
