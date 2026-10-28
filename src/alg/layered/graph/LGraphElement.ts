// SPDX-License-Identifier: EPL-2.0
import * as Strings from '../../../guava/Strings.js';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import { getOriginIdentifier } from './transform/ElkGraphTransformerUtility.js';

/**
 * Abstract superclass for the layers, nodes, ports, and edges of a layered graph (and the graph itself).
 *
 * The Java javadoc describes a `HashCodeCounter` for deterministic hash codes; the class at the pinned commit has no
 * such counter (identity semantics throughout). `Serializable` is dropped.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphElement.java
 */
export abstract class LGraphElement extends MapPropertyHolder {
  /** Identifier value, may be arbitrarily used by algorithms. */
  id = 0;

  /**
   * Returns a string that is useful to identify the element while debugging.
   *
   * @return the element's designation, or `null` if no meaningful designation can be provided
   */
  getDesignation(): string | null {
    const identifier = getOriginIdentifier(this);
    if (!Strings.isNullOrEmpty(identifier)) {
      return identifier;
    }
    return null;
  }
}
