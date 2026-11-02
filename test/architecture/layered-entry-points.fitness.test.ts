// SPDX-License-Identifier: EPL-2.0
/**
 * Fitness function (AD-8, decision C5): the layered module graph has an ESM cycle the Java also has (strategy enum
 * -> phase class -> `LayeredOptions` -> provider -> transformer -> importer -> strategy enum). Which module a process
 * enters through decides whether a module-level read hits the temporal dead zone, and a vitest worker has usually
 * evaluated some of the graph already. Each entry point is therefore imported in a fresh Node process and must load
 * without a `ReferenceError`.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const SPAWN_TIMEOUT_MS = 60_000;
const TDZ_PATTERN = /ReferenceError|before initialization/;

/**
 * Entry points, relative to the repo root. Later missions append their strategy enums here as they wire them:
 * 7d `NodePlacementStrategy`, 7e `EdgeRouterFactory`, and so on.
 */
const ENTRY_POINTS: readonly string[] = [
  'src/alg/layered/options/CycleBreakingStrategy.ts',
  'src/alg/layered/options/LayeringStrategy.ts',
  'src/alg/layered/options/CrossingMinimizationStrategy.ts',
  'src/alg/layered/options/LayeredMetaDataProvider.ts',
  'src/alg/layered/options/LayeredOptions.ts',
  'src/alg/layered/intermediate/IntermediateProcessorStrategy.ts',
  'src/alg/layered/LayeredLayoutProvider.ts',
];

/** Imports `entry` in a fresh process; returns its exit status (0 on success) and captured stderr. */
function probe(entry: string): { readonly status: number; readonly stderr: string } {
  const script = `import(${JSON.stringify(join(REPO_ROOT, entry))})`;
  try {
    execFileSync(process.execPath, ['--import', 'tsx', '-e', script], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: SPAWN_TIMEOUT_MS,
    });
    return { status: 0, stderr: '' };
  } catch (error) {
    const failure = error as { status?: number | null; stderr?: Buffer | string };
    return { status: failure.status ?? -1, stderr: String(failure.stderr ?? '') };
  }
}

describe('layered entry points load in a fresh process (C5)', () => {
  it.each(ENTRY_POINTS)(
    '%s',
    (entry) => {
      const result = probe(entry);
      expect(result.stderr).not.toMatch(TDZ_PATTERN);
      expect(result.status).toBe(0);
    },
    SPAWN_TIMEOUT_MS,
  );
});
