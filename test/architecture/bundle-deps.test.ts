// SPDX-License-Identifier: EPL-2.0
// Issue #89 (plans/bundle-deps-pinned-read, D3): drives the manifest reader of tools/bundle-deps.ts on a throwaway git
// repository, so reading the manifests by commit id is tested where no ELK checkout exists (CI).
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ELK_PREFIX,
  IN_SCOPE_BUNDLES,
  elkCommitPresent,
  generateBundleDeps,
  readPinnedCommit,
} from '../../tools/bundle-deps.js';

const LAYERED = `${ELK_PREFIX}alg.layered`;
const CORE = `${ELK_PREFIX}core`;
const COMMON = `${ELK_PREFIX}alg.common`;
const GRAPH = `${ELK_PREFIX}graph`;
const LAYERED_DIR = 'src/alg/layered';
const CORE_DIR = 'src/core';
const COMMON_DIR = 'src/alg/common';
const ABSENT_COMMIT = '0'.repeat(40);
const PIN_FILE = path.join('tools', 'oracle', 'ELK_COMMIT');
/** Keeps the maintainer's git configuration (signing, hooks, excludes) out of every git call the test makes. */
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };

// macOS reports its temp dir through the /var symlink; keep every path canonical.
const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'bundle-deps-')));
const checkout = path.join(dir, 'elk');
const notARepo = path.join(dir, 'plain');
const pinRoot = path.join(dir, 'root');

afterAll(() => rmSync(dir, { recursive: true, force: true }));

function git(...args: string[]): string {
  return execFileSync('git', ['-C', checkout, ...args], { encoding: 'utf8', env: GIT_ENV }).trim();
}

/** A minimal manifest; several required bundles are folded onto continuation lines, as ELK's manifests are. */
function manifestText(bundle: string, requires: readonly string[]): string {
  const header = requires.length === 0 ? '' : `Require-Bundle: ${requires.join(',\n ')}\n`;
  return `Manifest-Version: 1.0\nBundle-SymbolicName: ${bundle};singleton:=true\n${header}`;
}

function writeManifest(bundle: string, requires: readonly string[]): void {
  const metaInf = path.join(checkout, 'plugins', bundle, 'META-INF');
  mkdirSync(metaInf, { recursive: true });
  writeFileSync(path.join(metaInf, 'MANIFEST.MF'), manifestText(bundle, requires));
}

function commitAll(message: string): string {
  git('add', '--all');
  git('-c', 'user.name=test', '-c', 'user.email=test@invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', message);
  return git('rev-parse', 'HEAD');
}

/** Commit A: alg.layered requires core. Commit B: it also requires alg.common. Then an uncommitted third edit. */
function createCheckout(): { a: string; b: string } {
  mkdirSync(checkout);
  git('init', '--quiet');
  for (const bundle of IN_SCOPE_BUNDLES) {
    writeManifest(bundle, []);
  }
  writeManifest(LAYERED, [CORE]);
  const a = commitAll('a');
  writeManifest(LAYERED, [CORE, COMMON]);
  const b = commitAll('b');
  writeManifest(LAYERED, [CORE, COMMON, GRAPH]);
  return { a, b };
}

const { a, b } = createCheckout();

describe('tools/bundle-deps.ts reads manifests at a commit', () => {
  it('leaves the third edit uncommitted in the working tree', () => {
    expect(git('status', '--porcelain')).toBe(`M plugins/${LAYERED}/META-INF/MANIFEST.MF`);
    expect(a).not.toBe(b);
  });

  it('stamps commit A and reads its Require-Bundle', () => {
    const deps = generateBundleDeps(checkout, a);
    expect(deps.elkCommit).toBe(a);
    expect(Object.keys(deps.bundles)).toHaveLength(IN_SCOPE_BUNDLES.length);
    expect(deps.bundles[LAYERED_DIR]).toEqual({ bundle: LAYERED, requires: [CORE_DIR] });
  });

  it('stamps commit B and reads its Require-Bundle, not the working tree', () => {
    const deps = generateBundleDeps(checkout, b);
    expect(deps.elkCommit).toBe(b);
    expect(Object.keys(deps.bundles)).toHaveLength(IN_SCOPE_BUNDLES.length);
    expect(deps.bundles[LAYERED_DIR]).toEqual({ bundle: LAYERED, requires: [COMMON_DIR, CORE_DIR] });
  });
});

describe('elkCommitPresent', () => {
  it('is true for a commit the checkout holds, wherever HEAD is', () => {
    expect(git('rev-parse', 'HEAD')).toBe(b);
    expect(elkCommitPresent(checkout, a)).toBe(true);
    expect(elkCommitPresent(checkout, b)).toBe(true);
  });

  it('is false for a commit the checkout does not hold', () => {
    expect(elkCommitPresent(checkout, ABSENT_COMMIT)).toBe(false);
  });

  it('is false for a directory that is not a git checkout', () => {
    mkdirSync(notARepo);
    expect(elkCommitPresent(notARepo, a)).toBe(false);
  });
});

describe('readPinnedCommit', () => {
  it('returns tools/oracle/ELK_COMMIT of the given root without its trailing newline', () => {
    mkdirSync(path.dirname(path.join(pinRoot, PIN_FILE)), { recursive: true });
    writeFileSync(path.join(pinRoot, PIN_FILE), `${a}\n`);
    expect(readPinnedCommit(pinRoot)).toBe(a);
  });
});
