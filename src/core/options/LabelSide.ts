// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { Property } from '../../graph/properties/Property.js';

/**
 * Enumeration for the definition of a side of the edge to place the (edge) label to.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/LabelSide.java
 */
export class LabelSide {
  /** The label's placement side hasn't been decided yet. */
  static readonly UNKNOWN: LabelSide = new LabelSide('UNKNOWN', 0);
  /** The label is placed above the edge. */
  static readonly ABOVE: LabelSide = new LabelSide('ABOVE', 1);
  /** The label is placed below the edge. */
  static readonly BELOW: LabelSide = new LabelSide('BELOW', 2);
  /** The label is placed directly on top of the edge. */
  static readonly INLINE: LabelSide = new LabelSide('INLINE', 3);

  /**
   * Property set on edge and port labels by layout algorithms depending on which side they decide is
   * appropriate for any given label.
   */
  static readonly LABEL_SIDE: IProperty<LabelSide> = new Property<LabelSide>(
    'org.eclipse.elk.labelSide',
    LabelSide.UNKNOWN,
  );

  static readonly #VALUES: readonly LabelSide[] = [
    LabelSide.UNKNOWN,
    LabelSide.ABOVE,
    LabelSide.BELOW,
    LabelSide.INLINE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LabelSide[] {
    return LabelSide.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LabelSide {
    const found = LabelSide.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.LabelSide.${name}`);
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

  compareTo(other: LabelSide): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Returns the side opposite to the one this method is called on. {@link #UNKNOWN} is mapped to itself.
   */
  opposite(): LabelSide {
    switch (this) {
      case LabelSide.ABOVE:
        return LabelSide.BELOW;
      case LabelSide.BELOW:
        return LabelSide.ABOVE;
      case LabelSide.INLINE:
        return LabelSide.INLINE;
      default:
        return LabelSide.UNKNOWN;
    }
  }
}
