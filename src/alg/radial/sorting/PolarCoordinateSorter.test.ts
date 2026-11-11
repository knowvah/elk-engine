// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { buildStopState, dumpRadial } from '../../../../test/helpers/radial-replay-dump.js';
import {
  eadesReplayReport,
  eadesRowsWhere,
  replayEadesRadial,
} from '../../../../test/helpers/radial-replay-eades-step.js';
import { buildTree, idsOf, nodeOf } from '../../../../test/helpers/radial-replay-graphs.js';
import { rowsWithStepPair, type HexProp } from '../../../../test/helpers/radial-replay-rows.js';
import { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { InternalProperties } from '../InternalProperties.js';
import { RadialOptions } from '../options/RadialOptions.js';
import { PolarCoordinateSorter } from './PolarCoordinateSorter.js';

const rows = eadesRowsWhere((options) => options['sorter'] === 'POLAR_COORDINATE');
const orderIds = (props: readonly HexProp[]): readonly HexProp[] => props.filter((p) => p[1] === 'orderId');

describe('PolarCoordinateSorter', () => {
  it('has recorded rows (the 8 stops rows with sorter POLAR_COORDINATE that ran EadesRadial)', () => {
    expect(rows).toHaveLength(8);
  });

  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'reproduces the recorded stop after EadesRadial, order ids included: %s',
    (_id, row, pair) => {
      expect(eadesReplayReport(row, pair)).toBe('');
      expect(orderIds(pair.after.props).length).toBeGreaterThan(0);
    },
  );

  // the recorder dumps ORDER_ID, which the sorter writes on every node it visits; the last `initialize` of EadesRadial.positionNodes
  // (EadesRadial.java:121-122) runs on the final positions, which the stop after EadesRadial records, so initialize on that state must
  // rewrite exactly the recorded ids
  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'initialize on the recorded final positions writes the recorded order ids: %s',
    (_id, row, pair) => {
      const graph = buildStopState(row, pair.beforeIndex + 1);
      const nodes = [...graph.getChildren()];
      for (const node of nodes) {
        node.setProperty(RadialOptions.ORDER_ID, null);
      }
      new PolarCoordinateSorter().initialize(graph.getProperty(InternalProperties.ROOT_NODE));
      expect(orderIds(dumpRadial(graph).props)).toEqual(orderIds(pair.after.props));
    },
  );

  // PolarCoordinateSorter.java:94-102: sort without initialize finds the tree root of nodes[0] and initializes from it
  it.each(rows.map(([row, pair]) => [row.id, row, pair] as const))(
    'sort initializes lazily from the tree root of the first node: %s',
    (_id, row, pair) => {
      const graph = buildStopState(row, pair.beforeIndex + 1);
      const root = graph.getProperty(InternalProperties.ROOT_NODE);
      const first = graph.getChildren().get(1);
      for (const node of graph.getChildren()) {
        node.setProperty(RadialOptions.ORDER_ID, null);
      }
      new PolarCoordinateSorter().sort([first]);
      expect(orderIds(dumpRadial(graph).props)).toEqual(orderIds(pair.after.props));
      expect(root.hasProperty(RadialOptions.ORDER_ID)).toBe(false);
    },
  );

  // PolarCoordinateSorter.java:63-88: ids count up per sorted level; with all nodes on the right of their parent (arc < 45 degrees)
  // the successors of each node are sorted by compLeft (offset PI), and the first layer by compRight (offset 0)
  it('numbers the first layer by angle from the right, clockwise in screen terms (ascending atan2 in [0, 2 pi))', () => {
    const tree = buildTree({ id: 'r', children: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    // POSITION option (x, y): atan2(y, x) = 3pi/2 (0, -1), pi/2 (0, 1), pi (-1, 0)
    nodeOf(tree, 'a').setProperty(CoreOptions.POSITION, new KVector(0, -1));
    nodeOf(tree, 'b').setProperty(CoreOptions.POSITION, new KVector(0, 1));
    nodeOf(tree, 'c').setProperty(CoreOptions.POSITION, new KVector(-1, 0));
    new PolarCoordinateSorter().initialize(nodeOf(tree, 'r'));
    const ids = ['a', 'b', 'c'].map((id) => nodeOf(tree, id).getProperty(RadialOptions.ORDER_ID));
    expect(ids).toEqual([2, 0, 1]);
  });

  it('sorts a list by the ids assigned by initialize', () => {
    const tree = buildTree({ id: 'r', children: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    nodeOf(tree, 'a').setProperty(CoreOptions.POSITION, new KVector(0, -1));
    nodeOf(tree, 'b').setProperty(CoreOptions.POSITION, new KVector(0, 1));
    nodeOf(tree, 'c').setProperty(CoreOptions.POSITION, new KVector(-1, 0));
    const sorter = new PolarCoordinateSorter();
    const nodes = ['a', 'b', 'c'].map((id) => nodeOf(tree, id));
    sorter.sort(nodes);
    expect(idsOf(nodes)).toEqual(['b', 'c', 'a']);
  });

  it('sorting an empty list does not initialize', () => {
    const nodes: never[] = [];
    new PolarCoordinateSorter().sort(nodes);
    expect(nodes).toEqual([]);
  });

  // RadialUtil.java:154 / PolarCoordinateSorter.initialize: a node without the POSITION option (no default) is a NullPointerException
  const throwsRow = rowsWithStepPair('RootAndRadius').find(([row]) => row.id === 'throws/polar-without-position');

  it('throws a TypeError at the RadialUtil comparator for a node without POSITION, as the recorded NullPointerException', () => {
    expect(throwsRow).toBeDefined();
    const [row, pair] = throwsRow as NonNullable<typeof throwsRow>;
    expect(row.expected).toMatchObject({
      throws: { class: 'java.lang.NullPointerException', frame: 'RadialUtil.java:154' },
    });
    const graph = buildStopState(row, pair.beforeIndex + 1);
    let thrown: unknown;
    try {
      replayEadesRadial(graph);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(TypeError);
    expect((thrown as TypeError).stack).toContain('RadialUtil');
  });
});
