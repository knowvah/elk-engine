// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Options for setting how children of nodes should be handled in the current layout run.
 *
 * The basic idea is this: If you want nodes to be laid out together across hierarchy levels, set hierarchy handling to
 * {@link #INCLUDE_CHILDREN} on all nodes that should be laid out in one go. As soon as a node's content should be laid
 * out in a separate layout run, set the node's hierarchy handling to {@link #SEPARATE_CHILDREN}.
 *
 * If the layout algorithm doesn't support hierarchical layout, this property is ignored and the layout is calculated
 * separately for each child hierarchy.
 *
 * _Note:_ Layout algorithms only need to differentiate between {@link #INCLUDE_CHILDREN} and
 * {@link #SEPARATE_CHILDREN} as {@link #INHERIT} is evaluated and set to the appropriate more specific value by ELK.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/HierarchyHandling.java
 */
export class HierarchyHandling {
  /** Inherit the parent node's hierarchy handling. The root node has no parent node; here, this setting defaults to
   * {@link #SEPARATE_CHILDREN}. */
  static readonly INHERIT: HierarchyHandling = new HierarchyHandling('INHERIT', 0);
  /** Allows the node's children to be included in the current layout run. Which children are included in the layout
   * run is determined by their hierarchy handling setting. For a child to actually be included, its hierarchy
   * handling must be set to either {@link #INHERIT} or {@link #INCLUDE_CHILDREN}. */
  static readonly INCLUDE_CHILDREN: HierarchyHandling = new HierarchyHandling('INCLUDE_CHILDREN', 1);
  /** Lays out the node with a new layout run. Even if its parent node is set to {@link #INCLUDE_CHILDREN}, this node
   * will trigger a separate layout run and will thus not be included in the parent node's layout run. */
  static readonly SEPARATE_CHILDREN: HierarchyHandling = new HierarchyHandling('SEPARATE_CHILDREN', 2);

  static readonly #VALUES: readonly HierarchyHandling[] = [
    HierarchyHandling.INHERIT,
    HierarchyHandling.INCLUDE_CHILDREN,
    HierarchyHandling.SEPARATE_CHILDREN,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly HierarchyHandling[] {
    return HierarchyHandling.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): HierarchyHandling {
    const found = HierarchyHandling.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.HierarchyHandling.${name}`);
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

  compareTo(other: HierarchyHandling): number {
    return this.#ordinal - other.#ordinal;
  }
}
