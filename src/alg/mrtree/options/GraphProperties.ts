// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * An enumeration of properties a graph may have. These can be used as part of an `EnumSet` to base decisions on graph
 * properties. An `EnumSet` for this enumeration can be attached to a graph via the `MrTreeOptions.GRAPH_PROPERTIES`
 * property. (Java TODO: this is not used yet.)
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/options/GraphProperties.java
 */
export class GraphProperties {
  /** The graph contains self-loops. */
  static readonly SELF_LOOPS: GraphProperties = new GraphProperties('SELF_LOOPS', 0);

  static readonly #VALUES: readonly GraphProperties[] = [GraphProperties.SELF_LOOPS];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly GraphProperties[] {
    return GraphProperties.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): GraphProperties {
    const found = GraphProperties.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.mrtree.options.GraphProperties.${name}`);
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

  compareTo(other: GraphProperties): number {
    return this.#ordinal - other.#ordinal;
  }
}
