// SPDX-License-Identifier: EPL-2.0
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';

/**
 * Abstract superclass for the layers, nodes, ports, and edges of a tree graph. `serialVersionUID` is dropped (no Java
 * serialization in the port).
 *
 * @author sor
 * @author sgu
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/graph/TGraphElement.java
 */
export abstract class TGraphElement extends MapPropertyHolder {
  /** Identifier value, may be arbitrarily used by algorithms. */
  id: number;

  /**
   * Create a graph element. Covers the Java constructors `TGraphElement(int id)` and the implicit
   * `TGraphElement()`, whose `id` is the Java `int` default 0.
   *
   * @param id the element identifier
   */
  constructor(id: number = 0) {
    super();
    this.id = id;
  }
}
