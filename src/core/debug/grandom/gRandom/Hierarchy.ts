// SPDX-License-Identifier: EPL-2.0
import type { DoubleQuantity } from './DoubleQuantity.js';

/**
 * The generated EMF class `Hierarchy`, a plain class (AD-11) whose features are plain fields with the EMF defaults.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Hierarchy.java
 */
export class Hierarchy {
  #levels: DoubleQuantity | null = null;
  #edges: DoubleQuantity | null = null;
  #numHierarchNodes: DoubleQuantity | null = null;
  #crossHierarchRel: DoubleQuantity | null = null;

  getLevels(): DoubleQuantity | null {
    return this.#levels;
  }

  setLevels(value: DoubleQuantity | null): void {
    this.#levels = value;
  }

  getEdges(): DoubleQuantity | null {
    return this.#edges;
  }

  setEdges(value: DoubleQuantity | null): void {
    this.#edges = value;
  }

  getNumHierarchNodes(): DoubleQuantity | null {
    return this.#numHierarchNodes;
  }

  setNumHierarchNodes(value: DoubleQuantity | null): void {
    this.#numHierarchNodes = value;
  }

  getCrossHierarchRel(): DoubleQuantity | null {
    return this.#crossHierarchRel;
  }

  setCrossHierarchRel(value: DoubleQuantity | null): void {
    this.#crossHierarchRel = value;
  }
}
