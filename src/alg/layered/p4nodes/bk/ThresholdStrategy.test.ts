// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import type { LEdge } from '../../graph/LEdge.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { BKAlignedLayout } from './BKAlignedLayout.js';
import { BKAlignedLayoutHDirection as HDirection } from './BKAlignedLayoutHDirection.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';
import { ThresholdStrategyNullThresholdStrategy } from './ThresholdStrategyNullThresholdStrategy.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** Exposes the protected `getOther` and the state of the base class. */
class ProbeStrategy extends ThresholdStrategyNullThresholdStrategy {
  other(edge: LEdge, node: LNode): LNode {
    return this.getOther(edge, node);
  }
}

function layout(vdir: VDirection, hdir: HDirection): BKAlignedLayout {
  return new BKAlignedLayout(new LGraph(), 0, vdir, hdir);
}

describe('ThresholdStrategy', () => {
  it('getOther rejects a node that is neither source nor target', () => {
    const graph = new LGraph();
    const [a, b, c] = [addNode(graph), addNode(graph), addNode(graph)] as [LNode, LNode, LNode];
    const edge = connect(addPort(a), addPort(b));
    expect(() => new ProbeStrategy().other(edge, c)).toThrow(IllegalArgumentException);
    expect(() => new ProbeStrategy().other(edge, c)).toThrow(/is neither source nor target of edge/u);
  });
});

describe('NullThresholdStrategy', () => {
  it('returns +infinity going up and -infinity going down, whatever it is given', () => {
    const node = addNode(new LGraph());
    const strategy = new ThresholdStrategyNullThresholdStrategy();
    strategy.init(layout(VDirection.UP, HDirection.LEFT), null as never);
    expect(strategy.calculateThreshold(5, node, node)).toBe(Number.POSITIVE_INFINITY);
    strategy.init(layout(VDirection.DOWN, HDirection.LEFT), null as never);
    expect(strategy.calculateThreshold(5, node, node)).toBe(Number.NEGATIVE_INFINITY);
    expect(() => {
      strategy.postProcess();
    }).not.toThrow();
  });
});
