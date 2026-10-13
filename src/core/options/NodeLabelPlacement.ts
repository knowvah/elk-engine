// SPDX-License-Identifier: EPL-2.0
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';

/**
 * Defines the placement of node labels: inside or outside, horizontally and vertically.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/NodeLabelPlacement.java
 */
export class NodeLabelPlacement {
  static readonly H_LEFT: NodeLabelPlacement = new NodeLabelPlacement('H_LEFT', 0);
  static readonly H_CENTER: NodeLabelPlacement = new NodeLabelPlacement('H_CENTER', 1);
  static readonly H_RIGHT: NodeLabelPlacement = new NodeLabelPlacement('H_RIGHT', 2);
  static readonly V_TOP: NodeLabelPlacement = new NodeLabelPlacement('V_TOP', 3);
  static readonly V_CENTER: NodeLabelPlacement = new NodeLabelPlacement('V_CENTER', 4);
  static readonly V_BOTTOM: NodeLabelPlacement = new NodeLabelPlacement('V_BOTTOM', 5);
  static readonly INSIDE: NodeLabelPlacement = new NodeLabelPlacement('INSIDE', 6);
  static readonly OUTSIDE: NodeLabelPlacement = new NodeLabelPlacement('OUTSIDE', 7);
  static readonly H_PRIORITY: NodeLabelPlacement = new NodeLabelPlacement('H_PRIORITY', 8);

  static readonly #VALUES: readonly NodeLabelPlacement[] = [
    NodeLabelPlacement.H_LEFT,
    NodeLabelPlacement.H_CENTER,
    NodeLabelPlacement.H_RIGHT,
    NodeLabelPlacement.V_TOP,
    NodeLabelPlacement.V_CENTER,
    NodeLabelPlacement.V_BOTTOM,
    NodeLabelPlacement.INSIDE,
    NodeLabelPlacement.OUTSIDE,
    NodeLabelPlacement.H_PRIORITY,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly NodeLabelPlacement[] {
    return NodeLabelPlacement.#VALUES;
  }

  /**
   * Resolves a constant by name (the enum's implicit `valueOf(String)`) or by ordinal (the custom
   * `valueOf(int)`); one method dispatches on `typeof` per translation-rules 6.5.
   *
   * @throws IllegalArgumentException if no constant has the given name.
   * @throws ArrayIndexOutOfBoundsException if the ordinal is out of range.
   */
  static valueOf(key: string | number): NodeLabelPlacement {
    if (typeof key === 'number') {
      const byOrdinal = NodeLabelPlacement.#VALUES[key];
      if (byOrdinal === undefined) {
        throw new ArrayIndexOutOfBoundsException(
          `Index ${key} out of bounds for length ${NodeLabelPlacement.#VALUES.length}`,
        );
      }
      return byOrdinal;
    }
    const found = NodeLabelPlacement.#VALUES.find((constant) => constant.#name === key);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.NodeLabelPlacement.${key}`);
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

  compareTo(other: NodeLabelPlacement): number {
    return this.#ordinal - other.#ordinal;
  }

  /** @see NodeLabelPlacement#fixed() */
  static fixed(): EnumSet<NodeLabelPlacement> {
    return EnumSet.noneOf(NodeLabelPlacement);
  }

  /** @see NodeLabelPlacement#insideTopLeft() */
  static insideTopLeft(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_LEFT);
  }

  /** @see NodeLabelPlacement#insideTopCenter() */
  static insideTopCenter(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_CENTER);
  }

  /** @see NodeLabelPlacement#insideTopRight() */
  static insideTopRight(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_RIGHT);
  }

  /** @see NodeLabelPlacement#insideCenter() */
  static insideCenter(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.V_CENTER, NodeLabelPlacement.H_CENTER);
  }

  /** @see NodeLabelPlacement#insideBottomLeft() */
  static insideBottomLeft(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.V_BOTTOM, NodeLabelPlacement.H_LEFT);
  }

  /** @see NodeLabelPlacement#insideBottomCenter() */
  static insideBottomCenter(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.V_BOTTOM, NodeLabelPlacement.H_CENTER);
  }

  /** @see NodeLabelPlacement#insideBottomRight() */
  static insideBottomRight(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.V_BOTTOM, NodeLabelPlacement.H_RIGHT);
  }

  /** @see NodeLabelPlacement#outsideTopLeft() */
  static outsideTopLeft(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_LEFT);
  }

  /** @see NodeLabelPlacement#outsideTopCenter() */
  static outsideTopCenter(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_CENTER);
  }

  /** @see NodeLabelPlacement#outsideTopRight() */
  static outsideTopRight(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_RIGHT);
  }

  /** @see NodeLabelPlacement#outsideBottomLeft() */
  static outsideBottomLeft(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.V_BOTTOM, NodeLabelPlacement.H_LEFT);
  }

  /** @see NodeLabelPlacement#outsideBottomCenter() */
  static outsideBottomCenter(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.V_BOTTOM, NodeLabelPlacement.H_CENTER);
  }

  /** @see NodeLabelPlacement#outsideBottomRight() */
  static outsideBottomRight(): EnumSet<NodeLabelPlacement> {
    return EnumSet.of(NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.V_BOTTOM, NodeLabelPlacement.H_RIGHT);
  }

  /**
   * Checks whether the given placement set is valid: at most one of each of the inside/outside,
   * horizontal and vertical groups. `Sets.intersection(group, placement).size() > 1` is a count of
   * the group members the placement contains.
   *
   * @see NodeLabelPlacement#isValid(Set)
   */
  static isValid(placement: EnumSet<NodeLabelPlacement>): boolean {
    const groups: readonly (readonly NodeLabelPlacement[])[] = [
      [NodeLabelPlacement.INSIDE, NodeLabelPlacement.OUTSIDE],
      [NodeLabelPlacement.H_LEFT, NodeLabelPlacement.H_CENTER, NodeLabelPlacement.H_RIGHT],
      [NodeLabelPlacement.V_TOP, NodeLabelPlacement.V_CENTER, NodeLabelPlacement.V_BOTTOM],
    ];
    return groups.every((group) => group.filter((member) => placement.contains(member)).length <= 1);
  }
}
