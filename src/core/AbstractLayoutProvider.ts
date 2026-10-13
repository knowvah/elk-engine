// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../graph/ElkNode.js';
import type { IGraphLayoutEngine } from './IGraphLayoutEngine.js';
import type { IElkProgressMonitor } from './util/IElkProgressMonitor.js';

/**
 * A layout provider executes a layout algorithm to layout the child elements of a node.
 *
 * @author ars
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/AbstractLayoutProvider.java
 */
export abstract class AbstractLayoutProvider implements IGraphLayoutEngine {
  /**
   * Initialize the layout provider with the given parameter. Most layout providers have no use for
   * the parameter, which parameterizes a provider instance (e.g. to select a GraphViz algorithm).
   *
   * @param _parameter a string used to parameterize the layout provider instance
   */
  initialize(_parameter: string): void {
    // do nothing - override in subclasses
  }

  /** Dispose the layout provider by releasing any resources that are held. */
  dispose(): void {
    // do nothing - override in subclasses
  }

  abstract layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void;
}
