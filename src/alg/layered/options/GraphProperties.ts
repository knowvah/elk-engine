// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/GraphProperties.java
 */
export class GraphProperties {
  static readonly COMMENTS: GraphProperties = new GraphProperties('COMMENTS', 0);
  static readonly EXTERNAL_PORTS: GraphProperties = new GraphProperties('EXTERNAL_PORTS', 1);
  static readonly HYPEREDGES: GraphProperties = new GraphProperties('HYPEREDGES', 2);
  static readonly HYPERNODES: GraphProperties = new GraphProperties('HYPERNODES', 3);
  static readonly NON_FREE_PORTS: GraphProperties = new GraphProperties('NON_FREE_PORTS', 4);
  static readonly NORTH_SOUTH_PORTS: GraphProperties = new GraphProperties('NORTH_SOUTH_PORTS', 5);
  static readonly SELF_LOOPS: GraphProperties = new GraphProperties('SELF_LOOPS', 6);
  static readonly CENTER_LABELS: GraphProperties = new GraphProperties('CENTER_LABELS', 7);
  static readonly END_LABELS: GraphProperties = new GraphProperties('END_LABELS', 8);
  static readonly PARTITIONS: GraphProperties = new GraphProperties('PARTITIONS', 9);

  static readonly #VALUES: readonly GraphProperties[] = [
    GraphProperties.COMMENTS,
    GraphProperties.EXTERNAL_PORTS,
    GraphProperties.HYPEREDGES,
    GraphProperties.HYPERNODES,
    GraphProperties.NON_FREE_PORTS,
    GraphProperties.NORTH_SOUTH_PORTS,
    GraphProperties.SELF_LOOPS,
    GraphProperties.CENTER_LABELS,
    GraphProperties.END_LABELS,
    GraphProperties.PARTITIONS,
  ];

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
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.GraphProperties.${name}`,
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

  compareTo(other: GraphProperties): number {
    return this.#ordinal - other.#ordinal;
  }
}
