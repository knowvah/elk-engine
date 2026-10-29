// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
// The strategy enum is the entry point for the phase classes (L1): entering through the abstract base class would
// evaluate its concrete subclasses, which the enum arms create, before the base class finishes initialising.
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { SCCModelOrderCycleBreaker } from './SCCModelOrderCycleBreaker.js';

/** The abstract class has no strategy arm of its own. */
class MaximumBreaker extends SCCModelOrderCycleBreaker {}

// Numeric and edge-reversal results are proven through the oracle rows of `SCConnectivity` and `SCCNodeTypeCycleBreaker`.
describe('SCCModelOrderCycleBreaker configuration', () => {
  it('restores reversed edges after P5 and nothing else', () => {
    const configuration = new MaximumBreaker().getLayoutProcessorConfiguration(null as unknown as LGraph);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER,
    ]);
  });

  it('is the base class of the two SCC strategies', () => {
    // `SCConnectivity.java:38` and `SCCNodeTypeCycleBreaker.java:36` both `extends SCCModelOrderCycleBreaker`.
    expect(CycleBreakingStrategy.SCC_CONNECTIVITY.create()).toBeInstanceOf(SCCModelOrderCycleBreaker);
    expect(CycleBreakingStrategy.SCC_NODE_TYPE.create()).toBeInstanceOf(SCCModelOrderCycleBreaker);
  });
});
