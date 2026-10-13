// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { MelkFile } from '../../tools/melk/ast.js';
import { resolveAll, type RegistryCall, type ResolvedBundle } from '../../tools/melk/model.js';
import { parseMelk } from '../../tools/melk/parser.js';

export const SOURCES_DIR = join(import.meta.dirname, '../../tools/melk/sources');
export const METADATA_PATH = join(import.meta.dirname, '../golden/refs/java/metadata.json');

/** The 13 vendored `.melk` files (without extension). */
export const MELK_NAMES: readonly string[] = [
  'Core',
  'Disco',
  'Force',
  'Labels',
  'Layered',
  'Polyomino',
  'Radial',
  'RectPacking',
  'SPOrE',
  'Stress',
  'Topdownpacking',
  'Tree',
  'VertiFlex',
];

/** The call kinds the option model produces; algorithm calls belong to the algorithm model. */
export const OPTION_MODEL_CALLS: readonly RegistryCall['call'][] = [
  'registerOption',
  'registerCategory',
  'addDependency',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

let cachedProviders: ReadonlyMap<string, readonly RegistryCall[]> | undefined;

/**
 * The `providers` section of the frozen JVM dump: for each generated class, the calls its `apply` made. The golden is
 * written by `tools/vectors/MetaDataVectors.java` and guarded byte-for-byte by the mission gates, so only its outer
 * shape is checked here.
 */
export function loadDumpProviders(): ReadonlyMap<string, readonly RegistryCall[]> {
  if (cachedProviders === undefined) {
    const parsed: unknown = JSON.parse(readFileSync(METADATA_PATH, 'utf8'));
    const providers = isRecord(parsed) ? parsed['providers'] : undefined;
    if (!isRecord(providers)) {
      throw new TypeError(`${METADATA_PATH} has no 'providers' object`);
    }
    cachedProviders = new Map(
      Object.entries(providers).map(([name, calls]): [string, readonly RegistryCall[]] => {
        if (!Array.isArray(calls)) {
          throw new TypeError(`provider ${name} is not a call list`);
        }
        return [name, calls as RegistryCall[]];
      }),
    );
  }
  return cachedProviders;
}

/** The dump's calls of one generated class, restricted to the given kinds. */
export function dumpCalls(
  bundleClass: string,
  kinds: readonly RegistryCall['call'][] = OPTION_MODEL_CALLS,
): RegistryCall[] {
  const calls = loadDumpProviders().get(bundleClass);
  if (calls === undefined) {
    throw new Error(`the dump has no provider ${bundleClass}`);
  }
  return calls.filter((call) => kinds.includes(call.call));
}

/** The model's calls of one bundle, restricted to the given kinds. */
export function modelCalls(
  bundle: ResolvedBundle,
  kinds: readonly RegistryCall['call'][] = OPTION_MODEL_CALLS,
): RegistryCall[] {
  return bundle.calls.filter((call) => kinds.includes(call.call));
}

export function parseVendored(name: string): MelkFile {
  const fileName = `${name}.melk`;
  return parseMelk(readFileSync(join(SOURCES_DIR, fileName), 'utf8'), fileName);
}

let cachedBundles: readonly ResolvedBundle[] | undefined;

/** All 13 vendored files resolved together (cross-file references need the whole set). */
export function resolveVendored(): readonly ResolvedBundle[] {
  cachedBundles ??= resolveAll(MELK_NAMES.map(parseVendored));
  return cachedBundles;
}

export function vendoredBundle(name: string): ResolvedBundle {
  const bundle = resolveVendored().find((candidate) => candidate.file === `${name}.melk`);
  if (bundle === undefined) {
    throw new Error(`no resolved bundle for ${name}.melk`);
  }
  return bundle;
}

/** The path of the first difference between two JSON-like values, with both sides rendered; null when equal. */
export function firstDifference(actual: unknown, expected: unknown, path: string): string | null {
  if (isDeepStrictEqual(actual, expected)) {
    return null;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    const length = Math.max(actual.length, expected.length);
    for (let i = 0; i < length; i++) {
      const nested = firstDifference(actual[i], expected[i], `${path}[${String(i)}]`);
      if (nested !== null) {
        return nested;
      }
    }
  }
  if (isRecord(actual) && isRecord(expected)) {
    for (const key of new Set([...Object.keys(actual), ...Object.keys(expected)])) {
      const nested = firstDifference(actual[key], expected[key], `${path}.${key}`);
      if (nested !== null) {
        return nested;
      }
    }
  }
  return `${path}: model ${JSON.stringify(actual)} != dump ${JSON.stringify(expected)}`;
}

/** Compares two call lists in order; returns a readable description of the first difference, or null when equal. */
export function diffCalls(actual: readonly RegistryCall[], expected: readonly RegistryCall[]): string | null {
  return firstDifference(actual, expected, 'calls');
}
