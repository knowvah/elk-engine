// SPDX-License-Identifier: EPL-2.0
// Cases of ISweepPortDistributor.create (ISweepPortDistributor.java:55-62; mission 7c, T7, which completes the T6 file).
// The expected classes follow from the first `nextInt` of the JVM vectors in test/golden/refs/java/random.json: its
// sign is the bit `nextBoolean` reads, negative for seed 1 (value -1155869325) and positive for seed -1 (1155099827).
import { describe, expect, it } from 'vitest';
import { Random } from '../../../java/util/Random.js';
import type { LNode } from '../graph/LNode.js';
import { GreedyPortDistributor } from './GreedyPortDistributor.js';
import { create } from './ISweepPortDistributor.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import { LayerTotalPortDistributor } from './LayerTotalPortDistributor.js';
import { NodeRelativePortDistributor } from './NodeRelativePortDistributor.js';

const THREE_LAYERS: LNode[][] = [[], [], []];

describe('ISweepPortDistributor.create', () => {
  it('draws true for seed 1 and creates the node-relative distributor', () => {
    const random = new Random(1);
    expect(create(CrossMinType.BARYCENTER, random, THREE_LAYERS)).toBeInstanceOf(NodeRelativePortDistributor);
    // one draw was consumed: the next boolean continues the sequence of a fresh generator
    const fresh = new Random(1);
    fresh.nextBoolean();
    expect(random.nextLong()).toBe(fresh.nextLong());
  });

  it('draws false for seed -1 and creates the layer-total distributor', () => {
    expect(create(CrossMinType.MEDIAN, new Random(-1), THREE_LAYERS)).toBeInstanceOf(LayerTotalPortDistributor);
    expect(create(CrossMinType.ONE_SIDED_GREEDY_SWITCH, new Random(-1), THREE_LAYERS)).toBeInstanceOf(
      LayerTotalPortDistributor,
    );
  });

  it('creates the greedy distributor for the two-sided type without drawing', () => {
    const random = new Random(1);
    expect(create(CrossMinType.TWO_SIDED_GREEDY_SWITCH, random, THREE_LAYERS)).toBeInstanceOf(GreedyPortDistributor);
    expect(random.nextLong()).toBe(new Random(1).nextLong());
  });
});
