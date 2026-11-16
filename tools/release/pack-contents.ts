// SPDX-License-Identifier: EPL-2.0
// The pure half of the pack rehearsal (docs-publish-prep DP8): what `npm pack --json` printed, and whether the file
// list of a tarball is fit to publish. No I/O; `pack-smoke.ts` is the shell around it.

/** Files a publishable tarball must hold. `NOTICE.md` is the derivative-work notice for the ELK port. */
export const REQUIRED_FILES: readonly string[] = [
  'package.json',
  'README.md',
  'LICENSE',
  'NOTICE.md',
  'dist/index.js',
  'dist/index.d.ts',
];

/** Top-level directories that must never ship. Anchored at the root: `src/core/testing/` is a ported package. */
export const FORBIDDEN_PREFIXES: readonly string[] = ['test/', 'coverage/', 'plans/', 'docs-site/'];

// `X.test.ts` and what a declaration build would emit from one (`X.test.d.ts`, `X.test.d.ts.map`).
const TEST_FILE = /\.test\.(?:ts|d\.ts|d\.ts\.map)$/;

/** What the rehearsal needs from one `npm pack --json` run. */
export interface PackResult {
  /** The tarball's file name inside the pack destination. */
  readonly filename: string;
  /** Every path in the tarball, relative to the package root. */
  readonly files: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function filePath(entry: unknown): string {
  if (!isRecord(entry) || typeof entry['path'] !== 'string') {
    throw new Error('npm pack --json entry has a file without a path');
  }
  return entry['path'];
}

/**
 * Reads the single package entry of `npm pack --json`. Lifecycle scripts may print before the JSON, so parsing starts
 * at the first line that opens an array.
 *
 * @throws Error when the output holds no JSON array, not exactly one package, or an entry without `filename`/`files`.
 */
export function parsePackJson(stdout: string): PackResult {
  const start = stdout.search(/^\[/m);
  if (start === -1) throw new Error('npm pack --json printed no JSON array');
  const parsed: unknown = JSON.parse(stdout.slice(start));
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    const count = Array.isArray(parsed) ? parsed.length : 0;
    throw new Error(`npm pack --json reported ${String(count)} packages, expected 1`);
  }
  const entry: unknown = parsed[0];
  if (!isRecord(entry) || typeof entry['filename'] !== 'string' || !Array.isArray(entry['files'])) {
    throw new Error('npm pack --json entry has no filename or files');
  }
  return { filename: entry['filename'], files: entry['files'].map(filePath) };
}

function forbiddenProblems(file: string): string[] {
  const problems = FORBIDDEN_PREFIXES.filter((prefix) => file.startsWith(prefix)).map(
    (prefix) => `forbidden path (${prefix}): ${file}`,
  );
  if (TEST_FILE.test(file)) problems.push(`forbidden test file: ${file}`);
  return problems;
}

/**
 * The problems of a tarball file list: each required file that is missing (in `REQUIRED_FILES` order), then each
 * forbidden entry (in list order). An empty result means the tarball is fit to publish.
 */
export function checkPackContents(files: readonly string[]): string[] {
  const present = new Set(files);
  const missing = REQUIRED_FILES.filter((file) => !present.has(file)).map((file) => `missing required file: ${file}`);
  return [...missing, ...files.flatMap(forbiddenProblems)];
}
