// SPDX-License-Identifier: EPL-2.0
// Twin tests of the compound sweep helper (mission 7h, T13): each replay equals the engine driven by hand on the vendored inputs of
// test/golden/inputs/compound, which hold copies of the corpus files the sweep reads.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { Direction } from '../../src/core/options/Direction.js';
import { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { repoRoot } from '../corpus/corpus.js';
import { replayCase as replayLabels } from './layered-labels-sweep.js';
import { loadInput } from './layered-phase-replay-rows.js';
import { elkDump } from './layered-pipeline-sweep.js';
import { compoundHash, PART_A, PART_C, replayCase, type CompoundSweepCase } from './layered-compound-sweep.js';

const VENDORED = path.join(repoRoot(), 'test', 'golden', 'inputs', 'compound');
const ELKT_MODEL = 'tickets/layered/455_longHierarchicalEdges';
const JSON_MODEL = 'realworld/ptolemy/hierarchical/continuous_squarewave_SquareWave.json';
const HASH_LENGTH = 64;

const caseOf = (part: CompoundSweepCase['part'], model: string, variant: string): CompoundSweepCase => ({
  id: `${part}/model/${model}/${variant}`,
  part,
  model,
  variant,
});

describe('layered compound sweep helper', () => {
  beforeAll(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it('an .elkt case replays as the labels sweep helper does (default and a direction)', () => {
    for (const variant of ['default', 'DOWN']) {
      const line = caseOf(PART_A, `${ELKT_MODEL}.elkt`, variant);
      const labels = replayLabels({ id: line.id, kind: 'model', model: ELKT_MODEL, target: null, variant }, VENDORED);
      expect(compoundHash(replayCase(line, VENDORED))).toBe(compoundHash(labels));
    }
  });

  it('a part c .json case equals the engine driven by hand with INCLUDE_CHILDREN and a direction on the root', () => {
    const root = loadInput({ elk: readFileSync(path.join(VENDORED, JSON_MODEL), 'utf8') });
    root.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    root.setProperty(CoreOptions.DIRECTION, Direction.UP);
    new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
    const hash = compoundHash(replayCase(caseOf(PART_C, JSON_MODEL, 'UP'), VENDORED));
    expect(hash).toBe(compoundHash(elkDump(root)));
    expect(hash).toHaveLength(HASH_LENGTH);
  });

  it('a .json case of another part keeps the handling of the file (no INCLUDE_CHILDREN is set on its root)', () => {
    const root = loadInput({ elk: readFileSync(path.join(VENDORED, JSON_MODEL), 'utf8') });
    new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
    expect(compoundHash(replayCase(caseOf('b', JSON_MODEL, 'default'), VENDORED))).toBe(compoundHash(elkDump(root)));
  });
});
