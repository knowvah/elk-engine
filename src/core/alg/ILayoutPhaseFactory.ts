// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from './ILayoutPhase.js';
import type { ILayoutProcessorFactory } from './ILayoutProcessorFactory.js';

/**
 * A factory for layout phases. Implemented by the enumeration of an algorithm's phases.
 *
 * @typeParam P the enumeration of phases (Java: `P extends Enum<P>`)
 * @typeParam G type of the graph the created phases work on
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/alg/ILayoutPhaseFactory.java
 */
export interface ILayoutPhaseFactory<P extends { ordinal(): number }, G> extends ILayoutProcessorFactory<G> {
  /** Creates a new instance of the layout phase this factory stands for. */
  create(): ILayoutPhase<P, G>;
}
