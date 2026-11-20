// SPDX-License-Identifier: EPL-2.0
// Issue #85 (plans/oracle-stale-caches, D2): drives the real verify_worktree of tools/oracle/build.sh on a throwaway
// git repository and worktree, so the stale-worktree check is tested with git's own porcelain lines.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve('tools/oracle/build.sh');
/** Sources build.sh (its guard keeps `main` from running) and calls verify_worktree on the paths in `$2`…`$5`. */
const DRIVER = '. "$1"; ELK_SOURCE_DIR="$2"; ELK_ORACLE_DIR="$3"; COMMIT="$4"; ORACLE_TOOLS="$5"; verify_worktree';
const EXIT_OK = 0;
const EXIT_STALE = 2;
const VERIFIED = 'existing oracle worktree verified\n';
const TRACKED_DIR = 'plugins';
const TRACKED_FILE = path.join(TRACKED_DIR, 'tracked.txt');
/** The untracked entries build.sh leaves or expects at the worktree root. */
const EXEMPT_DIRS = ['census', 'sweep', 'vector-cache'];
const MANIFEST = 'oracle-build.json';
/** Keeps the maintainer's git configuration (untracked-file display, signing, excludes) out of every git call. */
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };

// macOS reports its temp dir through the /var symlink; git prints canonical paths, so keep every path canonical.
const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'oracle-build-')));
const source = path.join(dir, 'elk');
const tools = path.join(dir, 'tools');

afterAll(() => rmSync(dir, { recursive: true, force: true }));

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env: GIT_ENV }).trim();
}

/** Creates the source repository with one commit and an empty patch set, and returns the commit. */
function createSource(): string {
  mkdirSync(path.join(source, TRACKED_DIR), { recursive: true });
  mkdirSync(path.join(tools, 'patches'), { recursive: true });
  writeFileSync(path.join(source, TRACKED_FILE), 'tracked\n');
  git(source, 'init', '--quiet');
  git(source, 'add', TRACKED_FILE);
  git(source, '-c', 'user.name=test', '-c', 'user.email=test@invalid', 'commit', '--quiet', '-m', 'initial');
  return git(source, 'rev-parse', 'HEAD');
}

const commit = createSource();

/** Adds a detached worktree at the commit, holding one file under each of the given untracked paths. */
function createOracle(name: string, untracked: readonly string[]): string {
  const oracle = path.join(dir, name);
  git(source, 'worktree', 'add', '--quiet', '--detach', oracle, commit);
  for (const entry of untracked) {
    const file = entry.endsWith('.json') ? path.join(oracle, entry) : path.join(oracle, entry, 'file.txt');
    mkdirSync(path.dirname(file), { recursive: true });
    // git does not list an empty directory, so every untracked directory holds one file.
    writeFileSync(file, 'untracked\n');
  }
  return oracle;
}

interface Verdict {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function verify(oracle: string): Verdict {
  const run = spawnSync('bash', ['-c', DRIVER, '_', SCRIPT, source, oracle, commit, tools], {
    encoding: 'utf8',
    env: GIT_ENV,
  });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

const verified: Verdict = { status: EXIT_OK, stdout: VERIFIED, stderr: '' };

function stale(oracle: string): Verdict {
  return {
    status: EXIT_STALE,
    stdout: '',
    stderr: `oracle worktree out of date; remove with \`git -C ${source} worktree remove ${oracle}\`\n`,
  };
}

describe('tools/oracle/build.sh verify_worktree', () => {
  it('verifies a clean worktree', () => {
    expect(verify(createOracle('clean', []))).toEqual(verified);
  });

  it('verifies a worktree that holds only the vector cache', () => {
    expect(verify(createOracle('vector-cache-only', ['vector-cache']))).toEqual(verified);
  });

  it('verifies a worktree that holds the three cache roots and the build manifest', () => {
    expect(verify(createOracle('caches', [...EXEMPT_DIRS, MANIFEST]))).toEqual(verified);
  });

  it('calls a worktree with another untracked root directory stale', () => {
    const oracle = createOracle('ad-hoc-root', [...EXEMPT_DIRS, MANIFEST, 't4']);
    expect(verify(oracle)).toEqual(stale(oracle));
  });

  it('calls a worktree with a root directory that only starts with a cache name stale', () => {
    const oracle = createOracle('prefix-root', ['vector-cache-old']);
    expect(verify(oracle)).toEqual(stale(oracle));
  });

  it('calls a worktree with a vector cache below an untracked directory stale', () => {
    const oracle = createOracle('nested-untracked', [path.join('sub', 'vector-cache')]);
    expect(verify(oracle)).toEqual(stale(oracle));
  });

  it('calls a worktree with a vector cache below a tracked directory stale', () => {
    const oracle = createOracle('nested-tracked', [path.join(TRACKED_DIR, 'vector-cache')]);
    expect(git(oracle, 'status', '--porcelain')).toBe(`?? ${TRACKED_DIR}/vector-cache/`);
    expect(verify(oracle)).toEqual(stale(oracle));
  });

  it('calls a worktree with a modified tracked file stale', () => {
    const oracle = createOracle('tracked-change', [...EXEMPT_DIRS, MANIFEST]);
    writeFileSync(path.join(oracle, TRACKED_FILE), 'changed\n');
    expect(verify(oracle)).toEqual(stale(oracle));
  });
});
