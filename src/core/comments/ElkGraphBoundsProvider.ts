// SPDX-License-Identifier: EPL-2.0
import { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import type { ElkShape } from '../../graph/ElkShape.js';
import { IBoundsProvider } from './IBoundsProvider.js';

/**
 * An {@link IBoundsProvider} that simply returns the bounds defined in an ELK node.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/ElkGraphBoundsProvider.java
 */
export class ElkGraphBoundsProvider extends IBoundsProvider<ElkShape, ElkShape> {
  override boundsForTarget(node: ElkShape): Rectangle2D.Double {
    return new Rectangle2D.Double(node.getX(), node.getY(), node.getWidth(), node.getHeight());
  }

  override boundsForComment(node: ElkShape): Rectangle2D.Double {
    return new Rectangle2D.Double(node.getX(), node.getY(), node.getWidth(), node.getHeight());
  }
}
