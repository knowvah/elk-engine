// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Types whose classes are not ported yet (decision C1). A registration whose expression or provider references one of
 * them is held back from the generated registry until the class exists; emptied in mission 5 (T14).
 * Mission 7a holds back `LayeredLayoutProvider` from T3 until T7 ports it (L7). Fully qualified;
 * the nested `BoxLayoutProvider.PackingMode` is a different name and is not pending.
 */
export const PENDING_TYPES: readonly string[] = ['org.eclipse.elk.alg.layered.LayeredLayoutProvider'];

/**
 * Ported classes that import a generated options class (non-leaf, M12/M16). A bundle-class option whose default
 * expression references one is emitted as cached static getters (its `*_DEFAULT` and its property constant), because
 * entering through that class would otherwise evaluate the default in the class's temporal dead zone. Mission 7a:
 * `NodeFlexibility.getNodeFlexibility` reads `LayeredOptions` (decision journal, T3).
 */
export const NON_LEAF_DEFAULT_TYPES: readonly string[] = ['org.eclipse.elk.alg.layered.options.NodeFlexibility'];

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
