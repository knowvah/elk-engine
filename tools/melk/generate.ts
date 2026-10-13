// SPDX-License-Identifier: EPL-2.0
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PENDING_TYPES, SOURCES_DIRECTORY, loadUpstreamPaths } from './config.js';
import { emitBundle } from './emit.js';
import { resolveAll, type ResolvedBundle } from './model.js';
import { parseMelk } from './parser.js';

/** The bundles emitted in mission 3 when no names are given (the other `.melk` files are resolved but not written). */
export const DEFAULT_BUNDLES: readonly string[] = ['Core', 'Labels'];

const MELK_EXTENSION = '.melk';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');

/** Options of {@link generate}. */
export interface GenerateOptions {
  /** Bundle names (the `.melk` file names without extension); default {@link DEFAULT_BUNDLES}. */
  readonly bundles?: readonly string[];
  /** Whether to write the files under the repository root. */
  readonly write: boolean;
}

async function resolveVendoredBundles(): Promise<ResolvedBundle[]> {
  const names = [...loadUpstreamPaths().keys()].sort();
  const files = await Promise.all(
    names.map(async (name) => parseMelk(await readFile(join(SOURCES_DIRECTORY, name), 'utf8'), name)),
  );
  return resolveAll(files, { pendingTypes: PENDING_TYPES });
}

/**
 * Resolves all vendored `.melk` files and emits TypeScript for the selected bundles. Returns the repository-relative
 * output path of every emitted file with its text; with `write` the files are written as well.
 */
export async function generate(options: GenerateOptions): Promise<Map<string, string>> {
  const wanted = options.bundles ?? DEFAULT_BUNDLES;
  const bundles = await resolveVendoredBundles();
  const output = new Map<string, string>();
  for (const name of wanted) {
    const bundle = bundles.find((candidate) => candidate.file === `${name}${MELK_EXTENSION}`);
    if (bundle === undefined) {
      throw new Error(
        `unknown bundle '${name}'; available: ${bundles.map((b) => b.file.replace(MELK_EXTENSION, '')).join(', ')}`,
      );
    }
    for (const [path, text] of await emitBundle(bundle)) {
      output.set(path, text);
    }
  }
  if (options.write) {
    for (const [path, text] of output) {
      await mkdir(dirname(join(REPOSITORY_ROOT, path)), { recursive: true });
      await writeFile(join(REPOSITORY_ROOT, path), text, 'utf8');
    }
  }
  return output;
}

/** The command line: `melk:generate [bundle...]`; writes the files and lists them. Returns the exit code. */
export async function runCli(argv: readonly string[]): Promise<number> {
  try {
    const bundles = argv.length === 0 ? undefined : argv;
    const output = await generate({ bundles, write: true });
    for (const path of output.keys()) {
      console.log(`wrote ${path}`);
    }
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await runCli(process.argv.slice(2));
}
