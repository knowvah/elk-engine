// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/layered-placement.json (mission 7d, N3): the 7c order row format, whose `expected`
// also carries `geometry`, the coordinates the placement phase and its processors produce. Loading, import and
// replay are the 7b/7c helpers; only `geometry` is new.
import { loadOrderRows, type OrderExpected, type OrderRow } from './layered-order-replay-rows.js';
import type { HexPair, HexQuad } from './layered-framework-replay.js';

/** The phase name of the node placement phase, as a row's `runPhase` step or `prefix` entry spells it. */
export const P4_NODE_PLACEMENT = 'P4_NODE_PLACEMENT';

/** The `expected` member that distinguishes a placement row from an order row. */
export const GEOMETRY_KEY = 'geometry';

/** A node's coordinates: position, size and margin as (top, right, bottom, left), doubles as 16 hex digits. */
export interface NodeGeometry {
  readonly pos: HexPair;
  readonly size: HexPair;
  readonly margin: HexQuad;
}

/** The position of a port or a label. */
export interface PositionGeometry {
  readonly pos: HexPair;
}

/**
 * N3's `geometry`. `nodes` covers every node of the traversal and `layers` the sizes of the root graph's layers in
 * order; `ports` and `labels` are present on a recorded row only where N3's presence rule applies, and always on a
 * replayed dump.
 */
export interface PlacementGeometry {
  readonly nodes: Readonly<Record<string, NodeGeometry>>;
  readonly layers: readonly HexPair[];
  readonly ports?: Readonly<Record<string, PositionGeometry>>;
  readonly labels?: Readonly<Record<string, PositionGeometry>>;
}

/** The order `expected` plus `geometry`. */
export interface PlacementExpected extends OrderExpected {
  readonly geometry: PlacementGeometry;
}

export interface PlacementRow extends OrderRow {
  readonly expected: PlacementExpected;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasGeometry(expected: OrderExpected): expected is PlacementExpected {
  const geometry = (expected as { geometry?: unknown })[GEOMETRY_KEY];
  return isObject(geometry) && isObject(geometry.nodes) && Array.isArray(geometry.layers);
}

/** The rows of a `layered-placement.json` file (cf. `loadOrderRows`); a row without a well-formed `geometry` is rejected. */
export function loadPlacementRows(file: string): PlacementRow[] {
  return loadOrderRows(file).map((row) => {
    if (!hasGeometry(row.expected)) {
      throw new Error(`row ${row.id}: expected.${GEOMETRY_KEY} is missing or has no nodes map and layers list`);
    }
    return row as PlacementRow;
  });
}
