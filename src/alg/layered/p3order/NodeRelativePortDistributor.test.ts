// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { replayOrderSite } from '../../../../test/helpers/layered-order-site-replay.js';

describe('NodeRelativePortDistributor on the site rows', () => {
  it('ranks the north input ports ahead of the others in the range of their node (seed 2)', () => {
    // oracle: sites/NorthSouth/inputRanks/seed2; NodeRelativePortDistributor.java:56,67
    const result = replayOrderSite('sites/NorthSouth/inputRanks/seed2');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n3', 'g0/n2', 'g0/n1']]);
    expect(result.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1', 'g0/n1/p2']);
  });
});
