// SPDX-License-Identifier: EPL-2.0
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { PROPERTY_RETURN_VALUE, unboxDouble } from '../../../java/lang/Unbox.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import { EqualWhitespaceEliminator } from './EqualWhitespaceEliminator.js';

/**
 * Eliminates the whitespace in the placement of the child nodes by increasing the size of the children equally.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *     <dd>The graph is divided into rows, stacks, blocks and subrows.</dd>
 *   <dt>Postcondition:</dt>
 *     <dd>The whitespace is eliminated</dd>
 *     <dd>The drawing has the desired aspect ratio.</dd>
 * </dl>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p3whitespaceelimination/ToAspectratioNodeExpander.java
 */
export class ToAspectratioNodeExpander extends EqualWhitespaceEliminator {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p3whitespaceelimination/ToAspectratioNodeExpander.java */
  override process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    // Upstream typo corrected (CLAUDE.md prose carve-out): the Java task name reads "To Aspect Ratio Whitesapce Eliminator".
    progressMonitor.begin('To Aspect Ratio Whitespace Eliminator', 1);

    const source = PROPERTY_RETURN_VALUE('ElkNode');
    let width = unboxDouble(graph.getProperty(InternalProperties.DRAWING_WIDTH), source);
    const height = unboxDouble(graph.getProperty(InternalProperties.DRAWING_HEIGHT), source);
    const desiredAspectRatio = graph.getProperty(RectPackingOptions.ASPECT_RATIO);
    let additionalHeight = unboxDouble(graph.getProperty(InternalProperties.ADDITIONAL_HEIGHT), source);

    const aspectRatio = width / height;
    if (aspectRatio < desiredAspectRatio) {
      width = height * desiredAspectRatio;
      graph.setProperty(InternalProperties.DRAWING_WIDTH, width);
    } else {
      additionalHeight += width / desiredAspectRatio - height;
      graph.setProperty(InternalProperties.ADDITIONAL_HEIGHT, additionalHeight);
      graph.setProperty(InternalProperties.DRAWING_HEIGHT, height + additionalHeight);
    }

    super.process(graph, progressMonitor);

    progressMonitor.done();
  }
}
