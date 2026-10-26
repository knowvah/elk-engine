// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Horizontal alignment of labels.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/HorizontalLabelAlignment.java
 */
export class HorizontalLabelAlignment {
  static readonly LEFT: HorizontalLabelAlignment = new HorizontalLabelAlignment('LEFT', 0);
  static readonly CENTER: HorizontalLabelAlignment = new HorizontalLabelAlignment('CENTER', 1);
  static readonly RIGHT: HorizontalLabelAlignment = new HorizontalLabelAlignment('RIGHT', 2);

  static readonly #VALUES: readonly HorizontalLabelAlignment[] = [
    HorizontalLabelAlignment.LEFT,
    HorizontalLabelAlignment.CENTER,
    HorizontalLabelAlignment.RIGHT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly HorizontalLabelAlignment[] {
    return HorizontalLabelAlignment.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): HorizontalLabelAlignment {
    const found = HorizontalLabelAlignment.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.nodespacing.cellsystem.HorizontalLabelAlignment.${name}`,
      );
    }
    return found;
  }

  name(): string {
    return this.#name;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  toString(): string {
    return this.#name;
  }
}
