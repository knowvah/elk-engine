// SPDX-License-Identifier: EPL-2.0
// docs-publish-prep T3 (DP4): the documentation examples under test/docs/examples/ are real programs, and their output
// is the oracle's. Each example has an input twin in test/golden/examples-inputs/ that the oracle laid out into
// test/golden/refs/elk-examples/ (`tools/oracle/regen-goldens.sh --set examples`, recorded before this test was
// written, AD-13). The test checks that an example builds the graph of its twin, and that its laid-out output equals
// the ref at AD-4 (structure exact, numbers within 1e-6). It reads refs and inputs and never writes them.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  DisCoMetaDataProvider,
  ElkGraphJson,
  ForceMetaDataProvider,
  LayeredMetaDataProvider,
  LayoutMetaDataService,
  MrTreeMetaDataProvider,
  PolyominoOptions,
  RadialMetaDataProvider,
  RectPackingMetaDataProvider,
  SporeMetaDataProvider,
  StressMetaDataProvider,
  TopdownpackingMetaDataProvider,
  VertiFlexMetaDataProvider,
} from '@knowvah/elk-engine';
import type { ElkNode } from '@knowvah/elk-engine';
import { isGoldenEntry, repoRoot } from '../corpus/corpus.js';
import type { GoldenEntry } from '../corpus/corpus.js';
import { compareLayout, formatDiffs } from '../golden/compare-json.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { buildAndLayout, buildGraph } from './examples/build-and-layout.js';
import { layoutJson } from './examples/json-roundtrip.js';
import { buildTree, layoutTree } from './examples/tree-layout.js';

const ROOT = repoRoot();
const GOLDEN_DIR = path.join(ROOT, 'test', 'golden');
const EXAMPLES_DIR = path.join(ROOT, 'test', 'docs', 'examples');
const INPUTS_DIR = path.join(GOLDEN_DIR, 'examples-inputs');
const REFS_DIR = path.join(GOLDEN_DIR, 'refs', 'elk-examples');
const MANIFEST_FILE = path.join(GOLDEN_DIR, 'examples.json');
const PATCHES_DIR = path.join(ROOT, 'tools', 'oracle', 'patches');
const ELK_COMMIT_FILE = path.join(ROOT, 'tools', 'oracle', 'ELK_COMMIT');
const META_NAME = '_meta.json';
const JSON_EXTENSION = '.json';
const TS_EXTENSION = '.ts';
const PATCH_EXTENSION = '.patch';
const JVM_FLAGS = '-XX:hashCode=2';
const PACKAGE_NAME = '@knowvah/elk-engine';

/** One documentation example: its id (file name, twin name and ref name), and how the test runs it. */
interface Example {
  readonly id: string;
  /** The graph before layout, for the examples that build one in code; the JSON example takes its twin as input. */
  readonly build?: () => ElkNode;
  /** The example's laid-out output as ELK JSON text. */
  readonly run: () => string;
}

function inputText(id: string): string {
  return readFileSync(path.join(INPUTS_DIR, `${id}${JSON_EXTENSION}`), 'utf8');
}

const EXAMPLES: readonly Example[] = [
  { id: 'build-and-layout', build: buildGraph, run: () => exportLikeOracle(buildAndLayout()) },
  { id: 'json-roundtrip', run: () => layoutJson(inputText('json-roundtrip')) },
  { id: 'tree-layout', build: buildTree, run: () => exportLikeOracle(layoutTree()) },
];
const BUILT = EXAMPLES.filter((example) => example.build !== undefined);

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function loadEntries(): readonly GoldenEntry[] {
  const list = (readJson(MANIFEST_FILE) as { golden?: unknown }).golden;
  if (!Array.isArray(list) || !list.every(isGoldenEntry))
    throw new Error(`Invalid examples manifest: ${MANIFEST_FILE}`);
  return list;
}

function namesIn(dir: string, extension: string): readonly string[] {
  return readdirSync(dir)
    .filter((name) => name !== META_NAME && name.endsWith(extension))
    .map((name) => name.slice(0, -extension.length))
    .sort();
}

/** The module specifiers an example file imports from. */
function importSpecifiers(id: string): readonly string[] {
  const source = readFileSync(path.join(EXAMPLES_DIR, `${id}${TS_EXTENSION}`), 'utf8');
  const specifier = new RegExp('from \\x27([^\\x27]+)\\x27;', 'g');
  return [...source.matchAll(specifier)].map((match) => match[1] ?? '');
}

const entries = loadEntries();
const ids = EXAMPLES.map((example) => example.id).sort();

describe('documentation examples against the oracle (DP4, AD-4)', () => {
  beforeAll(() => {
    // The oracle registers every algorithm (ElkOracle.java:218-221) and the exporter names an option by its shortest
    // unique suffix, so the refs' option keys need the same registry. An example registers only what it uses.
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new PolyominoOptions(),
      new DisCoMetaDataProvider(),
      new ForceMetaDataProvider(),
      new LayeredMetaDataProvider(),
      new MrTreeMetaDataProvider(),
      new RadialMetaDataProvider(),
      new RectPackingMetaDataProvider(),
      new SporeMetaDataProvider(),
      new StressMetaDataProvider(),
      new TopdownpackingMetaDataProvider(),
      new VertiFlexMetaDataProvider(),
    );
  });

  it('every example file has a manifest entry, an input twin and an oracle ref, and nothing else has', () => {
    expect(namesIn(EXAMPLES_DIR, TS_EXTENSION)).toEqual(ids);
    expect(entries.map((entry) => entry.id).sort()).toEqual(ids);
    expect(entries.map((entry) => entry.path).sort()).toEqual(ids.map((id) => `${id}${JSON_EXTENSION}`));
    expect(namesIn(INPUTS_DIR, JSON_EXTENSION)).toEqual(ids);
    expect(namesIn(REFS_DIR, JSON_EXTENSION)).toEqual(ids);
  });

  it('_meta.json names the pinned commit, the current patch set and the jvm flag', () => {
    const meta = readJson(path.join(REFS_DIR, META_NAME)) as Record<string, unknown>;
    expect(meta['elkCommit']).toBe(readFileSync(ELK_COMMIT_FILE, 'utf8').trim());
    expect(meta['patches']).toEqual(namesIn(PATCHES_DIR, PATCH_EXTENSION).map((name) => `${name}${PATCH_EXTENSION}`));
    expect(meta['jvmFlags']).toBe(JVM_FLAGS);
  });

  it('every ref records the algorithm its entry names', () => {
    const resolved = entries.map((entry) => {
      const root = readJson(path.join(REFS_DIR, `${entry.id}${JSON_EXTENSION}`)) as {
        layoutOptions?: Record<string, unknown>;
      };
      return root.layoutOptions?.['resolvedAlgorithm'];
    });
    expect(resolved).toEqual(entries.map((entry) => `Layout Algorithm: ${entry.algorithm}`));
  });

  it(`every example imports from ${PACKAGE_NAME} only`, () => {
    const specifiers = ids.map((id) => [...new Set(importSpecifiers(id))]);
    expect(specifiers).toEqual(ids.map(() => [PACKAGE_NAME]));
  });

  it.each(BUILT.map((example) => [example.id, example] as const))(
    '%s builds the graph of its input twin',
    (id, example) => {
      const twin = ElkGraphJson.forGraph(inputText(id)).toElk();
      const built = (example.build as () => ElkNode)();
      const result = compareLayout(JSON.parse(exportLikeOracle(twin)), JSON.parse(exportLikeOracle(built)));
      expect(formatDiffs(result.diffs)).toBe('');
      expect(result.ok).toBe(true);
    },
  );

  it.each(EXAMPLES.map((example) => [example.id, example] as const))(
    '%s lays out to the oracle ref',
    { timeout: 60_000 },
    (id, example) => {
      const ref = readJson(path.join(REFS_DIR, `${id}${JSON_EXTENSION}`));
      const result = compareLayout(ref, JSON.parse(example.run()));
      expect(formatDiffs(result.diffs)).toBe('');
      expect(result.ok).toBe(true);
    },
  );
});
