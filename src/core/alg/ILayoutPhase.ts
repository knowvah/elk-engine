// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from './ILayoutProcessor.js';
import type { LayoutProcessorConfiguration } from './LayoutProcessorConfiguration.js';

/**
 * A layout processor that is a phase of an algorithm and can state which additional processors it needs.
 *
 * @typeParam P the enumeration of phases (Java: `P extends Enum<P>`)
 * @typeParam G type of the graph the phase works on
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/alg/ILayoutPhase.java
 */
export interface ILayoutPhase<P extends { ordinal(): number }, G> extends ILayoutProcessor<G> {
  /**
   * Returns the processors this phase needs for the given graph.
   *
   * @param graph the graph that is about to be laid out
   * @returns the additional processors, or null if none are required
   */
  getLayoutProcessorConfiguration(graph: G): LayoutProcessorConfiguration<P, G> | null;
}
