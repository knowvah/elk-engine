// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { generate } from '../../tools/melk/generate.js';
import { CompactionStrategy } from '../../src/alg/spore/options/CompactionStrategy.js';
import { OverlapRemovalStrategy } from '../../src/alg/spore/options/OverlapRemovalStrategy.js';
import { RootSelection } from '../../src/alg/spore/options/RootSelection.js';
import { SpanningTreeCostFunction } from '../../src/alg/spore/options/SpanningTreeCostFunction.js';
import { SporeCompactionOptions } from '../../src/alg/spore/options/SporeCompactionOptions.js';
import { SporeMetaDataProvider } from '../../src/alg/spore/options/SporeMetaDataProvider.js';
import { SporeOverlapRemovalOptions } from '../../src/alg/spore/options/SporeOverlapRemovalOptions.js';
import { StructureExtractionStrategy } from '../../src/alg/spore/options/StructureExtractionStrategy.js';
import { TreeConstructionStrategy } from '../../src/alg/spore/options/TreeConstructionStrategy.js';
import { OverlapRemovalLayoutProvider } from '../../src/alg/spore/OverlapRemovalLayoutProvider.js';
import { ShrinkTreeLayoutProvider } from '../../src/alg/spore/ShrinkTreeLayoutProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { diffCalls, dumpCalls, OPTION_MODEL_CALLS } from './helpers.js';
import { ALL_CALLS, optionIds, recordProvider } from './treeOptionsHelpers.js';

const OPTIONS_DIR = 'src/alg/spore/options';
const OUTPUTS = ['SporeMetaDataProvider', 'SporeOverlapRemovalOptions', 'SporeCompactionOptions'].map(
  (name) => `${OPTIONS_DIR}/${name}.ts`,
);
const CLASS_PREFIX = 'org.eclipse.elk.alg.spore.options.';
const REPOSITORY_ROOT = join(import.meta.dirname, '../..');
const DUMPED_OPTION_IDS = [
  'org.eclipse.elk.underlyingLayoutAlgorithm',
  'org.eclipse.elk.structure.structureExtractionStrategy',
  'org.eclipse.elk.processingOrder.treeConstruction',
  'org.eclipse.elk.processingOrder.spanningTreeCostFunction',
  'org.eclipse.elk.processingOrder.preferredRoot',
  'org.eclipse.elk.processingOrder.rootSelection',
  'org.eclipse.elk.compaction.compactionStrategy',
  'org.eclipse.elk.compaction.orthogonal',
  'org.eclipse.elk.overlapRemoval.maxIterations',
  'org.eclipse.elk.overlapRemoval.runScanline',
];

describe('Spore options and metadata provider', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('match what the generator emits for SPOrE (freshness)', async () => {
    const output = await generate({ bundles: ['SPOrE'], write: false });
    expect([...output.keys()].sort()).toEqual([...OUTPUTS].sort());
    for (const path of OUTPUTS) {
      expect(output.get(path)).toBe(readFileSync(join(REPOSITORY_ROOT, path), 'utf8'));
    }
  });

  it('registers the option model of the oracle dump: every id, default, bound, target, group and dependency', () => {
    const expected = dumpCalls(`${CLASS_PREFIX}SporeMetaDataProvider`, OPTION_MODEL_CALLS);
    expect(optionIds(expected)).toEqual(DUMPED_OPTION_IDS);
    expect(expected.filter((call) => call.call === 'addDependency')).toHaveLength(1);
    const optionCalls = recordProvider(new SporeMetaDataProvider()).filter((call) =>
      OPTION_MODEL_CALLS.includes(call.call),
    );
    expect(diffCalls(optionCalls, expected)).toBeNull();
  });

  it('records the calls of SporeMetaDataProvider as (i) of metadata.json, both algorithms included', () => {
    const expected = dumpCalls(`${CLASS_PREFIX}SporeMetaDataProvider`, ALL_CALLS);
    const calls = recordProvider(new SporeMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
    expect(calls.filter((call) => call.call === 'registerAlgorithm').map((call) => call.data.id)).toEqual([
      'org.eclipse.elk.sporeOverlap',
      'org.eclipse.elk.sporeCompaction',
    ]);
  });

  it.each([
    ['SporeOverlapRemovalOptions', SporeOverlapRemovalOptions, 'org.eclipse.elk.sporeOverlap'],
    ['SporeCompactionOptions', SporeCompactionOptions, 'org.eclipse.elk.sporeCompaction'],
  ] as const)('records the calls of %s as (i) of metadata.json', (name, Options, algorithmId) => {
    const expected = dumpCalls(`${CLASS_PREFIX}${name}`, ALL_CALLS);
    const calls = recordProvider(new Options(), new SporeMetaDataProvider());
    expect(diffCalls(calls, expected)).toBeNull();
    expect(calls).toHaveLength(expected.length);
    expect(Options.ALGORITHM_ID).toBe(algorithmId);
  });

  it('registers factories that construct the staged providers', () => {
    expect(new SporeOverlapRemovalOptions.SporeOverlapFactory().create()).toBeInstanceOf(OverlapRemovalLayoutProvider);
    expect(new SporeCompactionOptions.SporeCompactionFactory().create()).toBeInstanceOf(ShrinkTreeLayoutProvider);
  });

  it('exposes the option constants with the dump ids and enum defaults', () => {
    expect(SporeMetaDataProvider.PROCESSING_ORDER_ROOT_SELECTION.getDefault()).toBe(RootSelection.CENTER_NODE);
    expect(SporeMetaDataProvider.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION.getDefault()).toBe(
      SpanningTreeCostFunction.CIRCLE_UNDERLAP,
    );
    expect(SporeMetaDataProvider.PROCESSING_ORDER_TREE_CONSTRUCTION.getDefault()).toBe(
      TreeConstructionStrategy.MINIMUM_SPANNING_TREE,
    );
    expect(SporeMetaDataProvider.STRUCTURE_STRUCTURE_EXTRACTION_STRATEGY.getDefault()).toBe(
      StructureExtractionStrategy.DELAUNAY_TRIANGULATION,
    );
    expect(SporeMetaDataProvider.COMPACTION_COMPACTION_STRATEGY.getDefault()).toBe(CompactionStrategy.DEPTH_FIRST);
    expect(SporeMetaDataProvider.OVERLAP_REMOVAL_MAX_ITERATIONS.getDefault()).toBe(64);
    expect(SporeMetaDataProvider.OVERLAP_REMOVAL_RUN_SCANLINE.getDefault()).toBe(true);
  });
});

describe('Spore option enums', () => {
  it('keep the Java constants, order and names', () => {
    expect(CompactionStrategy.values().map((c) => c.name())).toEqual(['DEPTH_FIRST']);
    expect(OverlapRemovalStrategy.values().map((c) => c.name())).toEqual(['GROW_TREE']);
    expect(RootSelection.values().map((c) => c.name())).toEqual(['FIXED', 'CENTER_NODE']);
    expect(SpanningTreeCostFunction.values().map((c) => c.name())).toEqual([
      'CENTER_DISTANCE',
      'CIRCLE_UNDERLAP',
      'RECTANGLE_UNDERLAP',
      'INVERTED_OVERLAP',
      'MINIMUM_ROOT_DISTANCE',
    ]);
    expect(StructureExtractionStrategy.values().map((c) => c.name())).toEqual(['DELAUNAY_TRIANGULATION']);
    expect(TreeConstructionStrategy.values().map((c) => c.name())).toEqual([
      'MINIMUM_SPANNING_TREE',
      'MAXIMUM_SPANNING_TREE',
    ]);
  });
});
