// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { eadesReplayReport, eadesRowsWhere } from '../../../../../test/helpers/radial-replay-eades-step.js';
import { buildTree, nodeOf } from '../../../../../test/helpers/radial-replay-graphs.js';
import { EdgeLengthOptimization } from './EdgeLengthOptimization.js';

const rows = eadesRowsWhere((options) => options['optimizationCriteria'] === 'EDGE_LENGTH');

describe('EdgeLengthOptimization', () => {
  it('has recorded rows (the 6 stops rows with EDGE_LENGTH)', () => {
    expect(rows).toHaveLength(6);
  });

  // EadesRadial.translate (EadesRadial.java:68-89) picks the first of 360 offsets with the smallest evaluate(root): the recorded stop
  // after EadesRadial holds the layout of that offset, so only an exact evaluate reproduces it
  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'selects the recorded offset: %s',
    (_id, row, pair) => {
      expect(eadesReplayReport(row, pair)).toBe('');
    },
  );

  // EdgeLengthOptimization.java:34-69: per outgoing edge the center-to-center vector minus the clip at both nodes' borders
  // (ElkMath.clipVector), so for axis-aligned neighbours the length is the center distance minus half of each node's extent
  it('sums the border-to-border lengths of the root edges', () => {
    const tree = buildTree({
      id: 'root',
      width: 20,
      height: 20,
      children: [
        { id: 'right', width: 20, height: 20 },
        { id: 'below', width: 40, height: 40 },
      ],
    });
    nodeOf(tree, 'root').setLocation(0, 0);
    nodeOf(tree, 'right').setLocation(100, 0); // centers (10, 10) and (110, 10): 100 - 10 - 10
    nodeOf(tree, 'below').setLocation(-10, 80); // center (10, 100): 90 - 10 - 20
    expect(new EdgeLengthOptimization().evaluate(nodeOf(tree, 'root'))).toBe(80 + 60);
  });

  it('is zero for a root without edges', () => {
    const tree = buildTree({ id: 'root', width: 20, height: 20 });
    expect(new EdgeLengthOptimization().evaluate(nodeOf(tree, 'root'))).toBe(0);
  });
});
