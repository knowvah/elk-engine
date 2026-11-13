// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Types whose classes are not ported yet (decision C1). A registration whose expression or provider references one of
 * them is held back from the generated registry until the class exists; emptied in mission 5 (T14).
 * Mission 7a held back `LayeredLayoutProvider` from T3 until T7 ported it (L7). Fully qualified;
 * the nested `BoxLayoutProvider.PackingMode` is a different name and is not pending.
 * Mission 8a staged the three tree layout providers (`@staged 8a`) instead of holding them back.
 */
export const PENDING_TYPES: readonly string[] = [];

/**
 * Ported classes that import a generated options class (non-leaf, M12/M16). A bundle-class option whose default
 * expression references one is emitted as cached static getters (its `*_DEFAULT` and its property constant), because
 * entering through that class would otherwise evaluate the default in the class's temporal dead zone. Mission 7a:
 * `NodeFlexibility.getNodeFlexibility` reads `LayeredOptions` (decision journal, T3). Mission 7b: the strategy enums
 * `CycleBreakingStrategy` and `LayeringStrategy` create the phase classes, which read `LayeredOptions` (stop 1).
 * Mission 7c (C5): `CrossingMinimizationStrategy` does the same for the crossing-minimization phases. Mission 7d (N4):
 * `NodePlacementStrategy` does the same for the node placement phases. Mission 8a (T7): `radial.SortingStrategy`
 * creates `IDSorter`, which reads `RadialOptions.ORDER_ID`. Mission 8a (T10): `radial.CompactionStrategy` and
 * `radial.OverlapRemovalStrategy` create the compactors and the overlap removal, which read `RadialOptions`.
 * Mission 8c (T8): `topdownpacking.NodeArrangementStrategy` creates `LeftRightTopDownNodePlacer`, which reads
 * `TopdownpackingOptions`. Mission 8c (T9): `rectpacking.WidthApproximationStrategy` and
 * `rectpacking.WhiteSpaceEliminationStrategy` create the p1 and p3 phases, which read `RectPackingOptions`.
 * Mission 8c (T10): `rectpacking.PackingStrategy` creates the p2 phases, which read `RectPackingOptions`.
 */
export const NON_LEAF_DEFAULT_TYPES: readonly string[] = [
  'org.eclipse.elk.alg.layered.options.CrossingMinimizationStrategy',
  'org.eclipse.elk.alg.layered.options.CycleBreakingStrategy',
  'org.eclipse.elk.alg.layered.options.LayeringStrategy',
  'org.eclipse.elk.alg.layered.options.NodeFlexibility',
  'org.eclipse.elk.alg.layered.options.NodePlacementStrategy',
  'org.eclipse.elk.alg.radial.options.CompactionStrategy',
  'org.eclipse.elk.alg.radial.options.OverlapRemovalStrategy',
  'org.eclipse.elk.alg.radial.options.SortingStrategy',
  'org.eclipse.elk.alg.rectpacking.p1widthapproximation.WidthApproximationStrategy',
  'org.eclipse.elk.alg.rectpacking.p2packing.PackingStrategy',
  'org.eclipse.elk.alg.rectpacking.p3whitespaceelimination.WhiteSpaceEliminationStrategy',
  'org.eclipse.elk.alg.topdownpacking.NodeArrangementStrategy',
];

/** Where the vendored sources and their manifest live. */
export const SOURCES_DIRECTORY = join(import.meta.dirname, 'sources');
const MANIFEST_NAME = 'manifest.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates the manifest shape and maps each `.melk` file name to its upstream path. */
export function parseUpstreamPaths(manifest: unknown): ReadonlyMap<string, string> {
  const files = isRecord(manifest) ? manifest['files'] : undefined;
  if (!Array.isArray(files)) {
    throw new TypeError(`${MANIFEST_NAME} has no 'files' array`);
  }
  const paths = new Map<string, string>();
  for (const entry of files as unknown[]) {
    const name = isRecord(entry) ? entry['name'] : undefined;
    const upstreamPath = isRecord(entry) ? entry['upstreamPath'] : undefined;
    if (typeof name !== 'string' || typeof upstreamPath !== 'string') {
      throw new TypeError(`${MANIFEST_NAME} has a file entry without string 'name' and 'upstreamPath'`);
    }
    paths.set(name, upstreamPath);
  }
  return paths;
}

let cachedPaths: ReadonlyMap<string, string> | undefined;

/** The upstream path of every vendored `.melk` file (relative to the ELK source tree), from the manifest. */
export function loadUpstreamPaths(): ReadonlyMap<string, string> {
  cachedPaths ??= parseUpstreamPaths(JSON.parse(readFileSync(join(SOURCES_DIRECTORY, MANIFEST_NAME), 'utf8')));
  return cachedPaths;
}
