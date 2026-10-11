// SPDX-License-Identifier: EPL-2.0
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MODELS_REPO_SLUG = 'eclipse-elk/elk-models';
export const MODELS_DIR_ENV = 'ELK_MODELS_DIR';
export const DEFAULT_MODELS_RELATIVE_PATH = '../../eclipse-elk/elk-models';
const MANIFEST_FILE = 'manifest.json';

export interface GoldenEntry {
  readonly id: string;
  readonly path: string;
  readonly note: string;
}

export interface CorpusManifest {
  readonly repo: typeof MODELS_REPO_SLUG;
  readonly commit: string;
  readonly golden: readonly GoldenEntry[];
}

export type ModelsDirResult = { dir: string } | { skip: string };

export function repoRoot(): string {
  // test/corpus/corpus.ts -> repo root is two levels up.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGoldenEntry(value: unknown): value is GoldenEntry {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['path'] === 'string' &&
    typeof value['note'] === 'string'
  );
}

function isManifest(value: unknown): value is CorpusManifest {
  return (
    isRecord(value) &&
    value['repo'] === MODELS_REPO_SLUG &&
    typeof value['commit'] === 'string' &&
    Array.isArray(value['golden']) &&
    value['golden'].every(isGoldenEntry)
  );
}

export function loadManifest(): CorpusManifest {
  const file = path.join(repoRoot(), 'test', 'corpus', MANIFEST_FILE);
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isManifest(parsed)) {
    throw new Error(`Invalid corpus manifest: ${file}`);
  }
  return parsed;
}

function gitHead(dir: string): string | undefined {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

/** Resolve a specific directory, checking it is at the pinned commit. */
export function resolveModelsDirFrom(dir: string): ModelsDirResult {
  const expected = loadManifest().commit;
  if (!existsSync(dir)) {
    return { skip: `elk-models not found at ${dir}; run test/corpus/fetch.sh (pinned ${expected})` };
  }
  const actual = gitHead(dir);
  if (actual !== expected) {
    return {
      skip: `elk-models at ${dir} is at ${actual ?? 'unknown (not a git repository)'}, expected pinned ${expected}`,
    };
  }
  return { dir };
}

/** Resolve the models dir from `env` (default: process.env). */
export function resolveModelsDir(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ModelsDirResult {
  const override = env[MODELS_DIR_ENV];
  const dir =
    override !== undefined && override !== ''
      ? path.resolve(override)
      : path.resolve(repoRoot(), DEFAULT_MODELS_RELATIVE_PATH);
  return resolveModelsDirFrom(dir);
}
