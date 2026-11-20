// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { replayOrderSite } from '../../../../test/helpers/layered-order-site-replay.js';

describe('LayerTotalPortDistributor on the site rows', () => {
  it('ranks the north input ports ahead of the others in one layer-wide range (seed 1)', () => {
    // oracle: sites/NorthSouth/inputRanks/seed1; LayerTotalPortDistributor.java:51,61
    const result = replayOrderSite('sites/NorthSouth/inputRanks/seed1');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n3', 'g0/n1', 'g0/n2']]);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1', 'g0/n1/p2']);
  });
});
