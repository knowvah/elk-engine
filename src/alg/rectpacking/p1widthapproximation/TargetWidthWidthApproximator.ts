// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { UnsupportedConfigurationException } from '../../../core/UnsupportedConfigurationException.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import type { RectPackingLayoutPhases } from '../RectPackingLayoutPhases.js';

/**
 * Sets a {@link InternalProperties#TARGET_WIDTH} based on the given target width.
 *
 * <dl>
 *   <dt>Precondition: {@link RectPackingOptions#WIDTH_APPROXIMATION_TARGET_WIDTH}</dt>
 *   <dt>Postcondition:</dt>
 *     <dd>{@link InternalProperties#TARGET_WIDTH} is set on the graph.</dd>
 * </dl>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/TargetWidthWidthApproximator.java
 */
export class TargetWidthWidthApproximator implements ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/TargetWidthWidthApproximator.java */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Target Width Setter', 1);

    if (graph.hasProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH)) {
      graph.setProperty(
        InternalProperties.TARGET_WIDTH,
        graph.getProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH),
      );
    } else {
      throw new UnsupportedConfigurationException(
        'A target width has to be set if the TargetWidthWidthApproximator should be used.',
      );
    }

    progressMonitor.done();
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/TargetWidthWidthApproximator.java */
  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<RectPackingLayoutPhases, ElkNode> | null {
    return null;
  }
}
