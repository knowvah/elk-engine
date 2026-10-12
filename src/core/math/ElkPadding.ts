// SPDX-License-Identifier: EPL-2.0
import { Spacing, spacingSides } from './Spacing.js';

/**
 * Stores the padding of an element. The padding is spacings from the border of an element to
 * other internal elements.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkPadding.java
 */
export class ElkPadding extends Spacing {
  /** Creates a new instance with all fields set to `0.0`. */
  constructor();
  /** Create new padding using the same value for every side. */
  constructor(any: number);
  /** Create new padding using the same padding for both sides of a common dimension. */
  constructor(leftRight: number, topBottom: number);
  /** Creates a new instance initialized with the given values. */
  constructor(top: number, right: number, bottom: number, left: number);
  /** Creates a new instance with all fields set to the value of `other`. */
  constructor(other: ElkPadding);
  constructor(...args: [] | [number] | [number, number] | [number, number, number, number] | [ElkPadding]) {
    super(...spacingSides(args));
  }

  override clone(): ElkPadding {
    return new ElkPadding(this);
  }
}
