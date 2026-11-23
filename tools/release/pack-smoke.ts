// SPDX-License-Identifier: EPL-2.0
// Pack-and-install rehearsal (docs-publish-prep DP8). Publishes nothing and contacts no registry.
//
//   tsx tools/release/pack-smoke.ts
//       build, `npm pack`, check the file list, install the tarball offline into a clean project, import it, then
//       `layout` the first documentation example's input there and compare the output with its oracle ref at 1e-6
//       (AD-4).
//   tsx tools/release/pack-smoke.ts --entry <file>
//       the same, with the tarball's dist/index.js replaced by an esbuild bundle of <entry> built with the flags of
//       the `build:js` script, before the same checks.
//
// Everything is written under os.tmpdir(), apart from dist/ by the build. The scratch directory is removed on success
// and kept, with its path printed, on failure.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compareLayout, formatDiffs } from '../../test/golden/compare-json.js';
import { checkPackContents, parsePackJson } from './pack-contents.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PACKAGE_NAME = '@knowvah/elk-engine';
const BUILD_TIMEOUT_MS = 120_000;
const NPM_TIMEOUT_MS = 60_000;
const NODE_TIMEOUT_MS = 30_000;
const MAX_BUFFER = 64 * 1024 * 1024;
const ENTRY_FLAG = '--entry';
const BUILD_JS_SCRIPT = 'build:js';
const BUILD_JS_ENTRY = 'src/index.ts';
const BUILD_JS_OUTFILE = '--outfile=dist/index.js';
const BUNDLE_RELATIVE = path.join('dist', 'index.js');
const CONSUMER_SCRIPT = 'consumer-layout.mjs';
const EXAMPLES_MANIFEST = path.join('test', 'golden', 'examples.json');
const EXAMPLES_INPUTS = path.join('test', 'golden', 'examples-inputs');
const EXAMPLES_REFS = path.join('test', 'golden', 'refs', 'elk-examples');
const IMPORT_PROBE = `const m = await import('${PACKAGE_NAME}'); console.log(JSON.stringify(Object.keys(m).sort()));`;

class SmokeFailure extends Error {}

/** Runs a child process with a timeout and returns its stdout; stderr is inherited so npm's notices stay visible. */
function run(command: string, args: readonly string[], cwd: string, timeout: number): string {
  return execFileSync(command, args, {
    cwd,
    timeout,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function step(message: string): void {
  console.error(`pack-smoke: ${message}`);
}

/** `npm pack` of the package at `packageDir` into `destination`, with its file list checked. Returns the tarball. */
function packAndCheck(packageDir: string, destination: string): string {
  mkdirSync(destination, { recursive: true });
  const pack = parsePackJson(
    run('npm', ['pack', '--json', '--pack-destination', destination], packageDir, NPM_TIMEOUT_MS),
  );
  const problems = checkPackContents(pack.files);
  if (problems.length > 0) {
    throw new SmokeFailure(`tarball contents (${String(pack.files.length)} files):\n  ${problems.join('\n  ')}`);
  }
  step(`packed ${pack.filename}: ${String(pack.files.length)} files, contents ok`);
  return path.join(destination, pack.filename);
}

/** A fresh project with nothing but the tarball installed, offline (the package has no runtime dependencies). */
function installInCleanProject(tarball: string, consumerDir: string): void {
  mkdirSync(consumerDir, { recursive: true });
  const manifest = { name: 'pack-smoke-consumer', private: true, type: 'module' };
  writeFileSync(path.join(consumerDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  run('npm', ['install', '--offline', '--no-audit', '--no-fund', tarball], consumerDir, NPM_TIMEOUT_MS);
  step(`installed into a clean project: ${consumerDir}`);
}

/** Imports the package by name in a fresh Node process of the consumer project; returns its export names. */
function importInCleanProcess(consumerDir: string): readonly string[] {
  const stdout = run('node', ['--input-type=module', '-e', IMPORT_PROBE], consumerDir, NODE_TIMEOUT_MS);
  const names = JSON.parse(stdout) as string[];
  step(`import('${PACKAGE_NAME}') ok: ${String(names.length)} exports`);
  return names;
}

/** The esbuild command line of the `build:js` script, with the entry and the outfile replaced. */
function bundleArgs(entry: string, outfile: string): string[] {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const [tool, ...args] = (manifest.scripts[BUILD_JS_SCRIPT] ?? '').split(' ');
  if (tool !== 'esbuild' || !args.includes(BUILD_JS_ENTRY) || !args.includes(BUILD_JS_OUTFILE)) {
    throw new SmokeFailure(`package.json "${BUILD_JS_SCRIPT}" is not the esbuild line this tool rewrites`);
  }
  return args.map((arg) => {
    if (arg === BUILD_JS_ENTRY) return entry;
    return arg === BUILD_JS_OUTFILE ? `--outfile=${outfile}` : arg;
  });
}

/** Unpacks `tarball` into `scratch/package` and replaces its bundle with one built from `entry`; returns that dir. */
function repackageWithEntry(tarball: string, entry: string, scratch: string): string {
  run('tar', ['-xzf', tarball, '-C', scratch], scratch, NPM_TIMEOUT_MS);
  const packageDir = path.join(scratch, 'package');
  const outfile = path.join(packageDir, BUNDLE_RELATIVE);
  run(path.join(ROOT, 'node_modules', '.bin', 'esbuild'), bundleArgs(entry, outfile), ROOT, BUILD_TIMEOUT_MS);
  step(`bundled ${entry} into the scratch package as ${BUNDLE_RELATIVE}`);
  return packageDir;
}

/** The first documentation example: its input twin and its oracle ref. */
function firstExample(): { id: string; input: string; ref: unknown } {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, EXAMPLES_MANIFEST), 'utf8')) as {
    golden: { id: string; path: string }[];
  };
  const first = manifest.golden[0];
  if (first === undefined) throw new SmokeFailure(`${EXAMPLES_MANIFEST} lists no example`);
  const ref: unknown = JSON.parse(readFileSync(path.join(ROOT, EXAMPLES_REFS, `${first.id}.json`), 'utf8'));
  return { id: first.id, input: path.join(ROOT, EXAMPLES_INPUTS, first.path), ref };
}

/** Lays out the first example's input with the installed package in a fresh process and compares with the ref. */
function layoutInCleanProcess(consumerDir: string): void {
  const example = firstExample();
  copyFileSync(path.join(import.meta.dirname, CONSUMER_SCRIPT), path.join(consumerDir, CONSUMER_SCRIPT));
  const stdout = run('node', [CONSUMER_SCRIPT, example.input], consumerDir, NODE_TIMEOUT_MS);
  const result = compareLayout(example.ref, JSON.parse(stdout));
  if (!result.ok) {
    throw new SmokeFailure(`layout of ${example.id} differs from its oracle ref:\n${formatDiffs(result.diffs)}`);
  }
  step(`laid out ${example.id} in a clean process: equals the oracle ref at 1e-6`);
}

function parseEntry(argv: readonly string[]): string | undefined {
  const at = argv.indexOf(ENTRY_FLAG);
  if (at === -1) {
    if (argv.length > 0) throw new SmokeFailure(`unknown argument '${argv[0] ?? ''}' (usage: [${ENTRY_FLAG} <file>])`);
    return undefined;
  }
  const entry = argv[at + 1];
  if (entry === undefined || argv.length !== 2) throw new SmokeFailure(`${ENTRY_FLAG} needs exactly one file`);
  return entry;
}

function rehearse(entry: string | undefined, scratch: string): void {
  step('npm run build');
  run('npm', ['run', 'build'], ROOT, BUILD_TIMEOUT_MS);
  let tarball = packAndCheck(ROOT, path.join(scratch, 'packed'));
  if (entry !== undefined) {
    tarball = packAndCheck(repackageWithEntry(tarball, entry, scratch), path.join(scratch, 'repacked'));
  }
  const consumerDir = path.join(scratch, 'consumer');
  installInCleanProject(tarball, consumerDir);
  importInCleanProcess(consumerDir);
  layoutInCleanProcess(consumerDir);
}

function main(): void {
  let entry: string | undefined;
  try {
    entry = parseEntry(process.argv.slice(2));
  } catch (error) {
    console.error(`pack-smoke: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
    return;
  }
  const scratch = mkdtempSync(path.join(os.tmpdir(), 'elk-engine-pack-smoke-'));
  try {
    rehearse(entry, scratch);
  } catch (error) {
    console.error(`pack-smoke: FAILED; files kept in ${scratch}`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }
  rmSync(scratch, { recursive: true, force: true });
  step('ok');
}

main();
