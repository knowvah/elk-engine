// SPDX-License-Identifier: EPL-2.0
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadManifest, repoRoot } from '../corpus/corpus.js';
import { compareLayout, formatDiffs } from './compare-json.js';

const REFS_DIR = path.join(repoRoot(), 'test', 'golden', 'refs', 'elk');
const META_FILE = '_meta.json';
const JSON_EXT = '.json';
const ELK_COMMIT_FILE = path.join(repoRoot(), 'tools', 'oracle', 'ELK_COMMIT');
const GENERATED_BY = 'tools/oracle/regen-goldens.sh';
const GEOMETRY_KEYS = ['x', 'y', 'width', 'height'] as const;
const SIZE_KEYS = ['width', 'height'] as const;

type Obj = Record<string, unknown>;

export interface IdSetReport {
  missing: string[];
  extra: string[];
}

/** Pure 1:1 check: ids expected but absent, and ids present but unexpected. */
export function compareIdSets(expected: readonly string[], actual: readonly string[]): IdSetReport {
  const exp = new Set(expected);
  const act = new Set(actual);
  return {
    missing: expected.filter((id) => !act.has(id)).sort(),
    extra: actual.filter((id) => !exp.has(id)).sort(),
  };
}

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function objectsAt(node: Obj, key: string): Obj[] {
  const v = node[key];
  return Array.isArray(v) ? v.filter(isObj) : [];
}

function idOf(o: Obj): string {
  return typeof o['id'] === 'string' ? o['id'] : '<no id>';
}

function missingNumeric(o: Obj, keys: readonly string[], where: string): string[] {
  return keys.filter((k) => typeof o[k] !== 'number').map((k) => `${where}.${k}`);
}

function labelViolations(owner: Obj, where: string): string[] {
  return objectsAt(owner, 'labels').flatMap((l) =>
    missingNumeric(l, GEOMETRY_KEYS, `${where}.label[${idOf(l)}]`),
  );
}

function edgeViolations(node: Obj, where: string): string[] {
  return objectsAt(node, 'edges').flatMap((e) => {
    const w = `${where}.edge[${idOf(e)}]`;
    const sections = e['sections'];
    const empty = Array.isArray(sections) && sections.length > 0 ? [] : [`${w}.sections`];
    return [...empty, ...labelViolations(e, w)];
  });
}

function portViolations(node: Obj, where: string): string[] {
  return objectsAt(node, 'ports').flatMap((p) => {
    const w = `${where}.port[${idOf(p)}]`;
    return [...missingNumeric(p, GEOMETRY_KEYS, w), ...labelViolations(p, w)];
  });
}

/** Geometry violations for a node subtree; the root needs size but not x/y. */
export function geometryViolations(node: Obj, isRoot = true, parent = ''): string[] {
  const where = `${parent}${parent === '' ? '' : '.'}node[${idOf(node)}]`;
  const own = missingNumeric(node, isRoot ? SIZE_KEYS : GEOMETRY_KEYS, where);
  const children = objectsAt(node, 'children').flatMap((c) => geometryViolations(c, false, where));
  return [
    ...own,
    ...labelViolations(node, where),
    ...portViolations(node, where),
    ...edgeViolations(node, where),
    ...children,
  ];
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function refIds(): string[] {
  return readdirSync(REFS_DIR)
    .filter((f) => f.endsWith(JSON_EXT) && f !== META_FILE)
    .map((f) => f.slice(0, -JSON_EXT.length));
}

const manifest = loadManifest();
const goldenIds = manifest.golden.map((g) => g.id);

describe('compareIdSets', () => {
  it('reports exact missing and extra ids', () => {
    expect(compareIdSets(['a', 'b', 'c'], ['a', 'c', 'z'])).toEqual({
      missing: ['b'],
      extra: ['z'],
    });
  });

  it('reports nothing for identical sets in any order', () => {
    expect(compareIdSets(['a', 'b'], ['b', 'a'])).toEqual({ missing: [], extra: [] });
  });
});

describe('geometryViolations', () => {
  it('flags missing keys, empty sections and exempts root x/y', () => {
    const graph = {
      id: 'root',
      width: 1,
      height: 1,
      children: [
        {
          id: 'n',
          x: 1,
          y: 2,
          width: 3,
          ports: [{ id: 'p', x: 0, y: 0, width: 1, height: 1, labels: [{ id: 'pl', x: 0 }] }],
        },
      ],
      edges: [{ id: 'e', sections: [] }],
    };
    expect(geometryViolations(graph)).toEqual([
      'node[root].edge[e].sections',
      'node[root].node[n].height',
      'node[root].node[n].port[p].label[pl].y',
      'node[root].node[n].port[p].label[pl].width',
      'node[root].node[n].port[p].label[pl].height',
    ]);
  });
});

describe('committed oracle refs', () => {
  it('has exactly one ref per manifest golden id', () => {
    expect(compareIdSets(goldenIds, refIds())).toEqual({ missing: [], extra: [] });
  });

  it.each(goldenIds)('%s parses and compares equal to itself', (id) => {
    const ref = readJson(path.join(REFS_DIR, `${id}${JSON_EXT}`));
    const result = compareLayout(ref, ref);
    expect(formatDiffs(result.diffs)).toBe('');
    expect(result.ok).toBe(true);
  });

  it.each(goldenIds)('%s has geometry on every node, port, label and edge', (id) => {
    const ref = readJson(path.join(REFS_DIR, `${id}${JSON_EXT}`));
    expect(isObj(ref)).toBe(true);
    expect(geometryViolations(ref as Obj)).toEqual([]);
  });

  it('_meta.json records the pinned commits and generator', () => {
    const meta = readJson(path.join(REFS_DIR, META_FILE));
    const elkCommit = readFileSync(ELK_COMMIT_FILE, 'utf8').trim();
    expect(isObj(meta)).toBe(true);
    const m = meta as Obj;
    expect(m['modelsCommit']).toBe(manifest.commit);
    expect(m['elkCommit']).toBe(elkCommit);
    expect(m['generatedBy']).toBe(GENERATED_BY);
  });
});
