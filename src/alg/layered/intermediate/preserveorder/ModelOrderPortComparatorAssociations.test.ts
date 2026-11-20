// SPDX-License-Identifier: EPL-2.0
// ModelOrderPortComparatorAssociations: the arms the T11 site rows reach (mission 7c, T12b). Expectations are the recorded
// layered-order.json rows (L4); the whole dump is proven by the order replay.
import { describe, expect, it } from 'vitest';
import { replayOrderSite } from '../../../../../test/helpers/layered-order-site-replay.js';

describe('ModelOrderPortComparatorAssociations on the site rows', () => {
  it('checks the port model order of ports listed against their edge order', () => {
    // oracle: sites/ModelOrder/portModelOrder; ModelOrderPortComparator.java:362 checkPortModelOrder, :204 orderByPortModelOrder
    const result = replayOrderSite('sites/ModelOrder/portModelOrder');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
  });

  it('checks the port model order of ports whose sources sit two layers back', () => {
    // oracle: sites/ModelOrder/ports/notPreviousLayer; ModelOrderPortComparator.java:362 checkPortModelOrder
    const result = replayOrderSite('sites/ModelOrder/ports/notPreviousLayer');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p2', 'g0/n2/p1', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p2', 'g0/n3/p1', 'g0/n3/p0']);
  });

  it('compares unconnected ports by their port model order', () => {
    // oracle: sites/ModelOrder/ports/unconnected; ModelOrderPortComparator.java:362 checkPortModelOrder
    const result = replayOrderSite('sites/ModelOrder/ports/unconnected');
    expect(result.ports['g0/n0']).toEqual([
      'g0/n0/p8',
      'g0/n0/p9',
      'g0/n0/p0',
      'g0/n0/p1',
      'g0/n0/p2',
      'g0/n0/p7',
      'g0/n0/p6',
      'g0/n0/p5',
      'g0/n0/p4',
      'g0/n0/p3',
    ]);
    expect(result.ports['g0/n1']).toEqual([
      'g0/n1/p5',
      'g0/n1/p6',
      'g0/n1/p7',
      'g0/n1/p8',
      'g0/n1/p4',
      'g0/n1/p3',
      'g0/n1/p2',
      'g0/n1/p1',
      'g0/n1/p0',
    ]);
  });

  it('compares the ports of feedback dummies of one node by port model order', () => {
    // oracle: sites/ModelOrder/feedback/sameNode; ModelOrderPortComparator.java:204 orderByPortModelOrder
    const result = replayOrderSite('sites/ModelOrder/feedback/sameNode');
    expect(result.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p2', 'g0/n0/p1']);
    expect(result.ports['g0/n5']).toEqual(['g0/n5/p1', 'g0/n5/p0']);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p2', 'g0/n1/p0', 'g0/n1/p1', 'g0/n1/p3']);
    expect(result.ports['g0/n2']).toEqual(['g0/n2/p1', 'g0/n2/p2', 'g0/n2/p0']);
    expect(result.ports['g0/n3']).toEqual(['g0/n3/p1', 'g0/n3/p2', 'g0/n3/p0']);
    expect(result.ports['g0/n6']).toEqual(['g0/n6/p1', 'g0/n6/p2', 'g0/n6/p0']);
    expect(result.ports['g0/n4']).toEqual(['g0/n4/p0', 'g0/n4/p1']);
  });
});
