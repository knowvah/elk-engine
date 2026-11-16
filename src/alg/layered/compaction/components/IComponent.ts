// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import type { PortSide } from '../../../../core/options/PortSide.js';
import type { EnumSet } from '../../../../java/util/EnumSet.js';
import type { IExternalExtension } from './IExternalExtension.js';

/**
 * A component represents, for instance, a set of nodes that are fully connected. In other words,
 * between any pair of nodes of the component exists an undirected path.
 *
 * @typeParam N the type of the contained nodes
 * @typeParam E the type of the contained edges
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/components/IComponent.java
 */
export interface IComponent<N, E> {
  /**
   * @returns a hull the nodes of this connected component. This, for instance, can be a
   *          rectilinear convex hull or a polyomino.
   */
  getHull(): ElkRectangle[];

  /** @returns a list with external extensions of this component. */
  getExternalExtensions(): IExternalExtension<E>[];

  /**
   * (Java `Set<PortSide>`; the only implementation hands out the `EnumSet` property value.)
   *
   * @returns a set of the port sides of this component's external ports (if there are any,
   *          otherwise an empty set).
   */
  getExternalExtensionSides(): EnumSet<PortSide>;
}
