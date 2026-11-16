// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';
import type { Random } from '../../../java/util/Random.js';

/**
 * Internal property definitions for the force layout algorithm.
 *
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/options/InternalProperties.java
 */
export class InternalProperties {
  /** the original object from which a graph element was created. */
  static readonly ORIGIN: IProperty<unknown> = new Property<unknown>('origin');

  /** random number generator for the algorithm. */
  static readonly RANDOM: IProperty<Random> = new Property<Random>('random');

  /** upper left corner of the graph's bounding box. */
  static readonly BB_UPLEFT: IProperty<KVector> = new Property<KVector>('boundingBox.upLeft');

  /** lower right corner of the graph's bounding box. */
  static readonly BB_LOWRIGHT: IProperty<KVector> = new Property<KVector>('boundingBox.lowRight');

  /** Hidden default constructor. */
  private constructor() {}
}
