// SPDX-License-Identifier: EPL-2.0
import * as DoubleCompare from '../../../java/lang/DoubleCompare.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { PROPERTY_RETURN_VALUE, unboxInteger } from '../../../java/lang/Unbox.js';
import { InternalProperties } from '../InternalProperties.js';

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/**
 * Orders nodes by their y coordinate (ascending, or descending when inverted), ties by their model order.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/NodeComparator.java
 */
export class NodeComparator {
  private invert: boolean = false;

  /** Default constructor, or the constructor for an inverted comparator. */
  constructor(invert?: boolean) {
    if (invert !== undefined) {
      this.invert = invert;
    }
  }

  compare(a: ElkNode, b: ElkNode): number {
    let sortYresult: number;
    if (!this.invert) {
      sortYresult = DoubleCompare.compare(a.getY(), b.getY());
    } else {
      sortYresult = DoubleCompare.compare(b.getY(), a.getY());
    }
    if (sortYresult === 0) {
      // Java unboxes both Integer arguments, a first (NodeComparator.java:45-46): a null model order is an NPE there
      const intSortresult = integerCompare(
        unboxInteger(a.getProperty(InternalProperties.NODE_MODEL_ORDER), PROPERTY_RETURN_VALUE('ElkNode')),
        unboxInteger(b.getProperty(InternalProperties.NODE_MODEL_ORDER), PROPERTY_RETURN_VALUE('ElkNode')),
      );
      return intSortresult;
    } else {
      return sortYresult;
    }
  }
}
