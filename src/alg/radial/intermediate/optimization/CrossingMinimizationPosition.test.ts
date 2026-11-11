// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { buildStopState } from '../../../../../test/helpers/radial-replay-dump.js';
import {
  eadesReplayReport,
  eadesRowsWhere,
  replayEadesRadial,
} from '../../../../../test/helpers/radial-replay-eades-step.js';
import { buildTree, nodeOf } from '../../../../../test/helpers/radial-replay-graphs.js';
import { rowsWithStepPair } from '../../../../../test/helpers/radial-replay-rows.js';
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { CrossingMinimizationPosition } from './CrossingMinimizationPosition.js';

const CRITERIA = 'CROSSING_MINIMIZATION_BY_POSITION';
const rows = eadesRowsWhere((options) => options['optimizationCriteria'] === CRITERIA);

/** A root at the origin without size (so rootX = rootY = 0) with the given successors at the given centers and POSITION options. */
function crossingTree(nodes: readonly (readonly [string, number, number, number, number])[]) {
  const tree = buildTree({ id: 'root', children: nodes.map(([id]) => ({ id })) });
  nodeOf(tree, 'root').setLocation(0, 0);
  for (const [id, x, y, px, py] of nodes) {
    nodeOf(tree, id).setLocation(x, y);
    nodeOf(tree, id).setProperty(CoreOptions.POSITION, new KVector(px, py));
  }
  return tree;
}

describe('CrossingMinimizationPosition', () => {
  it('has recorded rows (the 5 stops rows with CROSSING_MINIMIZATION_BY_POSITION that ran EadesRadial)', () => {
    expect(rows).toHaveLength(5);
  });

  // the recorded stop also holds the POSITION values after the 360 evaluations, which mutate them in place (:72-73, :84-85)
  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'selects the recorded offset and leaves the recorded mutated positions: %s',
    (_id, row, pair) => {
      expect(eadesReplayReport(row, pair)).toBe('');
    },
  );

  // CrossingMinimizationPosition.java:62-105: the segment of a node runs from its POSITION (shifted by rootX, rootY) to its center;
  // two segments cross when their lines meet inside both
  it('counts crossing segments', () => {
    // segments (0,100)-(100,0) and (0,0)-(100,100) meet at (50, 50)
    const tree = crossingTree([
      ['a', 100, 0, 0, 100],
      ['b', 100, 100, 0, 0],
    ]);
    expect(new CrossingMinimizationPosition().evaluate(nodeOf(tree, 'root'))).toBe(1);
  });

  it('does not count segments whose lines meet outside', () => {
    // lines y = -x + 100 and y = x + 200 meet at x = -50, left of both segments
    const tree = crossingTree([
      ['a', 100, 0, 0, 100],
      ['b', 100, 300, 0, 200],
    ]);
    expect(new CrossingMinimizationPosition().evaluate(nodeOf(tree, 'root'))).toBe(0);
  });

  it('does not count when the cut is right of the second segment only', () => {
    // a: (0,100)-(100,0) is y = -x + 100; b: (200,0)-(300,100) is y = x - 200; they meet at x = 150: right of a, left of b
    const tree = crossingTree([
      ['a', 100, 0, 0, 100],
      ['b', 300, 100, 200, 0],
    ]);
    expect(new CrossingMinimizationPosition().evaluate(nodeOf(tree, 'root'))).toBe(0);
  });

  it('counts every crossing pair once and is zero for fewer than two successors', () => {
    const pairs = crossingTree([
      ['a', 100, 0, 0, 100],
      ['b', 100, 100, 0, 0],
      ['c', 100, 50, 0, 50],
    ]);
    // a x b at (50, 50); a x c: y = -x + 100 and y = 50 meet at x = 50, inside both; b x c: y = x and y = 50 meet at x = 50
    expect(new CrossingMinimizationPosition().evaluate(nodeOf(pairs, 'root'))).toBe(3);
    const single = crossingTree([['a', 100, 0, 0, 100]]);
    expect(new CrossingMinimizationPosition().evaluate(nodeOf(single, 'root'))).toBe(0);
  });

  // upstream oddities kept verbatim: rootY reads root.getX() and root.getWidth() (CrossingMinimizationPosition.java:64), and the
  // node's own POSITION KVector is shifted in place (:71-73)
  it('derives rootY from the root x and width and shifts the POSITION values in place', () => {
    const tree = buildTree({ id: 'root', width: 20, height: 999, children: [{ id: 'a' }, { id: 'b' }] });
    const root = nodeOf(tree, 'root');
    root.setLocation(10, 1000); // rootX = 10 + 20 / 2 = 20; rootY = 10 + 20 / 2 = 20, whatever the y is
    const position = new KVector(1, 2);
    nodeOf(tree, 'a').setProperty(CoreOptions.POSITION, position);
    nodeOf(tree, 'b').setProperty(CoreOptions.POSITION, new KVector(3, 4));
    nodeOf(tree, 'a').setLocation(100, 0);
    nodeOf(tree, 'b').setLocation(100, 100);
    new CrossingMinimizationPosition().evaluate(root);
    expect(nodeOf(tree, 'a').getProperty(CoreOptions.POSITION)).toBe(position);
    expect([position.x, position.y]).toEqual([21, 22]);
    const second = nodeOf(tree, 'b').getProperty(CoreOptions.POSITION);
    expect([second.x, second.y]).toEqual([23, 24]);
  });

  it('throws a TypeError for a node without the POSITION option (the property has no default)', () => {
    const tree = buildTree({ id: 'root', children: [{ id: 'a' }, { id: 'b' }] });
    expect(() => new CrossingMinimizationPosition().evaluate(nodeOf(tree, 'root'))).toThrow(TypeError);
  });

  it('throws at the recorded site when EadesRadial replays the recorded row without positions', () => {
    const entry = rowsWithStepPair('RootAndRadius').find(
      ([row]) => row.id === 'throws/optim-crossing-pos-without-position',
    );
    const [row, pair] = entry as NonNullable<typeof entry>;
    expect(row.expected).toMatchObject({
      throws: { class: 'java.lang.NullPointerException', frame: 'CrossingMinimizationPosition.java:72' },
    });
    const graph = buildStopState(row, pair.beforeIndex + 1);
    let thrown: unknown;
    try {
      replayEadesRadial(graph);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(TypeError);
    expect((thrown as TypeError).stack).toContain('CrossingMinimizationPosition');
  });
});
