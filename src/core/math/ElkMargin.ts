// SPDX-License-Identifier: EPL-2.0
import { Spacing, spacingSides } from './Spacing.js';

/**
 * Stores the margins of an element. The margin is the area around the border of an element that has to be kept free
 * of any other elements.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMargin.java
 */
export class ElkMargin extends Spacing {
  /** Creates a new instance with all fields set to `0.0`. */
  constructor();
  /** Create new margin using the same value for every side. */
  constructor(any: number);
  /** Create new margin using the same margin for both sides of a common dimension. */
  constructor(leftRight: number, topBottom: number);
  /** Creates a new instance initialized with the given values. */
  constructor(top: number, right: number, bottom: number, left: number);
  /** Creates a new instance with all fields set to the value of `other`. */
  constructor(other: ElkMargin);
  constructor(...args: [] | [number] | [number, number] | [number, number, number, number] | [ElkMargin]) {
    super(...spacingSides(args));
  }

  override clone(): ElkMargin {
    return new ElkMargin(this);
  }
}
