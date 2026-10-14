// SPDX-License-Identifier: EPL-2.0
// J7: the 4 committed layout goldens (refs/elk) are parsed and re-exported by the port; the text must be
// byte-identical to the oracle's own import->export (refs/elk-parse). ELK cannot re-import its own layout
// export (it writes `resolvedAlgorithm`) and the port registers CoreOptions only (it drops the layered-only
// `layering.layerId`, `crossingMinimization.positionId`), so the input is the golden with those keys removed by the transform
// tools/oracle/regen-parse-refs.sh applies (J7 amendments 1, 2); the raw import throws the T3-recorded exception.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { repoRoot } from '../corpus/corpus.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { EXCEPTION_CLASSES, importRows, simpleName } from '../helpers/graph-json-canon.js';

const GOLDEN_DIR = path.join(repoRoot(), 'test', 'golden', 'refs', 'elk');
const PARSE_DIR = path.join(repoRoot(), 'test', 'golden', 'refs', 'elk-parse');
const META_FILE = '_meta.json';
const JSON_EXT = '.json';
// Keep in sync with STRIP_KEYS in tools/oracle/regen-parse-refs.sh (J7 amendments 1 and 2).
const STRIP_KEYS = ['resolvedAlgorithm', 'layering.layerId', 'crossingMinimization.positionId'];
const RAW_IMPORT_ROW = 'err-resolved-algorithm';

interface ParseMeta {
  inputSha256: Record<string, string>;
  strippedSha256: Record<string, string>;
}

type Obj = Record<string, unknown>;

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');
const read = (file: string): string => readFileSync(file, 'utf8');
const meta = JSON.parse(read(path.join(PARSE_DIR, META_FILE))) as ParseMeta;
const goldenFiles = Object.keys(meta.inputSha256).sort();

function isResolvedAlgorithmKey(key: string): boolean {
  return STRIP_KEYS.some((s) => key === s || key.endsWith(`.${s}`));
}

function walk(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(walk);
  } else if (value !== null && typeof value === 'object') {
    const options = (value as Obj)['layoutOptions'];
    if (options !== null && typeof options === 'object' && !Array.isArray(options)) {
      for (const key of Object.keys(options)) {
        if (isResolvedAlgorithmKey(key)) delete (options as Obj)[key];
      }
    }
    Object.values(value).forEach(walk);
  }
}

/** The transform of tools/oracle/regen-parse-refs.sh `strip_inputs`. */
function stripResolvedAlgorithm(raw: string): string {
  const obj: unknown = JSON.parse(raw);
  walk(obj);
  return JSON.stringify(obj, null, 2) + '\n';
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('layout goldens: oracle import -> export round trip', () => {
  it('covers exactly the committed goldens and refs', () => {
    const jsonIn = (dir: string): string[] =>
      readdirSync(dir)
        .filter((f) => f.endsWith(JSON_EXT) && f !== META_FILE)
        .sort();
    expect(goldenFiles).toHaveLength(4);
    expect(jsonIn(GOLDEN_DIR)).toEqual(goldenFiles);
    expect(jsonIn(PARSE_DIR)).toEqual(goldenFiles);
    expect(Object.keys(meta.strippedSha256).sort()).toEqual(goldenFiles);
  });

  it.each(goldenFiles)('%s: input hashes match _meta.json', (file) => {
    const raw = read(path.join(GOLDEN_DIR, file));
    expect(sha256(raw)).toBe(meta.inputSha256[file]);
    expect(sha256(stripResolvedAlgorithm(raw))).toBe(meta.strippedSha256[file]);
  });

  it.each(goldenFiles)('%s: stripped import re-exports byte-identically', (file) => {
    const stripped = stripResolvedAlgorithm(read(path.join(GOLDEN_DIR, file)));
    const exported = exportLikeOracle(ElkGraphJson.forGraph(stripped).toElk());
    expect(exported + '\n').toBe(read(path.join(PARSE_DIR, file)));
  });

  it.each(goldenFiles)('%s: the raw golden import throws the recorded exception', (file) => {
    const row = importRows.find((r) => r.id === RAW_IMPORT_ROW);
    expect(row?.throws).toBeDefined();
    const name = simpleName(row?.throws?.class ?? '');
    expect(name).toBe('IllegalStateException');
    let thrown: Error | undefined;
    try {
      ElkGraphJson.forGraph(read(path.join(GOLDEN_DIR, file))).toElk();
    } catch (e) {
      thrown = e as Error;
    }
    expect(thrown?.constructor).toBe(EXCEPTION_CLASSES[name]);
    expect(thrown?.message).toBe(row?.throws?.message);
  });
});
