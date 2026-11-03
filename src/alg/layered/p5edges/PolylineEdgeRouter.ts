// SPDX-License-Identifier: EPL-2.0
// mission-internal stub: T5 completes it
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Edge routing implementation that creates polyline paths.
 *
 * Mission 7e, batch 1 (T2): only the predicate the orthogonal and spline routers share is here; T5 ports the rest of
 * the class (R4: the predicate is a pure static function, as the Java's static field is shared the same way).
 *
 * @author msp
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/PolylineEdgeRouter.java
 */
export class PolylineEdgeRouter implements ILayoutPhase<LayeredPhases, LGraph> {
  /**
   * Predicate that checks whether nodes represent external ports.
   *
   * @see PolylineEdgeRouter.java:62-69
   */
  static PRED_EXTERNAL_WEST_OR_EAST_PORT(node: LNode): boolean {
    const extPortSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);
    return (
      node.getType() === NodeType.EXTERNAL_PORT && (extPortSide === PortSide.WEST || extPortSide === PortSide.EAST)
    );
  }

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> | null {
    throw new UnsupportedOperationException('PolylineEdgeRouter is completed in T5');
  }

  process(_layeredGraph: LGraph, _monitor: IElkProgressMonitor): void {
    throw new UnsupportedOperationException('PolylineEdgeRouter is completed in T5');
  }
}
