// SPDX-License-Identifier: EPL-2.0
// Mission 8c (T13, PK2): the TS layout of each golden of test/golden/packing.json equals its ref
// `test/golden/refs/elk-packing/<id>.json` at AD-4 (ids, counts and section topology exact, numbers within 1e-6). The pipeline
// mirrors `tools/oracle/harness/CaseRunner.java` as `force-disco-goldens.test.ts` does. The oracle registers every algorithm and the
// exporter names an option by its shortest unique suffix, so every provider the oracle registers (ElkOracle.java:218-221) is
// registered explicitly. The test reads refs and inputs and never writes them.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../helpers/layered-framework-replay.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { applyOverlay } from '../helpers/graph-overlay.js';
import { isGoldenEntry, loadVariantNames, repoRoot } from '../corpus/corpus.js';
import type { GoldenEntry } from '../corpus/corpus.js';
import { PolyominoOptions } from '../../src/alg/common/compaction/options/PolyominoOptions.js';
import { DisCoMetaDataProvider } from '../../src/alg/disco/options/DisCoMetaDataProvider.js';
import { ForceMetaDataProvider } from '../../src/alg/force/options/ForceMetaDataProvider.js';
import { StressMetaDataProvider } from '../../src/alg/force/options/StressMetaDataProvider.js';
import { MrTreeMetaDataProvider } from '../../src/alg/mrtree/options/MrTreeMetaDataProvider.js';
import { RadialMetaDataProvider } from '../../src/alg/radial/options/RadialMetaDataProvider.js';
import { RectPackingMetaDataProvider } from '../../src/alg/rectpacking/options/RectPackingMetaDataProvider.js';
import { SporeMetaDataProvider } from '../../src/alg/spore/options/SporeMetaDataProvider.js';
import { TopdownpackingMetaDataProvider } from '../../src/alg/topdownpacking/options/TopdownpackingMetaDataProvider.js';
import { VertiFlexMetaDataProvider } from '../../src/alg/vertiflex/options/VertiFlexMetaDataProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { compareLayout, formatDiffs } from './compare-json.js';

const ROOT = repoRoot();
const GOLDEN_DIR = path.join(ROOT, 'test', 'golden');
const INPUTS_DIR = path.join(GOLDEN_DIR, 'packing-inputs');
const REFS_DIR = path.join(GOLDEN_DIR, 'refs', 'elk-packing');
const MANIFEST_FILE = path.join(GOLDEN_DIR, 'packing.json');
const META_FILE = path.join(REFS_DIR, '_meta.json');
const META_NAME = '_meta.json';
const REF_EXTENSION = '.json';
const ELK_COMMIT_FILE = path.join(ROOT, 'tools', 'oracle', 'ELK_COMMIT');
const JVM_FLAGS = '-XX:hashCode=2';
const RESOLVED_ALGORITHM_OPTION = 'resolvedAlgorithm';
const RESOLVED_PREFIX = 'Layout Algorithm: ';
const EXPECTED_COUNTS: Readonly<Record<string, number>> = {
  'org.eclipse.elk.rectpacking': 17,
  'org.eclipse.elk.sporeCompaction': 13,
  'org.eclipse.elk.sporeOverlap': 7,
  'org.eclipse.elk.topdownpacking': 7,
};
const EXPECTED_TOTAL = 44;
const TIE_ENTRIES: readonly string[] = [
  'sporeCompaction--minst-ties-1',
  'sporeCompaction--minst-ties-2',
  'sporeOverlap--minst-ties-1',
  'sporeOverlap--minst-ties-2',
];

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function loadEntries(): readonly GoldenEntry[] {
  const parsed = readJson(MANIFEST_FILE) as { golden?: unknown };
  const list = parsed.golden;
  if (!Array.isArray(list) || !list.every(isGoldenEntry)) {
    throw new Error(`Invalid packing manifest: ${MANIFEST_FILE}`);
  }
  return list;
}

function layout(entry: GoldenEntry): unknown {
  const graph = ElkGraphJson.forGraph(readFileSync(path.join(INPUTS_DIR, entry.path), 'utf8')).toElk();
  applyOverlay(graph, entry.retarget ?? null, entry.variant);
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return JSON.parse(exportLikeOracle(graph)) as unknown;
}

function refOf(id: string): unknown {
  return readJson(path.join(REFS_DIR, `${id}${REF_EXTENSION}`));
}

const entries = loadEntries();

describe('rectpacking, spore and topdownpacking goldens (AD-4, PK2)', () => {
  beforeAll(() => {
    // The oracle registers every algorithm; the export names an option by its shortest unique suffix.
    registerLayered();
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new PolyominoOptions(),
      new DisCoMetaDataProvider(),
      new ForceMetaDataProvider(),
      new StressMetaDataProvider(),
      new MrTreeMetaDataProvider(),
      new RadialMetaDataProvider(),
      new RectPackingMetaDataProvider(),
      new SporeMetaDataProvider(),
      new TopdownpackingMetaDataProvider(),
      new VertiFlexMetaDataProvider(),
    );
  });

  it('has 44 entries (rectpacking 17, sporeCompaction 13, sporeOverlap 7, topdownpacking 7), unique ids, known variants and an input file per entry', () => {
    const known = loadVariantNames();
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.algorithm] = (counts[e.algorithm] ?? 0) + 1;
    expect(entries).toHaveLength(EXPECTED_TOTAL);
    expect(counts).toEqual(EXPECTED_COUNTS);
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

  it('every ref records the algorithm its entry names', () => {
    const resolved = entries.map((e) => {
      const root = refOf(e.id) as { layoutOptions?: Record<string, unknown> };
      return root.layoutOptions?.[RESOLVED_ALGORITHM_OPTION];
    });
    expect(resolved).toEqual(entries.map((e) => `${RESOLVED_PREFIX}${e.algorithm}`));
  });

  it(`the four tie goldens exist and equal their refs: ${TIE_ENTRIES.join(', ')}`, () => {
    const found = TIE_ENTRIES.map((id) => entries.find((e) => e.id === id));
    expect(found.map((e) => e?.id)).toEqual(TIE_ENTRIES);
    for (const entry of found) {
      if (entry === undefined) continue;
      const result = compareLayout(refOf(entry.id), layout(entry));
      expect({ id: entry.id, diffs: formatDiffs(result.diffs) }).toEqual({ id: entry.id, diffs: '' });
    }
  });

  it.each(entries.map((entry) => [entry.id, entry] as const))(
    '%s equals the oracle ref',
    { timeout: 60_000 },
    (id, entry) => {
      const result = compareLayout(refOf(id), layout(entry));
      expect(formatDiffs(result.diffs)).toBe('');
      expect(result.ok).toBe(true);
    },
  );
});
