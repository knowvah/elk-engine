// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * For general purpose topdown layout these node types specify how a node should be handled.
 * These properties only have an effect when {@link CoreOptions#TOPDOWN_LAYOUT} is set to true.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/TopdownNodeTypes.java
 */
export class TopdownNodeTypes {
  /** A parallel node is a node whose layout is not scaled down to fit a fixed size. The parallel node's own
   * size must be set according to the pre-computed required size of the contained layout. A parallel node must
   * use an {@link ITopdownLayoutProvider} so that its size can be correctly predicted during layout. */
  static readonly PARALLEL_NODE: TopdownNodeTypes = new TopdownNodeTypes('PARALLEL_NODE', 0);
  /** A hierarchical node is a node whose layout will be scaled down to fit the fixed size of the hierarchical node.
   * The fixed size of the node is defined by {@link CoreOptions#TOPDOWN_HIERARCHICAL_NODE_WIDTH} and
   * {@link CoreOptions#TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO}. */
  static readonly HIERARCHICAL_NODE: TopdownNodeTypes = new TopdownNodeTypes('HIERARCHICAL_NODE', 1);
  /** The root node marks the root of the diagram, its child should be a single parallel node which is the visual
   * root of the diagram. */
  static readonly ROOT_NODE: TopdownNodeTypes = new TopdownNodeTypes('ROOT_NODE', 2);

  static readonly #VALUES: readonly TopdownNodeTypes[] = [
    TopdownNodeTypes.PARALLEL_NODE,
    TopdownNodeTypes.HIERARCHICAL_NODE,
    TopdownNodeTypes.ROOT_NODE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly TopdownNodeTypes[] {
    return TopdownNodeTypes.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): TopdownNodeTypes {
    const found = TopdownNodeTypes.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.TopdownNodeTypes.${name}`);
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

  compareTo(other: TopdownNodeTypes): number {
    return this.#ordinal - other.#ordinal;
  }
}
