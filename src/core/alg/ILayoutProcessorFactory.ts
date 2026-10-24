// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from './ILayoutProcessor.js';

/**
 * A factory for layout processors.
 *
 * @typeParam G type of the graph the created processors work on
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/alg/ILayoutProcessorFactory.java
 */
export interface ILayoutProcessorFactory<G> {
  /** Creates a new instance of the layout processor this factory stands for. */
  create(): ILayoutProcessor<G>;
}
