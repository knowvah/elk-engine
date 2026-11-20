// SPDX-License-Identifier: EPL-2.0
// ModelOrderPortComparatorIncoming: the arms the T11 site rows reach (mission 7c, T12b). Expectations are the recorded
// layered-order.json rows (L4); the whole dump is proven by the order replay.
import { describe, expect, it } from 'vitest';
import { replayOrderSite } from '../../../../../test/helpers/layered-order-site-replay.js';

describe('ModelOrderPortComparatorIncoming on the site rows', () => {
  it('orders input ports fed by two ports of one source node by the source port order', () => {
    // oracle: sites/ModelOrder/ports/sameSource; ModelOrderPortComparator.java:158 compareOnSameSourceNode
    const result = replayOrderSite('sites/ModelOrder/ports/sameSource');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1', 'g0/n0/p2', 'g0/n0/p3']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p2', 'g0/n1/p0', 'g0/n1/p1', 'g0/n1/p3']);
  });

  it('orders the input ports of a node fed by one source node', () => {
    // oracle: sites/ModelOrder/ports/sameTarget; ModelOrderPortComparator.java:158 compareOnSameSourceNode
    const result = replayOrderSite('sites/ModelOrder/ports/sameTarget');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p1', 'g0/n1/p0']);
  });

  it('orders input ports of one source node by port model order', () => {
    // oracle: sites/ModelOrder/portModelOrder; ModelOrderPortComparator.java:158 compareOnSameSourceNode
    const result = replayOrderSite('sites/ModelOrder/portModelOrder');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
  });

  it('orders input ports whose sources sit two layers back', () => {
    // oracle: sites/ModelOrder/ports/notPreviousLayer; ModelOrderPortComparator.java:200 compareByPreviousLayer
    const result = replayOrderSite('sites/ModelOrder/ports/notPreviousLayer');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p2', 'g0/n2/p1', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p2', 'g0/n3/p1', 'g0/n3/p0']);
  });

  it('returns no decision for input ports without port model order', () => {
    // oracle: sites/ModelOrder/ports/notPreviousLayer/noPortModelOrder; ModelOrderPortComparator.java:200 compareByPreviousLayer
    const result = replayOrderSite('sites/ModelOrder/ports/notPreviousLayer/noPortModelOrder');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p2', 'g0/n2/p1', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p1', 'g0/n3/p2', 'g0/n3/p0']);
  });

  it('orders input ports fed by same-layer long-edge dummies', () => {
    // oracle: sites/ModelOrder/feedback/sameNode; ModelOrderPortComparator.java:174 compareLongEdgeSources
    const result = replayOrderSite('sites/ModelOrder/feedback/sameNode');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p2', 'g0/n0/p1']);
    expect(result.ports['g0/n5']).toEqual(['g0/n5/p1', 'g0/n5/p0']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p2', 'g0/n1/p0', 'g0/n1/p1', 'g0/n1/p3']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p1', 'g0/n2/p2', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p1', 'g0/n3/p2', 'g0/n3/p0']);
    expect(result.ports['g0/n6']).toEqual(['g0/n6/p1', 'g0/n6/p2', 'g0/n6/p0']);
    expect(result.ports['g0/n4']).toEqual(['g0/n4/p0', 'g0/n4/p1']);
  });

  it('orders input ports of processor-created edges fed by long-edge dummies', () => {
    // oracle: sites/ModelOrder/feedback/noEdgeOrder; ModelOrderPortComparator.java:174 compareLongEdgeSources
    const result = replayOrderSite('sites/ModelOrder/feedback/noEdgeOrder');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p2', 'g0/n1/p1']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p1', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p0', 'g0/n3/p1', 'g0/n3/p2']);
  });
});
