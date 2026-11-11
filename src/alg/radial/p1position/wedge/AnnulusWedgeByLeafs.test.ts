// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { buildTree, nodeOf } from '../../../../../test/helpers/radial-replay-graphs.js';
import { eadesReplayReport, eadesRowsWhere } from '../../../../../test/helpers/radial-replay-eades-step.js';
import { AnnulusWedgeByLeafs } from './AnnulusWedgeByLeafs.js';

const LEAF_NUMBER = 'LEAF_NUMBER';
const rows = eadesRowsWhere((options) => options['wedgeCriteria'] === LEAF_NUMBER);

describe('AnnulusWedgeByLeafs', () => {
  it('has recorded rows to replay (the 6 stops rows of the ref with LEAF_NUMBER)', () => {
    expect(rows.length).toBe(6);
  });

  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'reproduces the recorded stop after EadesRadial: %s',
    (_id, row, pair) => {
      expect(eadesReplayReport(row, pair)).toBe('');
    },
  );

  // AnnulusWedgeByLeafs.java:30-32 returns RadialUtil.getNumberOfLeaves(node) (RadialUtil.java:119-130: 1 for a node without successors)
  it('returns 1 for a leaf and the number of leaves below an inner node', () => {
    const tree = buildTree({
      id: 'r',
      children: [{ id: 'a', children: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] }, { id: 'b' }],
    });
    const criteria = new AnnulusWedgeByLeafs();
    expect(criteria.calculateWedgeSpace(nodeOf(tree, 'b'))).toBe(1);
    expect(criteria.calculateWedgeSpace(nodeOf(tree, 'a'))).toBe(3);
    expect(criteria.calculateWedgeSpace(nodeOf(tree, 'r'))).toBe(4);
  });
});
