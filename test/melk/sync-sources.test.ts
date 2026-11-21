// SPDX-License-Identifier: EPL-2.0
// Issue #89 (plans/bundle-deps-pinned-read, D4): runs tools/melk/sync-sources.sh --check on throwaway directories, so
// its guard (the checkout must hold the pinned commit; HEAD may be anywhere) is tested where no ELK checkout exists.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { REPO_ROOT, elkCommitPresent, readPinnedCommit, resolveElkDir } from '../../tools/bundle-deps.js';

const SCRIPT = path.join(REPO_ROOT, 'tools', 'melk', 'sync-sources.sh');
const CHECK_FLAG = '--check';
const EXIT_OK = 0;
const EXIT_ERROR = 1;
const PINNED = readPinnedCommit();
const COMMIT_IDENTITY = ['-c', 'user.name=test', '-c', 'user.email=test@invalid', '-c', 'commit.gpgsign=false'];

// macOS reports its temp dir through the /var symlink; keep every path canonical.
const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'sync-sources-')));
const notARepo = path.join(dir, 'plain');
const withoutPin = path.join(dir, 'elk');
/**
 * Keeps the maintainer's git configuration out of every git call, and keeps git from finding a repository above the
 * throwaway directories.
 */
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CEILING_DIRECTORIES: dir,
};

afterAll(() => rmSync(dir, { recursive: true, force: true }));

interface Outcome {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs the script with `--check`, which writes nothing; the checkout path travels in the environment. */
function check(elkSourceDir: string): Outcome {
  const run = spawnSync('bash', [SCRIPT, CHECK_FLAG], {
    encoding: 'utf8',
    env: { ...GIT_ENV, ELK_SOURCE_DIR: elkSourceDir },
  });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

function failure(message: string): Outcome {
  return { status: EXIT_ERROR, stdout: '', stderr: `error: ${message}\n` };
}

/** A repository with one empty commit: a git checkout that does not hold the pinned ELK commit. */
function createRepoWithoutPin(): void {
  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', withoutPin, ...args], { encoding: 'utf8', env: GIT_ENV });
  mkdirSync(withoutPin);
  git('init', '--quiet');
  git(...COMMIT_IDENTITY, 'commit', '--quiet', '--allow-empty', '-m', 'initial');
}

function liveSkipReason(elkDir: string): string | undefined {
  if (!existsSync(elkDir)) {
    return `ELK source dir not found: ${elkDir}`;
  }
  return elkCommitPresent(elkDir, PINNED) ? undefined : `ELK checkout ${elkDir} does not contain ${PINNED}`;
}

describe('tools/melk/sync-sources.sh --check', () => {
  it('rejects a directory that is not a git checkout', () => {
    mkdirSync(notARepo);
    expect(check(notARepo)).toEqual(failure(`ELK_SOURCE_DIR is not a git checkout: ${notARepo}`));
  });

  it('rejects a checkout that does not contain the pinned commit', () => {
    createRepoWithoutPin();
    expect(check(withoutPin)).toEqual(failure(`ELK checkout ${withoutPin} does not contain ${PINNED}`));
  });

  const elkDir = resolveElkDir(undefined, process.env);
  const reason = liveSkipReason(elkDir);
  if (reason === undefined) {
    it('finds the vendored sources equal to the pinned commit, wherever HEAD is', () => {
      expect(check(elkDir)).toEqual({ status: EXIT_OK, stdout: '', stderr: '' });
    });
  } else {
    it.skip(`finds the vendored sources equal to the pinned commit (skipped: ${reason})`, () => {});
  }
});
