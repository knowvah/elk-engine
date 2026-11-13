// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * An enumeration of possible cost function that may be used for the construction of a spanning tree.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/options/SpanningTreeCostFunction.java
 */
export class SpanningTreeCostFunction {
  /** The euclidean distance between the center points of the two nodes connected by a {@link TEdge}. */
  static readonly CENTER_DISTANCE: SpanningTreeCostFunction = new SpanningTreeCostFunction('CENTER_DISTANCE', 0);
  /** Distance between the circumcircles of the two graph elements pertaining to a {@link TEdge}. */
  static readonly CIRCLE_UNDERLAP: SpanningTreeCostFunction = new SpanningTreeCostFunction('CIRCLE_UNDERLAP', 1);
  /** Underlap between the rectangles of the two graph elements pertaining to a {@link TEdge}.
   * Restrict the movement of the rectangles to the line connecting their center points, then the underlap is the
   * distance they could be moved towards each other without colliding. */
  static readonly RECTANGLE_UNDERLAP: SpanningTreeCostFunction = new SpanningTreeCostFunction('RECTANGLE_UNDERLAP', 2);
  /** Cost function for overlap removal by Nachmanson et al. "Node Overlap Removal by Growing a Tree".
   * If the nodes do overlap, -overlap is returned otherwise the shortest distance. */
  static readonly INVERTED_OVERLAP: SpanningTreeCostFunction = new SpanningTreeCostFunction('INVERTED_OVERLAP', 3);
  /** The minimum of the euclidean distances between the nodes of an edge and the root of the spanning tree. */
  static readonly MINIMUM_ROOT_DISTANCE: SpanningTreeCostFunction = new SpanningTreeCostFunction(
    'MINIMUM_ROOT_DISTANCE',
    4,
  );

  static readonly #VALUES: readonly SpanningTreeCostFunction[] = [
    SpanningTreeCostFunction.CENTER_DISTANCE,
    SpanningTreeCostFunction.CIRCLE_UNDERLAP,
    SpanningTreeCostFunction.RECTANGLE_UNDERLAP,
    SpanningTreeCostFunction.INVERTED_OVERLAP,
    SpanningTreeCostFunction.MINIMUM_ROOT_DISTANCE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SpanningTreeCostFunction[] {
    return SpanningTreeCostFunction.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SpanningTreeCostFunction {
    const found = SpanningTreeCostFunction.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.spore.options.SpanningTreeCostFunction.${name}`,
      );
    }
    return found;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }

  compareTo(other: SpanningTreeCostFunction): number {
    return this.#ordinal - other.#ordinal;
  }
}
