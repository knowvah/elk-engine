// SPDX-License-Identifier: EPL-2.0
// Mission 8b (T11, FD2): the TS layout of each golden of test/golden/force-disco.json equals its ref
// `test/golden/refs/elk-force-disco/<id>.json` at AD-4 (ids, counts and section topology exact, numbers within 1e-6). The pipeline
// mirrors `tools/oracle/harness/CaseRunner.java` as `tree-goldens.test.ts` does. The oracle registers every algorithm and the
// exporter names an option by its shortest unique suffix, so the providers of this mission, `PolyominoOptions`, layered and the
// tree algorithms are registered explicitly. The test reads refs and inputs and never writes them.
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
import { DisCoOptions } from '../../src/alg/disco/options/DisCoOptions.js';
import { ForceMetaDataProvider } from '../../src/alg/force/options/ForceMetaDataProvider.js';
import { ForceOptions } from '../../src/alg/force/options/ForceOptions.js';
import { StressMetaDataProvider } from '../../src/alg/force/options/StressMetaDataProvider.js';
import { StressOptions } from '../../src/alg/force/options/StressOptions.js';
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
const INPUTS_DIR = path.join(GOLDEN_DIR, 'force-disco-inputs');
const REFS_DIR = path.join(GOLDEN_DIR, 'refs', 'elk-force-disco');
const MANIFEST_FILE = path.join(GOLDEN_DIR, 'force-disco.json');
const META_FILE = path.join(REFS_DIR, '_meta.json');
const META_NAME = '_meta.json';
const REF_EXTENSION = '.json';
const ELK_COMMIT_FILE = path.join(ROOT, 'tools', 'oracle', 'ELK_COMMIT');
const JVM_FLAGS = '-XX:hashCode=2';
const RESOLVED_ALGORITHM_OPTION = 'resolvedAlgorithm';
const RESOLVED_PREFIX = 'Layout Algorithm: ';
const FORCE_ID = 'org.eclipse.elk.force';
const STRESS_ID = 'org.eclipse.elk.stress';
const DISCO_ID = 'org.eclipse.elk.disco';
const EXPECTED_COUNTS: Readonly<Record<string, number>> = { [FORCE_ID]: 15, [STRESS_ID]: 10, [DISCO_ID]: 20 };
const EXPECTED_TOTAL = 45;
const DEFAULT_ID = 'disco--default';
const NO_OP_PREFIXES: readonly string[] = ['disco--lowLevelSort-', 'disco--highLevelSort-', 'disco--traversalStrategy-'];
const EXPECTED_NO_OPS = 12;

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function loadEntries(): readonly GoldenEntry[] {
  const parsed = readJson(MANIFEST_FILE) as { golden?: unknown };
  const list = parsed.golden;
  if (!Array.isArray(list) || !list.every(isGoldenEntry)) {
    throw new Error(`Invalid force-disco manifest: ${MANIFEST_FILE}`);
  }
  return list;
}

/**
 * Classified, options-only difference 1 (the geometry of the entry is still compared in full). The oracle exports DisCo's
 * `debug.discoGraph` option as Java's identity `toString` (`org.eclipse.elk.alg.disco.graph.DCGraph@<hash>`; `DCGraph` has no
 * `toString`), which a TypeScript object cannot reproduce. Only the value of that one key is neutralised, on both sides, after the
 * ref's value was asserted to have the Java identity form.
 */
const IDENTITY_KEY = 'debug.discoGraph';
const IDENTITY_FORM = /^org\.eclipse\.elk\.alg\.disco\.graph\.DCGraph@[0-9a-f]+$/;
const IDENTITY_NEUTRAL = '<identity toString>';

/**
 * Classified, options-only difference 2. The oracle registers `rectpacking`, whose option `packing.compaction.iterations` shares the
 * suffix `iterations` with force's, so the exporter names force's `force.iterations`; the TS registry has no rectpacking bundle
 * yet (mission 8c), so it names it `iterations`. Per entry: the key the ref has and the key the TS export has. The test fails once
 * the TS export names the ref's key, so the row must then be removed.
 */
const SUFFIX_DIFFERENCES: Readonly<Record<string, { readonly ref: string; readonly actual: string }>> = {
  'force--iterations-50': { ref: 'force.iterations', actual: 'iterations' },
};

type LayoutOptions = Record<string, unknown>;

function rootOptions(root: unknown): LayoutOptions {
  return (root as { layoutOptions?: LayoutOptions }).layoutOptions ?? {};
}

function neutraliseIdentity(root: unknown, side: 'ref' | 'actual'): void {
  const walk = (node: unknown): void => {
    const options = (node as { layoutOptions?: LayoutOptions }).layoutOptions;
    if (options !== undefined && IDENTITY_KEY in options) {
      if (side === 'ref') expect(String(options[IDENTITY_KEY])).toMatch(IDENTITY_FORM);
      options[IDENTITY_KEY] = IDENTITY_NEUTRAL;
    }
    for (const child of (node as { children?: unknown[] }).children ?? []) walk(child);
  };
  walk(root);
}

function renameSuffix(id: string, actual: unknown): void {
  const difference = SUFFIX_DIFFERENCES[id];
  if (difference === undefined) return;
  const options = rootOptions(actual);
  expect(Object.keys(options)).toContain(difference.actual);
  options[difference.ref] = options[difference.actual];
  delete options[difference.actual];
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
const noOpEntries = entries.filter((e) => NO_OP_PREFIXES.some((prefix) => e.id.startsWith(prefix)));

describe('force, stress and disco goldens (AD-4, FD2)', () => {
  beforeAll(() => {
    // The oracle registers every algorithm; the export names an option by its shortest unique suffix.
    registerLayered();
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new PolyominoOptions(),
      new DisCoMetaDataProvider(),
      new DisCoOptions(),
      new ForceMetaDataProvider(),
      new ForceOptions(),
      new StressMetaDataProvider(),
      new StressOptions(),
      new MrTreeMetaDataProvider(),
      new RadialMetaDataProvider(),
      new VertiFlexMetaDataProvider(),
    );
  });

  it('has 45 entries (force 15, stress 10, disco 20), unique ids, known variants and an input file per entry', () => {
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

  it('the classified suffix differences name keys the ref has', () => {
    for (const [id, difference] of Object.entries(SUFFIX_DIFFERENCES)) {
      expect(Object.keys(rootOptions(refOf(id)))).toContain(difference.ref);
    }
  });

  it.each(entries.map((entry) => [entry.id, entry] as const))('%s equals the oracle ref', (id, entry) => {
    const ref = refOf(id);
    const actual = layout(entry);
    neutraliseIdentity(ref, 'ref');
    neutraliseIdentity(actual, 'actual');
    renameSuffix(id, actual);
    const result = compareLayout(ref, actual);
    expect(formatDiffs(result.diffs)).toBe('');
    expect(result.ok).toBe(true);
  });

  it('the 12 no-op disco goldens lay out exactly as disco--default (upstream no-op, issue #69)', { timeout: 60_000 }, () => {
    expect(noOpEntries).toHaveLength(EXPECTED_NO_OPS);
    const defaultEntry = entries.find((e) => e.id === DEFAULT_ID);
    expect(defaultEntry?.id).toBe(DEFAULT_ID);
    if (defaultEntry === undefined) return;
    const defaultLayout = layout(defaultEntry) as { children?: unknown; edges?: unknown };
    for (const entry of noOpEntries) {
      const noOp = layout(entry) as { children?: unknown; edges?: unknown };
      expect({ id: entry.id, children: noOp.children, edges: noOp.edges }).toEqual({
        id: entry.id,
        children: defaultLayout.children,
        edges: defaultLayout.edges,
      });
    }
  });
});
