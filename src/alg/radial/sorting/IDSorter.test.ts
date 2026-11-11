// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { eadesReplayReport, eadesRowsWhere } from '../../../../test/helpers/radial-replay-eades-step.js';
import { buildStopState } from '../../../../test/helpers/radial-replay-dump.js';
import { buildTree, idsOf, nodeOf } from '../../../../test/helpers/radial-replay-graphs.js';
import { InternalProperties } from '../InternalProperties.js';
import { RadialOptions } from '../options/RadialOptions.js';
import { RadialUtil } from '../RadialUtil.js';
import { IDSorter } from './IDSorter.js';

const rows = eadesRowsWhere((options) => options['sorter'] === 'ID');
const TWO_PI = 2 * Math.PI;

/** The angle of a node's center around the root's center (the origin), in [0, 2 pi): EadesRadial.positionNodes places the center at (r cos a, r sin a). */
const angleOf = (node: { getX(): number; getY(): number; getWidth(): number; getHeight(): number }): number => {
  const angle = Math.atan2(node.getY() + node.getHeight() / 2, node.getX() + node.getWidth() / 2);
  return angle < 0 ? angle + TWO_PI : angle;
};

describe('IDSorter', () => {
  it('has recorded rows (the 6 stops rows with sorter ID)', () => {
    expect(rows).toHaveLength(6);
  });

  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'reproduces the recorded stop after EadesRadial: %s',
    (_id, row, pair) => {
      expect(eadesReplayReport(row, pair)).toBe('');
    },
  );

  // EadesRadial.java:121-123,127 sorts the successors by the sorter and then gives them consecutive wedges of increasing angle from
  // minAlpha (offset 0 without an optimizer): in the recorded stop the siblings' angles ascend in the sorted order, and the sorted
  // order is the order of ascending ORDER_ID (IDSorter.java:30-33, Integer.compareTo, stable)
  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'sorts the siblings of the recorded state into the recorded angular order: %s',
    (_id, row, pair) => {
      const graph = buildStopState(row, pair.beforeIndex + 1);
      const root = graph.getProperty(InternalProperties.ROOT_NODE);
      const parents = [root, ...graph.getChildren()].filter((n) => RadialUtil.getSuccessors(n).length > 1);
      expect(parents.length).toBeGreaterThan(0);
      for (const parent of parents) {
        const successors = RadialUtil.getSuccessors(parent);
        const byAngle = [...successors].sort((a, b) => angleOf(a) - angleOf(b));
        const sorter = new IDSorter();
        const reversed = [...successors].reverse();
        sorter.sort(reversed);
        // equal ids keep the order of the list given: the reversed list sorts into angular order only up to ties
        const ids = reversed.map((n) => n.getProperty(RadialOptions.ORDER_ID));
        expect(ids).toEqual([...ids].sort((a, b) => a - b));
        const sorted = [...successors];
        sorter.sort(sorted);
        expect(idsOf(sorted)).toEqual(idsOf(byAngle));
      }
    },
  );

  // IDSorter.java:30-33: Integer.compareTo on ORDER_ID, whose default is 0 (RadialOptions.ORDER_ID)
  it('orders by ORDER_ID, treats an unset id as 0 and keeps the list order of equal ids', () => {
    const tree = buildTree({ id: 'r', children: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] });
    nodeOf(tree, 'a').setProperty(RadialOptions.ORDER_ID, 5);
    nodeOf(tree, 'b').setProperty(RadialOptions.ORDER_ID, -2);
    nodeOf(tree, 'd').setProperty(RadialOptions.ORDER_ID, 5);
    const nodes = ['a', 'b', 'c', 'd'].map((id) => nodeOf(tree, id));
    new IDSorter().sort(nodes);
    expect(idsOf(nodes)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('sorts an empty list and ignores initialize', () => {
    const sorter = new IDSorter();
    const nodes: never[] = [];
    sorter.sort(nodes);
    expect(nodes).toEqual([]);
    const tree = buildTree({ id: 'r', children: [{ id: 'a' }] });
    nodeOf(tree, 'a').setProperty(RadialOptions.ORDER_ID, 3);
    sorter.initialize(nodeOf(tree, 'r'));
    expect(nodeOf(tree, 'a').getProperty(RadialOptions.ORDER_ID)).toBe(3);
  });
});
