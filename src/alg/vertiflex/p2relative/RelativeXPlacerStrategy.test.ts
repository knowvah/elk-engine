// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { RelativeXPlacer } from './RelativeXPlacer.js';
import { RelativeXPlacerStrategy } from './RelativeXPlacerStrategy.js';
import { splitGroup, splitNodesWithModelOrder } from './RelativeXPlacerSorting.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../InternalProperties.js';
import { Pair } from '../../../core/util/Pair.js';

describe('RelativeXPlacerStrategy (RelativeXPlacerStrategy.java)', () => {
  it('has the one constant SIMPLE_X_PLACING, found by name and ordinal', () => {
    expect(RelativeXPlacerStrategy.values()).toEqual([RelativeXPlacerStrategy.SIMPLE_X_PLACING]);
    expect(RelativeXPlacerStrategy.valueOf('SIMPLE_X_PLACING')).toBe(RelativeXPlacerStrategy.SIMPLE_X_PLACING);
    expect(RelativeXPlacerStrategy.SIMPLE_X_PLACING.name()).toBe('SIMPLE_X_PLACING');
    expect(RelativeXPlacerStrategy.SIMPLE_X_PLACING.toString()).toBe('SIMPLE_X_PLACING');
    expect(RelativeXPlacerStrategy.SIMPLE_X_PLACING.ordinal()).toBe(0);
    expect(RelativeXPlacerStrategy.SIMPLE_X_PLACING.compareTo(RelativeXPlacerStrategy.SIMPLE_X_PLACING)).toBe(0);
    expect(() => RelativeXPlacerStrategy.valueOf('NOPE')).toThrow(
      'No enum constant org.eclipse.elk.alg.vertiflex.p2relative.RelativeXPlacerStrategy.NOPE',
    );
  });

  it('creates a RelativeXPlacer per call (Java :36-38)', () => {
    const first = RelativeXPlacerStrategy.SIMPLE_X_PLACING.create();
    expect(first).toBeInstanceOf(RelativeXPlacer);
    expect(RelativeXPlacerStrategy.SIMPLE_X_PLACING.create()).not.toBe(first);
  });

  it('throws IllegalArgumentException with the Java message for a constant without an implementation (Java :40-42)', () => {
    const create = RelativeXPlacerStrategy.prototype.create;
    const stranger = { toString: () => 'OTHER' } as RelativeXPlacerStrategy;
    expect(() => create.call(stranger)).toThrow(IllegalArgumentException);
    expect(() => create.call(stranger)).toThrow('No implementation is available for the node placer OTHER');
  });
});

describe('RelativeXPlacer', () => {
  it('requires no further processors (RelativeXPlacer.java:669-673)', () => {
    expect(new RelativeXPlacer().getLayoutProcessorConfiguration(ElkGraphUtil.createGraph())).toBeNull();
  });

  it('places nothing and finishes the monitor for a graph without children (RelativeXPlacer.java:52)', () => {
    const monitor = new BasicProgressMonitor();
    new RelativeXPlacer().process(ElkGraphUtil.createGraph(), monitor);
    expect([monitor.getTaskName(), monitor.isRunning()]).toEqual(['XPlacer', false]);
  });
});

describe('RelativeXPlacerSorting edges the rows do not reach', () => {
  it('throws where Java unboxes a null model order of two siblings (RelativeXPlacer.java:455-456)', () => {
    const bare = (): ElkNode => ElkGraphUtil.createNode(null);
    const withOrder = (order: number): ElkNode => {
      const n = bare();
      n.setProperty(InternalProperties.NODE_MODEL_ORDER, order);
      return n;
    };
    expect(() => splitNodesWithModelOrder([bare(), bare()], [], [])).toThrow(TypeError);
    expect(() => splitNodesWithModelOrder([withOrder(0), bare()], [], [])).toThrow(TypeError);
    expect(() => splitNodesWithModelOrder([bare(), withOrder(0)], [], [])).toThrow(TypeError);
    // with both present the comparison runs: first > second sends the second to the left list (:457-458)
    const left: ElkNode[] = [];
    const first = withOrder(5);
    const second = withOrder(1);
    splitNodesWithModelOrder([first, second], left, []);
    expect(left[0]).toBe(second);
  });

  it('splitNodesWithModelOrder leaves both lists empty for an empty list (RelativeXPlacer.java:444-446)', () => {
    const left = [] as never[];
    const right = [] as never[];
    splitNodesWithModelOrder([], left, right);
    expect([left, right]).toEqual([[], []]);
  });

  it('splitGroup returns 0 for a single node and leaves the widths alone (RelativeXPlacer.java:504-505)', () => {
    const widths = new Pair<number, number>(3, 4);
    expect(splitGroup([ElkGraphUtil.createNode(null)], widths)).toBe(0);
    expect([widths.getFirst(), widths.getSecond()]).toEqual([3, 4]);
  });
});
