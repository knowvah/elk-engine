// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import { trim } from '../../java/lang/JavaString.js';
import { StringBuilder } from '../../java/lang/StringBuilder.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { UnsupportedConfigurationException } from '../UnsupportedConfigurationException.js';
import type { IGraphElementVisitor } from '../util/IGraphElementVisitor.js';
import { printElementPath } from '../util/ElkUtilVisitors.js';
import { LayoutMetaDataService } from './LayoutMetaDataService.js';

/** The ID of the layout algorithm used when none is configured. */
const DEFAULT_ALGORITHM_ID = 'org.eclipse.elk.layered';

/**
 * Resolves layout algorithms configured through the {@link CoreOptions.ALGORITHM} option and assigns the resulting
 * meta data to the {@link CoreOptions.RESOLVED_ALGORITHM} option.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutAlgorithmResolver.java
 */
export class LayoutAlgorithmResolver implements IGraphElementVisitor {
  /** @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutAlgorithmResolver.java */
  visit(element: ElkGraphElement): void {
    if (isElkNode(element) && !element.getProperty(CoreOptions.NO_LAYOUT)) {
      this.resolveAlgorithm(element);
    }
  }

  /**
   * Resolve the layout algorithm to apply to the content of the given node. If no algorithm is configured for the
   * given node but should be, the default algorithm is resolved. If the algorithm configured for the node does not
   * exist, an exception is thrown instead.
   *
   * @throws UnsupportedConfigurationException if a non-existent layout algorithm was configured for the node.
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutAlgorithmResolver.java
   */
  protected resolveAlgorithm(node: ElkNode): void {
    // Java's unset ALGORITHM default is null; the property is typed string.
    const algorithmId = node.getProperty(CoreOptions.ALGORITHM) as string | null;

    // Stage 1: Try to resolve the intended algorithm
    if (this.resolveAndSetAlgorithm(algorithmId, node)) {
      return;
    }

    // Stage 2: If we must resolve a layout algorithm, try to fall back on the default if none was specified
    if (this.mustResolve(node)) {
      if (algorithmId === null || trim(algorithmId).length === 0) {
        // No algorithm was specified, load the default one
        const defaultAlgorithmId = this.getDefaultLayoutAlgorithmID();

        if (!this.resolveAndSetAlgorithm(this.getDefaultLayoutAlgorithmID(), node)) {
          const message = new StringBuilder()
            .append('Unable to load default layout algorithm ')
            .append(defaultAlgorithmId)
            .append(' for unconfigured node ');
          printElementPath(node, message);
          throw new UnsupportedConfigurationException(message.toString());
        }
      } else {
        // An algorithm was specified, but not found. Fail!
        const message = new StringBuilder().append("Layout algorithm '").append(algorithmId).append("' not found for ");
        printElementPath(node, message);
        throw new UnsupportedConfigurationException(message.toString());
      }
    }
  }

  /**
   * Tries to resolve the layout algorithm with the given ID. If one is found, the node's
   * {@link CoreOptions.RESOLVED_ALGORITHM} is set accordingly.
   *
   * @returns `true` if the algorithm was resolved and stored.
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutAlgorithmResolver.java
   */
  protected resolveAndSetAlgorithm(algorithmId: string | null, node: ElkNode): boolean {
    const algorithmData = LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(algorithmId);

    if (algorithmData !== null) {
      node.setProperty(CoreOptions.RESOLVED_ALGORITHM, algorithmData);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Determine whether it is mandatory to resolve the layout algorithm for the given node.
   *
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutAlgorithmResolver.java
   */
  protected mustResolve(node: ElkNode): boolean {
    // Hierarchical nodes must have their layout algorithm resolved, but so do nodes that have inside self loops
    // self loop and nothing else.
    return (
      !node.hasProperty(CoreOptions.RESOLVED_ALGORITHM) &&
      (node.getChildren().size() !== 0 || node.getProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE))
    );
  }

  /**
   * Returns the ID of the layout algorithm to be used if no algorithm is explicitly set in the graph. The default
   * implementation returns `"org.eclipse.elk.layered"`. (Public in Java, despite the task text.)
   *
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutAlgorithmResolver.java
   */
  getDefaultLayoutAlgorithmID(): string {
    return DEFAULT_ALGORITHM_ID;
  }
}
