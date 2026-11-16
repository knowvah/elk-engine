// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../../graph/LGraph.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { GraphStats } from './GraphStats.js';

/**
 * Calculate cut indexes that are used to cut a graph's layering into multiple chunks and 'wrap' the drawing to improve
 * the utilization of a given drawing area.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/ICutIndexCalculator.java
 */
export interface ICutIndexCalculator {
  /**
   * @param graph a graph.
   * @param gs some further precalculated information about the graph.
   * @returns a list of indexes at which the graph's layering should be split.
   */
  getCutIndexes(graph: LGraph, gs: GraphStats): number[];

  /** @returns whether it is guaranteed that all cuts are valid. */
  guaranteeValid(): boolean;
}

/**
 * Simple {@link ICutIndexCalculator} that reads the manually specified cut indexes from the layout option
 * `LayeredOptions.WRAPPING_CUTTING_CUTS`. Java nests it in the interface (`ICutIndexCalculator.ManualCutIndexCalculator`);
 * a TypeScript interface cannot hold a class, so it sits beside it in this file (as `ISpacingsHandler.ts` holds its
 * default handler).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/ICutIndexCalculator.java
 */
export class ManualCutIndexCalculator implements ICutIndexCalculator {
  getCutIndexes(graph: LGraph, _gs: GraphStats): number[] {
    // the property has no default: null when unset
    const cuts = graph.getProperty(LayeredOptions.WRAPPING_CUTTING_CUTS) as number[] | null;
    if (cuts !== null) {
      return cuts;
    } else {
      return [];
    }
  }

  guaranteeValid(): boolean {
    return false;
  }
}
