// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';

/**
 * Container for the properties used by the spore helpers.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/spore/InternalProperties.java
 */
export class InternalProperties {
  /** The fuzziness used when comparing doubles in the spore helpers. */
  static readonly FUZZINESS = 0.0001;

  /** Whether SVG debug output is enabled. */
  static readonly DEBUG_SVG: IProperty<boolean> = new Property<boolean>('debugSVG', false);

  /** Whether overlaps existed before the overlap removal. */
  static readonly OVERLAPS_EXISTED: IProperty<boolean> = new Property<boolean>('overlapsExisted', true);

  private constructor() {}
}
