// SPDX-License-Identifier: EPL-2.0
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODELS_RELATIVE_PATH,
  loadManifest,
  repoRoot,
  resolveModelsDir,
  resolveModelsDirFrom,
} from './corpus.js';
import { isGoldenEntry, loadVariantNames } from './corpus.js';

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_GOLDEN_NODES = 50;
const WRONG_COMMIT_REPO_SLUG = 'wrong-commit';

interface GraphNode {
  children?: GraphNode[];
}

function countNodes(node: GraphNode): number {
  return 1 + (node.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);
}

function makeTempGitRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), `${WRONG_COMMIT_REPO_SLUG}-`));
  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q');
  git(
    '-c', 'user.name=t', '-c', 'user.email=t@example.com',
    'commit', '-q', '--allow-empty', '-m', 'empty',
  );
  return dir;
}

const manifest = loadManifest();
const defaultResolution = resolveModelsDir({});
const modelsDir = 'dir' in defaultResolution ? defaultResolution.dir : undefined;
const skipReason = 'skip' in defaultResolution ? defaultResolution.skip : '';

describe('resolveModelsDir', () => {
  it('uses <repoRoot>/../../eclipse-elk/elk-models when env is unset', () => {
    const expected = path.resolve(repoRoot(), DEFAULT_MODELS_RELATIVE_PATH);
    expect(DEFAULT_MODELS_RELATIVE_PATH).toBe('../../eclipse-elk/elk-models');
    const missing = resolveModelsDir({});
    if ('dir' in missing) {
      expect(missing.dir).toBe(expected);
    } else {
      expect(missing.skip).toContain(expected);
    }
  });

  it('honours ELK_MODELS_DIR from the supplied env', () => {
    const result = resolveModelsDir({ ELK_MODELS_DIR: '/nonexistent/elk-models' });
    expect('skip' in result && result.skip).toContain('/nonexistent/elk-models');
  });

  it('skips naming both shas when the directory is at another commit', () => {
    const dir = makeTempGitRepo();
    try {
      const actual = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: dir,
        encoding: 'utf8',
      }).trim();
      const result = resolveModelsDirFrom(dir);
      expect('skip' in result).toBe(true);
      const reason = 'skip' in result ? result.skip : '';
      expect(reason).toContain(manifest.commit);
      expect(reason).toContain(actual);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips for a directory that is not a git repository', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'not-a-repo-'));
    try {
      const result = resolveModelsDirFrom(dir);
      expect('skip' in result && result.skip).toContain(manifest.commit);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('manifest', () => {
  it('pins the expected repo and commit', () => {
    expect(manifest.repo).toBe('eclipse-elk/elk-models');
    expect(manifest.commit).toBe('ac5af2ba511c0037e4f347e8bd91f013950951c7');
  });

  it('has 3-5 goldens with unique kebab-case ids and notes', () => {
    const ids = manifest.golden.map((g) => g.id);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(ids.length).toBeLessThanOrEqual(5);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of manifest.golden) {
      expect(g.id).toMatch(KEBAB_CASE);
      expect(g.note.length).toBeGreaterThan(0);
    }
  });
});

describe.skipIf(modelsDir === undefined)('goldens against pinned clone', () => {
  for (const g of manifest.golden) {
    it(`${g.id}: exists, parses, has < ${MAX_GOLDEN_NODES} nodes`, () => {
      const file = path.join(modelsDir ?? '', g.path);
      expect(existsSync(file)).toBe(true);
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as GraphNode;
      expect(countNodes(parsed)).toBeLessThan(MAX_GOLDEN_NODES);
    });
  }
});

if (modelsDir === undefined) {
  it.skip(`goldens not verified: ${skipReason}`, () => {});
}

const LAYERED_ALGORITHM = 'org.eclipse.elk.layered';
const DEFAULT_VARIANT = 'default';
const BASE_ENTRY = {
  id: 'sample',
  path: 'a/b.json',
  note: 'n',
  algorithm: LAYERED_ALGORITHM,
  variant: DEFAULT_VARIANT,
};

describe('golden entry guard (algorithm, variant, retarget)', () => {
  it('accepts an entry without retarget', () => {
    expect(isGoldenEntry(BASE_ENTRY)).toBe(true);
  });

  it('rejects an entry missing algorithm', () => {
    const { algorithm: _omitted, ...rest } = BASE_ENTRY;
    expect(isGoldenEntry(rest)).toBe(false);
  });

  it('rejects an entry missing variant', () => {
    const { variant: _omitted, ...rest } = BASE_ENTRY;
    expect(isGoldenEntry(rest)).toBe(false);
  });

  it('rejects a retarget that differs from algorithm', () => {
    expect(isGoldenEntry({ ...BASE_ENTRY, retarget: 'org.eclipse.elk.mrtree' })).toBe(false);
  });

  it('accepts a retarget equal to algorithm', () => {
    expect(isGoldenEntry({ ...BASE_ENTRY, retarget: LAYERED_ALGORITHM })).toBe(true);
  });

  it('rejects a non-string retarget', () => {
    expect(isGoldenEntry({ ...BASE_ENTRY, retarget: 1 })).toBe(false);
  });

  it('gives every curated golden layered/default and no retarget', () => {
    for (const g of manifest.golden) {
      expect(g.algorithm).toBe(LAYERED_ALGORITHM);
      expect(g.variant).toBe(DEFAULT_VARIANT);
      expect(g.retarget).toBeUndefined();
    }
  });

  it('references only variants defined in variants.json', () => {
    const names = loadVariantNames();
    expect(names).toContain(DEFAULT_VARIANT);
    for (const g of manifest.golden) {
      expect(names).toContain(g.variant);
    }
  });
});
