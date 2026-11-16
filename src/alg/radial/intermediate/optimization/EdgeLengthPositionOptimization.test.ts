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
import { EdgeLengthPositionOptimization } from './EdgeLengthPositionOptimization.js';

const CRITERIA = 'EDGE_LENGTH_BY_POSITION';
const rows = eadesRowsWhere((options) => options['optimizationCriteria'] === CRITERIA);

describe('EdgeLengthPositionOptimization', () => {
  it('has recorded rows (the 5 stops rows with EDGE_LENGTH_BY_POSITION that ran EadesRadial)', () => {
    expect(rows).toHaveLength(5);
  });

  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'selects the recorded offset: %s',
    (_id, row, pair) => {
      expect(eadesReplayReport(row, pair)).toBe('');
    },
  );

  // EdgeLengthPositionOptimization.java:34-49: the edge starts at (root.x + position.x + root.width / 2, root.y + position.y + root.height)
  it('measures from the position option of each target to the target center', () => {
    const tree = buildTree({ id: 'root', width: 20, height: 20, children: [{ id: 'a', width: 20, height: 20 }] });
    nodeOf(tree, 'root').setLocation(0, 0);
    nodeOf(tree, 'a').setLocation(100, 0); // center (110, 10)
    nodeOf(tree, 'a').setProperty(CoreOptions.POSITION, new KVector(40, -90)); // start (0 + 40 + 10, 0 - 90 + 20) = (50, -70)
    // the vector (60, 80) has length 100
    expect(new EdgeLengthPositionOptimization().evaluate(nodeOf(tree, 'root'))).toBe(100);
  });

  it('adds the root location to the start and sums over the edges', () => {
    const tree = buildTree({
      id: 'root',
      width: 20,
      height: 20,
      children: [
        { id: 'a', width: 20, height: 20 },
        { id: 'b', width: 20, height: 20 },
      ],
    });
    nodeOf(tree, 'root').setLocation(5, 7);
    nodeOf(tree, 'a').setLocation(100, 0); // center (110, 10)
    nodeOf(tree, 'b').setLocation(100, 0);
    nodeOf(tree, 'a').setProperty(CoreOptions.POSITION, new KVector(35, -97)); // start (5 + 35 + 10, 7 - 97 + 20) = (50, -70)
    nodeOf(tree, 'b').setProperty(CoreOptions.POSITION, new KVector(35, -97));
    expect(new EdgeLengthPositionOptimization().evaluate(nodeOf(tree, 'root'))).toBe(200);
  });

  it('is zero for a root without edges', () => {
    expect(new EdgeLengthPositionOptimization().evaluate(nodeOf(buildTree({ id: 'root' }), 'root'))).toBe(0);
  });

  // the property has no default: `position.x` of null is the recorded NullPointerException at EdgeLengthPositionOptimization.java:42
  it('throws a TypeError for a target without the POSITION option', () => {
    const tree = buildTree({ id: 'root', children: [{ id: 'a' }] });
    expect(() => new EdgeLengthPositionOptimization().evaluate(nodeOf(tree, 'root'))).toThrow(TypeError);
  });

  it('throws at the recorded site when EadesRadial replays the recorded row without positions', () => {
    const entry = rowsWithStepPair('RootAndRadius').find(
      ([row]) => row.id === 'throws/optim-edge-length-pos-without-position',
    );
    const [row, pair] = entry as NonNullable<typeof entry>;
    expect(row.expected).toMatchObject({
      throws: { class: 'java.lang.NullPointerException', frame: 'EdgeLengthPositionOptimization.java:42' },
    });
    const graph = buildStopState(row, pair.beforeIndex + 1);
    let thrown: unknown;
    try {
      replayEadesRadial(graph);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(TypeError);
    expect((thrown as TypeError).stack).toContain('EdgeLengthPositionOptimization');
  });
});
