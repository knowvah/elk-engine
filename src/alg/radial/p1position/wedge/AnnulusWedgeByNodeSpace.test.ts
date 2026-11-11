// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { buildTree, nodeOf } from '../../../../../test/helpers/radial-replay-graphs.js';
import { eadesReplayReport, eadesRowsWhere } from '../../../../../test/helpers/radial-replay-eades-step.js';
import { AnnulusWedgeByNodeSpace } from './AnnulusWedgeByNodeSpace.js';

// the default criteria (NODE_SIZE) is in force in every row that sets none
const rows = eadesRowsWhere((options) => options['wedgeCriteria'] === undefined);

describe('AnnulusWedgeByNodeSpace', () => {
  it('has recorded rows to replay (every row with the default criteria)', () => {
    expect(rows.length).toBeGreaterThanOrEqual(100);
  });

  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'reproduces the recorded stop after EadesRadial: %s',
    (_id, row, pair) => {
      expect(eadesReplayReport(row, pair)).toBe('');
    },
  );

  // AnnulusWedgeByNodeSpace.java:34-46: max(sum of the successors' spaces, sqrt(h * h + w * w)); the sides below are
  // Pythagorean triples (6-8-10, 30-40-50), so the diagonals are exact
  it('returns the diagonal of a leaf', () => {
    const tree = buildTree({ id: 'leaf', width: 30, height: 40 });
    expect(new AnnulusWedgeByNodeSpace().calculateWedgeSpace(nodeOf(tree, 'leaf'))).toBe(50);
  });

  it('returns the diagonal when the successors need less', () => {
    const small = { width: 6, height: 8 };
    const tree = buildTree({
      id: 'r',
      width: 30,
      height: 40,
      children: [
        { id: 'a', ...small },
        { id: 'b', ...small },
      ],
    });
    expect(new AnnulusWedgeByNodeSpace().calculateWedgeSpace(nodeOf(tree, 'r'))).toBe(50);
  });

  it('returns the sum over the successors, recursively, when it exceeds the diagonal', () => {
    const big = { width: 30, height: 40 };
    const tree = buildTree({
      id: 'r',
      width: 6,
      height: 8,
      children: [
        { id: 'a', ...big },
        {
          id: 'b',
          width: 6,
          height: 8,
          children: [
            { id: 'b1', ...big },
            { id: 'b2', ...big },
          ],
        },
      ],
    });
    // a: 50; b: max(50 + 50, 10) = 100; r: max(50 + 100, 10) = 150
    expect(new AnnulusWedgeByNodeSpace().calculateWedgeSpace(nodeOf(tree, 'b'))).toBe(100);
    expect(new AnnulusWedgeByNodeSpace().calculateWedgeSpace(nodeOf(tree, 'r'))).toBe(150);
  });
});
