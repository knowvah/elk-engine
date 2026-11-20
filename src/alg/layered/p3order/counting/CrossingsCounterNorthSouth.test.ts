// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { replayOrderSite } from '../../../../../test/helpers/layered-order-site-replay.js';

describe('CrossingsCounterNorthSouth on the site rows', () => {
  it('leaves external port dummies out of the north-south positions of their layer', () => {
    // oracle: sites/ExternalPorts/northSouth; CrossingsCounter.java:524-545 (no case for EXTERNAL_PORT)
    const result = replayOrderSite('sites/ExternalPorts/northSouth');
    expect(result.layers).toEqual([['g0/n0'], ['new/n0', 'new/n1', 'g0/n4'], ['g0/n5'], ['g0/n1', 'new/n2']]);
    expect(result.ports['g0/n5']).toEqual(['g0/n5/p2', 'g0/n5/p4', 'g0/n5/p0', 'g0/n5/p1', 'g0/n5/p3']);
  });
});
