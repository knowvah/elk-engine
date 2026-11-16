// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import { isElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../../graph/ElkGraphElement.js';
import type { ElkShape } from '../../../graph/ElkShape.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import type { DCElement } from '../graph/DCElement.js';

/**
 * Class implementing a function for mapping over a map, in this case applying the layout of a {@link DCElement} to the
 * original KGraph-element it represents (`ElkGraphTransformer.OffsetApplier`, a private inner class in Java; the inner
 * `OffSetToChainApplier` is the arrow `applyToPoint`, which reads the current `offset` when called).
 *
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export class OffsetApplier {
  private offset!: KVector;

  /** `OffSetToChainApplier.accept`: adds the current offset to a point. */
  private readonly applyToPoint = (point: KVector): void => {
    point.add(this.offset.x, this.offset.y);
  };

  /**
   * Applies the offset of `poly` to `elem`.
   *
   * @param elem the original element
   * @param poly the element's representation after compaction
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
   */
  accept(elem: ElkGraphElement, poly: DCElement): void {
    this.offset = poly.getOffset();
    if (isElkEdge(elem)) {
      const edgeSection = ElkGraphUtil.firstEdgeSection(elem, false, false);
      const points = ElkUtil.createVectorChain(edgeSection);
      points.toArray().forEach(this.applyToPoint);
      ElkUtil.applyVectorChain(points, edgeSection);
      if (elem.getProperty(CoreOptions.JUNCTION_POINTS) !== null) {
        elem.getProperty(CoreOptions.JUNCTION_POINTS)!.toArray().forEach(this.applyToPoint);
      }
    } else {
      const shape = elem as ElkShape;
      shape.setX(shape.getX() + this.offset.x);
      shape.setY(shape.getY() + this.offset.y);
    }
  }
}
