// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { LNode } from '../graph/LNode.js';
import { LayeredOptions } from './LayeredOptions.js';

/**
 * Represents the flexibility of a node during node placement with the `NetworkSimplexPlacer`. Here, flexibility means
 * that either the ports are allowed to move on a node's border or that the node's size may change. Both points have
 * the goal to further reduce the overall edge length, possibly straightening a larger number of edges.
 *
 * `@ExperimentalPropertyValue`: `NODE_SIZE_WHERE_SPACE_PERMITS`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/NodeFlexibility.java
 */
export class NodeFlexibility {
  /** Node size must not be altered, ports remain where they were placed prior to node placement. */
  static readonly NONE: NodeFlexibility = new NodeFlexibility('NONE', 0);
  /** Ports are allowed to move on the node's border. */
  static readonly PORT_POSITION: NodeFlexibility = new NodeFlexibility('PORT_POSITION', 1);
  /** Similar to {@link NodeFlexibility.NODE_SIZE} but tries to avoid enlarging nodes excessively. */
  static readonly NODE_SIZE_WHERE_SPACE_PERMITS: NodeFlexibility = new NodeFlexibility(
    'NODE_SIZE_WHERE_SPACE_PERMITS',
    2,
  );
  /** The size of the node may be changed. This implies that also the ports may be re-positioned. */
  static readonly NODE_SIZE: NodeFlexibility = new NodeFlexibility('NODE_SIZE', 3);

  static readonly #VALUES: readonly NodeFlexibility[] = [
    NodeFlexibility.NONE,
    NodeFlexibility.PORT_POSITION,
    NodeFlexibility.NODE_SIZE_WHERE_SPACE_PERMITS,
    NodeFlexibility.NODE_SIZE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly NodeFlexibility[] {
    return NodeFlexibility.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): NodeFlexibility {
    const found = NodeFlexibility.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.NodeFlexibility.${name}`,
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

  compareTo(other: NodeFlexibility): number {
    return this.#ordinal - other.#ordinal;
  }

  /** @return true if the flexibility is {@link NodeFlexibility.NODE_SIZE}. */
  isFlexibleSize(): boolean {
    return this === NodeFlexibility.NODE_SIZE;
  }

  /** @return true if the flexibility is _at least_ {@link NodeFlexibility.NODE_SIZE_WHERE_SPACE_PERMITS}. */
  isFlexibleSizeWhereSpacePermits(): boolean {
    return this === NodeFlexibility.NODE_SIZE_WHERE_SPACE_PERMITS || this === NodeFlexibility.NODE_SIZE;
  }

  /** @return true if the flexibility is _at least_ {@link NodeFlexibility.PORT_POSITION}. */
  isFlexiblePorts(): boolean {
    return (
      this === NodeFlexibility.PORT_POSITION ||
      this === NodeFlexibility.NODE_SIZE_WHERE_SPACE_PERMITS ||
      this === NodeFlexibility.NODE_SIZE
    );
  }

  /**
   * Java quirk kept: the `NODE_SIZE_WHERE_SPACE_PERMITS` arm evaluates `nf.isFlexibleSizeWhereSpacePermits()` without
   * returning it and falls through to the `PORT_POSITION` arm, so it answers `nf.isFlexiblePorts()`.
   *
   * @param nf the desired {@link NodeFlexibility}
   * @return true if the flexibility is _at least_ `nf`.
   */
  isAtLeast(nf: NodeFlexibility): boolean {
    switch (this) {
      case NodeFlexibility.NODE_SIZE:
        return nf.isFlexibleSize();
      case NodeFlexibility.NODE_SIZE_WHERE_SPACE_PERMITS:
        nf.isFlexibleSizeWhereSpacePermits();
      // falls through
      case NodeFlexibility.PORT_POSITION:
        return nf.isFlexiblePorts();
      default:
        return true; // NONE
    }
  }

  /**
   * @param lNode the node for which the {@link NodeFlexibility} is requested.
   * @return the `NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY` that is specified for `lNode`, or if it is
   *         unspecified for `lNode`, the `NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT` value of `lNode`'s
   *         parent.
   */
  static getNodeFlexibility(lNode: LNode): NodeFlexibility {
    let nf: NodeFlexibility;
    if (lNode.getAllProperties().containsKey(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY)) {
      nf = lNode.getProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY);
    } else {
      nf = lNode.getGraph()!.getProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT);
    }
    return nf;
  }
}
