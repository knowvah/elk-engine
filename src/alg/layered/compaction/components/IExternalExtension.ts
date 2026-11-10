// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import type { Direction } from '../../../../core/options/Direction.js';

/**
 * Container class for edges that represent external edges, i.e. edges that connect to ports that
 * span hierarchy boundaries.
 *
 * @typeParam E the type of the element that is being represented by this extension.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/components/IExternalExtension.java
 */
export interface IExternalExtension<E> {
  /** @returns for instance the underlying edge this extension represents. */
  getRepresentative(): E;

  /** @returns the rectangle that represents the external extension. */
  getRepresentor(): ElkRectangle;

  /**
   * (A Java `default` method: optional here, see {@link getPlaceholder} for the default body.)
   *
   * @returns an optional placeholder along the original diagram's boundary.
   */
  getPlaceholder?(): ElkRectangle | null;

  /** @returns the rectangle to which this extension (conceptually) connects. */
  getParent(): ElkRectangle;

  /** @returns the direction into which this extension points. */
  getDirection(): Direction;
}

/**
 * Calls `extension.getPlaceholder()`, applying the Java interface's default (`return null`) when the
 * implementation does not override it. A TypeScript interface cannot hold a default body.
 *
 * @param extension the external extension
 * @returns the placeholder or null
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/components/IExternalExtension.java
 */
export function getPlaceholder<E>(extension: IExternalExtension<E>): ElkRectangle | null {
  return extension.getPlaceholder === undefined ? null : extension.getPlaceholder();
}
