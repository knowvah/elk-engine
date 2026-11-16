// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';

/**
 * Internal collector for extreme points of unions of outer segments.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:810
 */
export class ComponentsCompactorOuterSegments {
  min: number[] = new Array<number>(PortSide.values().length);
  max: number[] = new Array<number>(PortSide.values().length);
  extent: number[] = new Array<number>(PortSide.values().length);

  constructor() {
    // initialize with proper values
    this.min.fill(Number.POSITIVE_INFINITY);
    this.max.fill(Number.NEGATIVE_INFINITY);

    // Arrays.fill(extent, Double.POSITIVE_INFINITY);
    this.extent.fill(Number.NEGATIVE_INFINITY);
  }
}
