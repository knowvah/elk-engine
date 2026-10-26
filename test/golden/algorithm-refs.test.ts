// SPDX-License-Identifier: EPL-2.0
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isGoldenEntry, loadVariantNames, repoRoot } from '../corpus/corpus.js';
import type { GoldenEntry } from '../corpus/corpus.js';
import { compareLayout, formatDiffs } from './compare-json.js';
import { compareIdSets, geometryViolations } from './oracle-refs.test.js';

const GOLDEN_DIR = path.join(repoRoot(), 'test', 'golden');
const ALGORITHMS_FILE = path.join(GOLDEN_DIR, 'algorithms.json');
const REFS_DIR = path.join(GOLDEN_DIR, 'refs', 'elk-algorithms');
const INPUTS_DIR = path.join(GOLDEN_DIR, 'inputs');
const INPUTS_MANIFEST = path.join(INPUTS_DIR, 'manifest.json');
const CORPUS_MANIFEST = path.join(repoRoot(), 'test', 'corpus', 'manifest.json');
const ELK_COMMIT_FILE = path.join(repoRoot(), 'tools', 'oracle', 'ELK_COMMIT');
const META_FILE = '_meta.json';
const JSON_EXT = '.json';
const GENERATED_BY = 'tools/oracle/regen-goldens.sh';
const GOLDEN_ALGORITHMS = ['org.eclipse.elk.fixed', 'org.eclipse.elk.box', 'org.eclipse.elk.random'];
const SEEDED_VARIANT = 'random-seed-1';
const RANDOM_ALGORITHM = 'org.eclipse.elk.random';
/** fixed, box and random do not route: an edge with no input sections has none in the ref (not a defect). */
const NO_ROUTING_SUFFIX = '.sections';
const TICKET_INPUTS = [
  'tickets/core/457_boxLayouterIgnoresMinimumSize.elkt',
  'tickets/core/475_fixedLayoutWithLongLabels.elkt',
  'tickets/core/489_paddingAndMinSize_Large.elkt',
  'tickets/core/489_paddingAndMinSize_Small.elkt',
];

type Obj = Record<string, unknown>;

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function loadGolden(): GoldenEntry[] {
  const parsed = readJson(ALGORITHMS_FILE);
  if (!isObj(parsed) || !Array.isArray(parsed['golden'])) {
    throw new Error(`Invalid algorithms manifest: ${ALGORITHMS_FILE}`);
  }
  const entries: unknown[] = parsed['golden'];
  const bad = entries.findIndex((e) => !isGoldenEntry(e));
  if (bad >= 0) {
    throw new Error(`Golden entry ${bad} is invalid: ${ALGORITHMS_FILE}`);
  }
  return entries as GoldenEntry[]; // every element passed isGoldenEntry above
}

function loadRecordedHashes(): Record<string, string> {
  const parsed = readJson(INPUTS_MANIFEST);
  if (!isObj(parsed) || !isObj(parsed['files'])) {
    throw new Error(`Invalid inputs manifest: ${INPUTS_MANIFEST}`);
  }
  return parsed['files'] as Record<string, string>; // repo-controlled manifest, values are hex strings
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function refIds(): string[] {
  return readdirSync(REFS_DIR)
    .filter((f) => f.endsWith(JSON_EXT) && f !== META_FILE)
    .map((f) => f.slice(0, -JSON_EXT.length));
}

const golden = loadGolden();
const goldenIds = golden.map((g) => g.id);
const hashes = loadRecordedHashes();

describe('algorithm golden manifest', () => {
  it('has unique ids', () => {
    expect(new Set(goldenIds).size).toBe(goldenIds.length);
  });

  it('retargets every entry to its own algorithm', () => {
    expect(golden.filter((g) => g.retarget !== g.algorithm).map((g) => g.id)).toEqual([]);
  });

  it('covers fixed, box and random with three entries each', () => {
    for (const algorithm of GOLDEN_ALGORITHMS) {
      expect(golden.filter((g) => g.algorithm === algorithm)).toHaveLength(3);
    }
  });

  it('prefixes each id with its algorithm suffix', () => {
    const wrong = golden.filter((g) => !g.id.startsWith(`${g.algorithm.split('.').pop() ?? ''}-`));
    expect(wrong.map((g) => g.id)).toEqual([]);
  });

  it('references only variants defined in variants.json', () => {
    const names = loadVariantNames();
    expect(golden.filter((g) => !names.includes(g.variant)).map((g) => g.id)).toEqual([]);
  });

  it('seeds every random entry and no other', () => {
    const seeded = golden.filter((g) => g.variant === SEEDED_VARIANT).map((g) => g.algorithm);
    expect(seeded).toEqual(golden.filter((g) => g.algorithm === RANDOM_ALGORITHM).map((g) => g.algorithm));
  });
});

describe('committed algorithm oracle refs', () => {
  it('has exactly one ref per manifest golden id', () => {
    expect(compareIdSets(goldenIds, refIds())).toEqual({ missing: [], extra: [] });
  });

  it.each(goldenIds)('%s parses and compares equal to itself', (id) => {
    const ref = readJson(path.join(REFS_DIR, `${id}${JSON_EXT}`));
    const result = compareLayout(ref, ref);
    expect(formatDiffs(result.diffs)).toBe('');
    expect(result.ok).toBe(true);
  });

  it.each(goldenIds)('%s has geometry on every node, port and label (edges are not routed)', (id) => {
    const ref = readJson(path.join(REFS_DIR, `${id}${JSON_EXT}`));
    expect(isObj(ref)).toBe(true);
    const violations = geometryViolations(ref as Obj).filter((v) => !v.endsWith(NO_ROUTING_SUFFIX));
    expect(violations).toEqual([]);
  });

  it('_meta.json records the pinned commits, patches and generator', () => {
    const meta = readJson(path.join(REFS_DIR, META_FILE));
    const corpus = readJson(CORPUS_MANIFEST) as Obj; // repo-controlled manifest
    expect(isObj(meta)).toBe(true);
    const m = meta as Obj;
    expect(m['modelsCommit']).toBe(corpus['commit']);
    expect(m['elkCommit']).toBe(readFileSync(ELK_COMMIT_FILE, 'utf8').trim());
    expect(m['generatedBy']).toBe(GENERATED_BY);
    expect(Array.isArray(m['patches']) && m['patches'].length > 0).toBe(true);
  });
});

describe('vendored inputs', () => {
  it('records the pinned models commit', () => {
    const parsed = readJson(INPUTS_MANIFEST) as Obj;
    const corpus = readJson(CORPUS_MANIFEST) as Obj;
    expect(parsed['commit']).toBe(corpus['commit']);
  });

  it('records every golden input and the four ticket models, nothing else', () => {
    const expected = [...golden.map((g) => g.path), ...TICKET_INPUTS].sort();
    expect(Object.keys(hashes).sort()).toEqual(expected);
  });

  it.each(Object.keys(hashes))('%s matches its recorded sha-256', (rel) => {
    expect(sha256(path.join(INPUTS_DIR, rel))).toBe(hashes[rel]);
  });
});
