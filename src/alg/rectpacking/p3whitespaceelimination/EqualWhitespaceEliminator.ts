// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { UnsupportedConfigurationException } from '../../../core/UnsupportedConfigurationException.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { PROPERTY_RETURN_VALUE, unboxDouble } from '../../../java/lang/Unbox.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import type { RectPackingLayoutPhases } from '../RectPackingLayoutPhases.js';
import { RectangleExpansion } from './RectangleExpansion.js';

/**
 * Eliminates the whitespace in the placement of the child nodes by increasing the size of the children equally.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *     <dd>The graph is divided into rows, stacks, blocks and subrows.</dd>
 *   <dt>Postcondition:</dt>
 *     <dd>The whitespace is eliminated and</dd>
 * </dl>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p3whitespaceelimination/EqualWhitespaceEliminator.java
 */
export class EqualWhitespaceEliminator implements ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p3whitespaceelimination/EqualWhitespaceEliminator.java */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Equal Whitespace Eliminator', 1);

    if (graph.hasProperty(InternalProperties.ROWS)) {
      RectangleExpansion.expand(
        graph.getProperty(InternalProperties.ROWS),
        unboxDouble(graph.getProperty(InternalProperties.DRAWING_WIDTH), PROPERTY_RETURN_VALUE('ElkNode')),
        unboxDouble(graph.getProperty(InternalProperties.ADDITIONAL_HEIGHT), PROPERTY_RETURN_VALUE('ElkNode')),
        graph.getProperty(RectPackingOptions.SPACING_NODE_NODE),
      );
    } else {
      throw new UnsupportedConfigurationException('The graph does not contain rows.');
    }

    progressMonitor.done();
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p3whitespaceelimination/EqualWhitespaceEliminator.java */
  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<RectPackingLayoutPhases, ElkNode> | null {
    return null;
  }
}
