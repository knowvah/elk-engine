// SPDX-License-Identifier: EPL-2.0
// Mission 8a (T18, TR2): the TS layout of each golden of test/golden/trees.json equals its ref
// `test/golden/refs/elk-trees/<id>.json` at AD-4 (ids, counts and section topology exact, numbers within 1e-6). The pipeline mirrors
// `tools/oracle/harness/CaseRunner.java` as `layered-hierarchy-goldens.test.ts` does; the three tree metadata providers are
// registered explicitly (TR5). The test reads refs and inputs and never writes them.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../helpers/layered-framework-replay.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { applyOverlay } from '../helpers/graph-overlay.js';
import { isGoldenEntry, loadVariantNames, repoRoot } from '../corpus/corpus.js';
import type { GoldenEntry } from '../corpus/corpus.js';
import { MrTreeMetaDataProvider } from '../../src/alg/mrtree/options/MrTreeMetaDataProvider.js';
import { RadialMetaDataProvider } from '../../src/alg/radial/options/RadialMetaDataProvider.js';
import { VertiFlexMetaDataProvider } from '../../src/alg/vertiflex/options/VertiFlexMetaDataProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { compareLayout, formatDiffs } from './compare-json.js';

const ROOT = repoRoot();
const GOLDEN_DIR = path.join(ROOT, 'test', 'golden');
const INPUTS_DIR = path.join(GOLDEN_DIR, 'trees-inputs');
const REFS_DIR = path.join(GOLDEN_DIR, 'refs', 'elk-trees');
const MANIFEST_FILE = path.join(GOLDEN_DIR, 'trees.json');
const META_FILE = path.join(REFS_DIR, '_meta.json');
const META_NAME = '_meta.json';
const REF_EXTENSION = '.json';
const ELK_COMMIT_FILE = path.join(ROOT, 'tools', 'oracle', 'ELK_COMMIT');
const JVM_FLAGS = '-XX:hashCode=2';
const RESOLVED_ALGORITHM_OPTION = 'resolvedAlgorithm';
const LAYERED_RESOLVED = 'Layout Algorithm: org.eclipse.elk.layered';

/**
 * Goldens whose ref was recorded by LAYERED, not by the tree algorithm their entry names (classified, reported to the
 * orchestrator). Mechanism: the entries carry no `retarget`, so `tools/oracle/regen-goldens.sh` `write_cases` sends no
 * `algorithm`, and the corpus-generated inputs (`test/corpus/generated/*-tree-small.json`) set none, so the oracle
 * resolved the default algorithm. Each ref's root `layoutOptions.resolvedAlgorithm` says so. Honest consequence: these
 * three goldens prove the TS layered pipeline on a tree-shaped graph and exercise no mrtree, radial or vertiflex code.
 * The test below fails when a ref is regenerated with `retarget` (the id must then leave this list).
 */
export const RECORDED_WITH_LAYERED: readonly string[] = ['mrtree-generated', 'radial-generated', 'vertiflex-generated'];

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function loadEntries(): readonly GoldenEntry[] {
  const parsed = readJson(MANIFEST_FILE) as { golden?: unknown };
  const list = parsed.golden;
  if (!Array.isArray(list) || !list.every(isGoldenEntry)) {
    throw new Error(`Invalid trees manifest: ${MANIFEST_FILE}`);
  }
  return list;
}

function layout(entry: GoldenEntry): unknown {
  const graph = ElkGraphJson.forGraph(readFileSync(path.join(INPUTS_DIR, entry.path), 'utf8')).toElk();
  applyOverlay(graph, entry.retarget ?? null, entry.variant);
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return JSON.parse(exportLikeOracle(graph)) as unknown;
}

const entries = loadEntries();

describe('tree goldens (AD-4, TR2)', () => {
  beforeAll(() => {
    // The oracle registers every algorithm; the export names an option by its shortest unique suffix, so `direction`
    // becomes `elk.direction` once layered's `priority.direction` is registered. The generated goldens run layered (below).
    registerLayered();
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new MrTreeMetaDataProvider(),
      new RadialMetaDataProvider(),
      new VertiFlexMetaDataProvider(),
    );
  });

  it('has unique ids, known variants and an input file per entry', () => {
    const known = loadVariantNames();
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    expect(entries.filter((e) => !known.includes(e.variant))).toEqual([]);
    const inputs = new Set(readdirSync(INPUTS_DIR));
    expect(entries.filter((e) => !inputs.has(e.path))).toEqual([]);
  });

  it('every ref has an entry and every entry has a ref', () => {
    const refs = readdirSync(REFS_DIR)
      .filter((name) => name !== META_NAME && name.endsWith(REF_EXTENSION))
      .map((name) => name.slice(0, -REF_EXTENSION.length))
      .sort();
    expect(refs).toEqual(entries.map((e) => e.id).sort());
  });

  it('_meta.json names the jvm flag and the pinned commit', () => {
    const meta = readJson(META_FILE) as Record<string, unknown>;
    expect(meta['jvmFlags']).toBe(JVM_FLAGS);
    expect(meta['elkCommit']).toBe(readFileSync(ELK_COMMIT_FILE, 'utf8').trim());
  });

  it('the refs record the algorithm their entry names, except the classified generated ones', () => {
    const resolved = (id: string): unknown => {
      const root = readJson(path.join(REFS_DIR, `${id}.json`)) as { layoutOptions?: Record<string, unknown> };
      return root.layoutOptions?.[RESOLVED_ALGORITHM_OPTION];
    };
    const classified = entries.filter((e) => RECORDED_WITH_LAYERED.includes(e.id));
    expect(classified.map((e) => e.id)).toEqual(RECORDED_WITH_LAYERED);
    expect(classified.map((e) => [e.retarget, resolved(e.id)])).toEqual(
      classified.map(() => [undefined, LAYERED_RESOLVED]),
    );
    const others = entries.filter((e) => !RECORDED_WITH_LAYERED.includes(e.id));
    expect(others.map((e) => resolved(e.id))).toEqual(others.map((e) => `Layout Algorithm: ${e.algorithm}`));
  });

  it.each(entries.map((entry) => [entry.id, entry] as const))('%s equals the oracle ref', (id, entry) => {
    const ref = readJson(path.join(REFS_DIR, `${id}.json`));
    const result = compareLayout(ref, layout(entry));
    expect(formatDiffs(result.diffs)).toBe('');
    expect(result.ok).toBe(true);
  });
});
