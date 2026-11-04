// SPDX-License-Identifier: EPL-2.0
// The TS side of the routing sweep (mission 7e, T12, R11, B6): the canonical form of the oracle's
// `routingCanonical` (tools/vectors/LayeredRoutingSweep.java): the 7d placement form (`edges` and `changed` sorted by
// path, C4 values rewritten, object keys sorted recursively, no whitespace, SHA-256 of the UTF-8 text) over the routing
// dump, whose `geometry` hex doubles (nodes, layers, graph, edges, splines) are already canonical. The replayed dump
// always carries `geometry.ports`, `geometry.labels` and, whenever an edge holds a spline route, `geometry.splines`;
// the oracle's row holds `ports`/`labels` only where N3's presence rule applies (a sweep line announces it with
// `geometryExtras`) and `splines` only at a P5 stop under SPLINES (always, possibly empty).
import { c4Free, canonicalHash, sweepRow, type SweepOk, type SweepReplay } from './layered-phase-sweep.js';
import type { HexPair } from './layered-framework-replay.js';
import {
  P5_EDGE_ROUTING,
  type RoutingExpected,
  type RoutingGeometry,
  type RoutingRow,
} from './layered-routing-replay-rows.js';

export {
  isOk,
  isThrows,
  readSweep,
  STATUS_REFUSED,
  STATUS_TIMEOUT,
  type SweepLine,
  type SweepThrows,
} from './layered-phase-sweep.js';

/** An ok line; `geometryExtras` is set when the oracle's row holds `geometry.ports` and `geometry.labels`. */
export interface RoutingSweepOk extends SweepOk {
  readonly geometryExtras?: true;
}

/** Which optional `geometry` members the oracle's row of a case holds. */
export interface RoutingShape {
  readonly geometryExtras?: boolean;
  readonly splines?: boolean;
}

const SPLINES_STOP = `${P5_EDGE_ROUTING}/SPLINES`;
const ZERO_HEX = '0'.repeat(16);
const ZERO_PAIR: HexPair = [ZERO_HEX, ZERO_HEX];

const byPath = (a: { readonly path: string }, b: { readonly path: string }): number =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

/** The oracle row's optional geometry members: a P5 stop under SPLINES always records `splines` (an empty map if none). */
function shapedGeometry(geometry: RoutingGeometry, shape: RoutingShape): RoutingGeometry {
  const { ports, labels, splines, ...kept } = geometry;
  return {
    ...kept,
    ...(shape.geometryExtras === true ? { ports, labels } : {}),
    ...(shape.splines === true ? { splines: splines ?? {} } : {}),
  };
}

/** The shape of the oracle's row of an ok line: the geometry extras it announces, `splines` at a P5 SPLINES stop. */
export function routingShapeOf(line: RoutingSweepOk): RoutingShape {
  return { geometryExtras: line.geometryExtras === true, splines: line.prefix.at(-1) === SPLINES_STOP };
}

/** The canonical hash of a routing dump: `edges`/`changed` sorted by path, C4 values rewritten, optional members per `shape`. */
export function routingHash(expected: RoutingExpected, shape: RoutingShape = {}): string {
  return canonicalHash(
    c4Free({
      ...expected,
      edges: [...expected.edges].sort(byPath),
      changed: [...expected.changed].sort(byPath),
      geometry: shapedGeometry(expected.geometry, shape),
    }),
  );
}

/** The pipeline row an ok case replays: the model file inline, the recorded options and prefix. */
export function routingSweepRow(line: SweepReplay, modelsDir: string): RoutingRow {
  const row = sweepRow(line, modelsDir);
  return {
    ...row,
    expected: {
      ...row.expected,
      ports: {},
      geometry: { nodes: {}, layers: [], graph: { size: ZERO_PAIR, offset: ZERO_PAIR }, edges: {} },
    },
  };
}
