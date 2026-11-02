// SPDX-License-Identifier: EPL-2.0
// The TS side of the placement sweep (mission 7d, T10, N10, B6): the canonical form of the oracle's
// `PlacementSweep.placementCanonical` (tools/vectors/LayeredPlacementVectors.java): the 7c order form (`edges` and
// `changed` sorted by path, C4 values rewritten, object keys sorted recursively, no whitespace, SHA-256 of the UTF-8
// text) over the placement dump, whose `geometry` hex doubles are already canonical. The replayed dump always carries
// `geometry.ports` and `geometry.labels`; the oracle's row holds them only where N3's presence rule applies, which a
// sweep line announces with `geometryExtras`.
import { c4Free, canonicalHash, sweepRow, type SweepOk, type SweepReplay } from './layered-phase-sweep.js';
import type { PlacementExpected, PlacementGeometry, PlacementRow } from './layered-placement-replay-rows.js';

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
export interface PlacementSweepOk extends SweepOk {
  readonly geometryExtras?: true;
}

const byPath = (a: { readonly path: string }, b: { readonly path: string }): number =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

function withoutExtras(geometry: PlacementGeometry): PlacementGeometry {
  return { nodes: geometry.nodes, layers: geometry.layers };
}

/**
 * The canonical hash of a placement dump: `edges`/`changed` sorted by path, C4 values rewritten, `geometry.ports` and
 * `geometry.labels` kept only when `geometryExtras` (the oracle's row carries them).
 */
export function placementHash(expected: PlacementExpected, geometryExtras = false): string {
  return canonicalHash(
    c4Free({
      ...expected,
      edges: [...expected.edges].sort(byPath),
      changed: [...expected.changed].sort(byPath),
      geometry: geometryExtras ? expected.geometry : withoutExtras(expected.geometry),
    }),
  );
}

/** The pipeline row an ok case replays: the model file inline, the recorded options and prefix. */
export function placementSweepRow(line: SweepReplay, modelsDir: string): PlacementRow {
  const row = sweepRow(line, modelsDir);
  return { ...row, expected: { ...row.expected, ports: {}, geometry: { nodes: {}, layers: [] } } };
}
