// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import { DCComponent } from './DCComponent.js';
import type { DCElement } from './DCElement.js';

/**
 * This class represents the underlying graph data structure for the compaction of connected components. The benefit of
 * using an intermediate graph structure is that all classes implementing `ICompactor` can be used with all possible
 * graph data structures, as long as an `IGraphTransformer` is implemented for them.
 *
 * Java's two generic constructors `(D components)` and `(D components, double inset)` are one constructor with a
 * defaulted `inset` (`0.0f`, as the field initialiser).
 *
 * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCGraph.java
 */
export class DCGraph extends MapPropertyHolder {
  /**
   * All the different connected {@link DCComponent DCComponents} this graph consists of. AD-10 (FD4): Java's
   * `LinkedHashSet`, so a `Set` in insertion order is exact.
   */
  private components: Set<DCComponent> = new Set<DCComponent>();
  /** Width and height of this graph (after compaction). */
  private dimensions: KVector | null = null;
  /** analogous to the insets from the (old) KGraph. */
  private inset = 0.0;

  /**
   * Takes collections of {@link DCElement DCElements} nested in an outer collection, interprets each inner collection
   * as a connected component of the {@link DCGraph} and constructs the graph accordingly; including instantiation of
   * each DCComponent and setting the parent component of each {@link DCElement}.
   *
   * @param components Collection of future {@link DCComponent DCComponents} given as collections of
   *     {@link DCElement DCElements}
   * @param inset optional insets
   */
  constructor(components: Iterable<Iterable<DCElement>>, inset?: number) {
    super();
    for (const elements of components) {
      const component = new DCComponent();
      component.addElements(elements);
      this.components.add(component);
    }
    if (inset !== undefined) {
      this.inset = inset;
    }
  }

  /**
   * Gets all {@link DCComponent DCComponents} of this graph.
   *
   * @returns {@link DCComponent DCComponents} of this graph
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCGraph.java
   */
  getComponents(): Set<DCComponent> {
    return this.components;
  }

  /**
   * Returns width and height of the graph structure.
   *
   * @returns the dimensions
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCGraph.java
   */
  getDimensions(): KVector | null {
    return this.dimensions;
  }

  /**
   * Sets the width and height of the graph structure (called after compaction).
   *
   * @param dimensions the dimensions to set
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCGraph.java
   */
  setDimensions(dimensions: KVector | null): void {
    this.dimensions = dimensions;
  }

  /**
   * Returns the inset.
   *
   * @returns inset
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCGraph.java
   */
  getInset(): number {
    return this.inset;
  }
}
