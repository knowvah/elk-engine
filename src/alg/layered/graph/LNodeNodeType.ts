// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Definition of node types used in the layered approach. Java's nested `LNode.NodeType` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LNode.java
 */
export class NodeType {
  /** a normal node is created from a node of the original graph. */
  static readonly NORMAL: NodeType = new NodeType('NORMAL', 0);
  /** a dummy node created to split a long edge. */
  static readonly LONG_EDGE: NodeType = new NodeType('LONG_EDGE', 1);
  /** a node representing an external port. */
  static readonly EXTERNAL_PORT: NodeType = new NodeType('EXTERNAL_PORT', 2);
  /** a dummy node created to cope with ports at the northern or southern side. */
  static readonly NORTH_SOUTH_PORT: NodeType = new NodeType('NORTH_SOUTH_PORT', 3);
  /** a dummy node to represent a mid-label on an edge. */
  static readonly LABEL: NodeType = new NodeType('LABEL', 4);
  /** a dummy node representing a breaking point used to 'wrap' graphs. */
  static readonly BREAKING_POINT: NodeType = new NodeType('BREAKING_POINT', 5);
  /** a dummy node serving as a placeholder to reserve space when 'unzipping' graphs. this is used when there are no
   * edges. */
  static readonly PLACEHOLDER: NodeType = new NodeType('PLACEHOLDER', 6);
  /** a placeholder node that can't be shifted when 'unzipping' graphs. this is used in front of extra edges. */
  static readonly NONSHIFTING_PLACEHOLDER: NodeType = new NodeType('NONSHIFTING_PLACEHOLDER', 7);

  static readonly #VALUES: readonly NodeType[] = [
    NodeType.NORMAL,
    NodeType.LONG_EDGE,
    NodeType.EXTERNAL_PORT,
    NodeType.NORTH_SOUTH_PORT,
    NodeType.LABEL,
    NodeType.BREAKING_POINT,
    NodeType.PLACEHOLDER,
    NodeType.NONSHIFTING_PLACEHOLDER,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly NodeType[] {
    return NodeType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): NodeType {
    const found = NodeType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.layered.graph.LNode.NodeType.${name}`);
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

  compareTo(other: NodeType): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Return the color used when writing debug output graphs. The colors are given as strings of the form "#RGB", where
   * each component is given as a two-digit hexadecimal value.
   */
  getColor(): string {
    switch (this) {
      case NodeType.EXTERNAL_PORT:
        return '#cc99cc';
      case NodeType.LONG_EDGE:
        return '#eaed00';
      case NodeType.NORTH_SOUTH_PORT:
        return '#0034de';
      case NodeType.LABEL:
        return '#75c3c3';
      case NodeType.BREAKING_POINT:
        return '#eeeeff';
      default:
        return '#eeeeee';
    }
  }
}
