// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from './graph/LGraph.js';

/**
 * The state of a test execution is held in an instance of this class. Nested type `ElkLayered.TestExecutionState`
 * (M15). Fully ported; `ElkLayered.prepareLayoutTest`, the only writer of the fields, is staged until 7f.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/ElkLayered.java
 */
export class ElkLayeredTestExecutionState {
  /** list of graphs that are currently being laid out (Java: private, written by the outer class `ElkLayered`). */
  graphs: LGraph[] | null = null;
  /** index of the processor that is to be executed next during a layout test (Java: private, written by the outer class). */
  step = 0;

  /**
   * Return the list of graphs that are currently being laid out.
   *
   * @return the graphs under test
   */
  getGraphs(): LGraph[] | null {
    return this.graphs;
  }

  /**
   * Return the index of the processor that is to be executed next during a layout test.
   *
   * @return the index of the next step
   */
  getStep(): number {
    return this.step;
  }
}
