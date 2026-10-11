// SPDX-License-Identifier: EPL-2.0
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface BundleEntry {
  bundle: string;
  requires: string[];
}

export interface BundleDeps {
  elkCommit: string;
  bundles: Record<string, BundleEntry>;
}

export const ELK_PREFIX = 'org.eclipse.elk.';
export const TS_ROOT = 'src';
export const ELK_SOURCE_DIR_ENV = 'ELK_SOURCE_DIR';
export const DEFAULT_ELK_SOURCE_DIR = '../elk';
export const WRITE_FLAG = '--write';
export const REQUIRE_BUNDLE_HEADER = 'Require-Bundle';
export const COMMITTED_JSON_RELATIVE = 'test/architecture/bundle-deps.json';

/**
 * In-scope bundles (decisions.md "Bundle scope", amended by conformance-corpus D0),
 * without the ELK prefix.
 */
export const IN_SCOPE_SUFFIXES: readonly string[] = [
  'core',
  'graph',
  'graph.json',
  'alg.common',
  'alg.layered',
  'alg.mrtree',
  'alg.radial',
  'alg.force',
  'alg.disco',
  'alg.rectpacking',
  'alg.spore',
  'alg.topdownpacking',
  'alg.vertiflex',
  'graph.text',
  'graph.json.text',
  'core.debug.grandom',
];

export const IN_SCOPE_BUNDLES: readonly string[] = IN_SCOPE_SUFFIXES.map((suffix) => `${ELK_PREFIX}${suffix}`);

export const REPO_ROOT: string = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Parses MANIFEST text into headers; a leading single space continues the previous header. */
export function parseManifestHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  let current: string | undefined;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith(' ') && current !== undefined) {
      headers[current] = (headers[current] ?? '') + line.slice(1);
      continue;
    }
    const colon = line.indexOf(':');
    if (colon > 0) {
      current = line.slice(0, colon);
      headers[current] = line.slice(colon + 1).trim();
    } else {
      current = undefined;
    }
  }
  return headers;
}

/** Splits on commas that are not inside double quotes (version ranges contain commas). */
export function splitOutsideQuotes(value: string): string[] {
  const parts: string[] = [];
  let inQuotes = false;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

/** Returns bundle symbolic names, with `;bundle-version`, `;visibility`, `;resolution` attributes stripped. */
export function parseRequireBundle(value: string | undefined): string[] {
  if (value === undefined || value.trim() === '') {
    return [];
  }
  return splitOutsideQuotes(value)
    .map((entry) => (entry.split(';')[0] ?? '').trim())
    .filter((name) => name !== '');
}

/** `org.eclipse.elk.alg.layered` -> `src/alg/layered`. */
export function bundleToTsDir(bundle: string): string {
  if (!bundle.startsWith(ELK_PREFIX)) {
    throw new Error(`Not an ELK bundle: ${bundle}`);
  }
  return `${TS_ROOT}/${bundle.slice(ELK_PREFIX.length).replaceAll('.', '/')}`;
}

/** Builds the sorted dependency table from MANIFEST texts keyed by bundle name. */
export function buildBundleDeps(manifests: Readonly<Record<string, string>>, elkCommit: string): BundleDeps {
  const inScope = new Set(IN_SCOPE_BUNDLES);
  const entries: [string, BundleEntry][] = Object.entries(manifests).map(([bundle, text]) => {
    const required = parseRequireBundle(parseManifestHeaders(text)[REQUIRE_BUNDLE_HEADER]);
    const requires = required
      .filter((name) => inScope.has(name))
      .map(bundleToTsDir)
      .sort();
    return [bundleToTsDir(bundle), { bundle, requires }];
  });
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return { elkCommit, bundles: Object.fromEntries(entries) };
}

/** Stable serialization: 2-space indent, trailing newline. */
export function serializeBundleDeps(deps: BundleDeps): string {
  return `${JSON.stringify(deps, null, 2)}\n`;
}

export function resolveElkDir(
  arg: string | undefined,
  env: Readonly<Record<string, string | undefined>>,
  repoRoot: string = REPO_ROOT,
): string {
  return resolve(repoRoot, arg ?? env[ELK_SOURCE_DIR_ENV] ?? DEFAULT_ELK_SOURCE_DIR);
}

export function readElkCommit(elkDir: string): string {
  return execFileSync('git', ['-C', elkDir, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
}

export function readManifests(elkDir: string): Record<string, string> {
  const manifests: Record<string, string> = {};
  for (const bundle of IN_SCOPE_BUNDLES) {
    const path = join(elkDir, 'plugins', bundle, 'META-INF', 'MANIFEST.MF');
    manifests[bundle] = readFileSync(path, 'utf8');
  }
  return manifests;
}

export function generateBundleDeps(elkDir: string): BundleDeps {
  return buildBundleDeps(readManifests(elkDir), readElkCommit(elkDir));
}

function main(argv: readonly string[]): void {
  const write = argv.includes(WRITE_FLAG);
  const positional = argv.find((arg) => arg !== WRITE_FLAG);
  const elkDir = resolveElkDir(positional, process.env);
  const output = serializeBundleDeps(generateBundleDeps(elkDir));
  if (write) {
    writeFileSync(join(REPO_ROOT, COMMITTED_JSON_RELATIVE), output);
  } else {
    process.stdout.write(output);
  }
}

const entry = process.argv[1];
if (entry !== undefined && pathToFileURL(realpathSync(entry)).href === import.meta.url) {
  main(process.argv.slice(2));
}
