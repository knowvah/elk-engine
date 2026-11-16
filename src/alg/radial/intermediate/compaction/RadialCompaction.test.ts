// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { buildStopState, compareStop, dumpRadial } from '../../../../../test/helpers/radial-replay-dump.js';
import { layoutOptionsOf } from '../../../../../test/helpers/radial-replay-eades-step.js';
import { rowsWithStepPair } from '../../../../../test/helpers/radial-replay-rows.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../../InternalProperties.js';
import { RadialCompaction } from './RadialCompaction.js';

const pairs = rowsWithStepPair('GeneralCompactor').filter(
  ([row]) => layoutOptionsOf(row)['compactor'] === 'RADIAL_COMPACTION',
);

describe('RadialCompaction', () => {
  it('has recorded stop pairs of rows with the radial compaction, with both step sizes', () => {
    expect(pairs.length).toBeGreaterThan(5);
    expect(new Set(pairs.map(([row]) => layoutOptionsOf(row)['compactionStepSize'])).size).toBeGreaterThan(1);
  });

  // acceptance: the recorded stop before the compactor, run through `compact`, equals the recorded stop after it
  it.each(pairs.map(([row, pair]) => [row.id, row, pair] as const))(
    'compacts the recorded before state into the recorded after state: %s',
    (_id, row, pair) => {
      const graph = buildStopState(row, pair.beforeIndex);
      new RadialCompaction().compact(graph);
      expect(compareStop(pair.after, dumpRadial(graph, pair.after.step))).toEqual([]);
    },
  );

  it('contract of an empty level does nothing', () => {
    const compaction = new RadialCompaction();
    compaction.contract([]);
    expect(compaction.getCompactionStep()).toBe(1);
  });

  // RadialCompaction.java:111-115: `overlap(node, parent)` dereferences the null tree parent of a node without incoming edge
  it('a node without a tree parent makes contract throw (the NullPointerException of Java)', () => {
    const graph = ElkGraphUtil.createGraph();
    const root = ElkGraphUtil.createNode(graph);
    const orphan = ElkGraphUtil.createNode(graph);
    graph.setProperty(InternalProperties.ROOT_NODE, root);
    const compaction = new RadialCompaction();
    compaction.setRoot(root);
    expect(() => {
      compaction.contract([orphan]);
    }).toThrow(TypeError);
  });
});
