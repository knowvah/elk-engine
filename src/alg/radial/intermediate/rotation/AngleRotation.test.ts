// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { buildStopState, compareStop, dumpRadial } from '../../../../../test/helpers/radial-replay-dump.js';
import { buildTree, nodeOf } from '../../../../../test/helpers/radial-replay-graphs.js';
import { layoutOptionsOf } from '../../../../../test/helpers/radial-replay-eades-step.js';
import {
  radialRowById,
  rowsWithStepPair,
  stopsOf,
  type RadialStopsRow,
} from '../../../../../test/helpers/radial-replay-rows.js';
import { ClassCastException } from '../../../../java/lang/ClassCastException.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../../InternalProperties.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import { AngleRotation } from './AngleRotation.js';

const WEDGE_OPTION = 'rotation.computeAdditionalWedgeSpace';
const wedgePairs = rowsWithStepPair('GeneralRotator').filter(([row]) => layoutOptionsOf(row)[WEDGE_OPTION] === 'true');

describe('AngleRotation', () => {
  it('has recorded pairs with the additional wedge space (rotate-wedge rows, 7 stops rows and the hier row excluded)', () => {
    expect(wedgePairs.length).toBeGreaterThanOrEqual(7);
  });

  it.each(wedgePairs.map(([row, pair]) => [row.id, row, pair] as const))(
    'aligns the wedge as recorded: %s',
    (_id, row, pair) => {
      const graph = buildStopState(row, pair.beforeIndex);
      new AngleRotation().rotate(graph);
      expect(compareStop(pair.after, dumpRadial(graph))).toEqual([]);
    },
  );

  // AngleRotation.java:37: `get(size - 1)` of the root's empty outgoing edge list is index -1: the recorded
  // BasicIndexOutOfBoundsException "index=-1, size=0" (throws/wedge-single-node)
  it('throws an IndexOutOfBoundsException for a root without edges when the wedge space is computed', () => {
    const row = radialRowById('throws/wedge-single-node') as unknown as RadialStopsRow;
    expect(row.expected).toMatchObject({
      throws: {
        class: 'org.eclipse.emf.common.util.BasicEList$BasicIndexOutOfBoundsException',
        message: 'index=-1, size=0',
        frame: 'AngleRotation.java:37',
      },
    });
    const stops = stopsOf(row);
    const graph = buildStopState(row, stops.length - 1);
    expect(() => new AngleRotation().rotate(graph)).toThrow(IndexOutOfBoundsException);
    expect(() => new AngleRotation().rotate(graph)).toThrow('index=-1, size=0');
  });

  // `(ElkNode)` of the edge target (AngleRotation.java:37-38): a port is a ClassCastException
  it('throws a ClassCastException when the last edge of the root ends at a port', () => {
    const tree = buildTree({ id: 'r', children: [{ id: 'a' }] });
    const root = nodeOf(tree, 'r');
    const port = ElkGraphUtil.createPort(nodeOf(tree, 'a'));
    // the root's last outgoing edge (the one read first, AngleRotation.java:37) ends at the port
    ElkGraphUtil.createSimpleEdge(root, port);
    tree.graph.setProperty(InternalProperties.ROOT_NODE, root);
    tree.graph.setProperty(RadialOptions.ROTATION_COMPUTE_ADDITIONAL_WEDGE_SPACE, true);
    expect(() => new AngleRotation().rotate(tree.graph)).toThrow(ClassCastException);
  });

  // AngleRotation.java:75-80 rotates the center of every child about the origin
  it('rotates every child about the origin by the target angle and leaves the sizes', () => {
    const tree = buildTree({
      id: 'r',
      width: 4,
      height: 4,
      children: [
        { id: 'a', width: 2, height: 4 },
        { id: 'b', width: 6, height: 2 },
      ],
    });
    nodeOf(tree, 'r').setLocation(-2, -2);
    nodeOf(tree, 'a').setLocation(9, -2); // center (10, 0)
    nodeOf(tree, 'b').setLocation(-3, 9); // center (0, 10)
    tree.graph.setProperty(RadialOptions.ROTATION_TARGET_ANGLE, Math.PI);
    new AngleRotation().rotate(tree.graph);
    const centerOf = (id: string): [number, number] => {
      const n = nodeOf(tree, id);
      return [n.getX() + n.getWidth() / 2, n.getY() + n.getHeight() / 2];
    };
    // the graph's own children include the root node, which sits at the origin and stays
    expect(centerOf('r')[0]).toBeCloseTo(0, 9);
    expect(centerOf('a')[0]).toBeCloseTo(-10, 9);
    expect(centerOf('a')[1]).toBeCloseTo(0, 9);
    expect(centerOf('b')[0]).toBeCloseTo(0, 9);
    expect(centerOf('b')[1]).toBeCloseTo(-10, 9);
    expect([nodeOf(tree, 'a').getWidth(), nodeOf(tree, 'a').getHeight()]).toEqual([2, 4]);
  });
});
