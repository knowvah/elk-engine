// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Vertical alignment of labels.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/VerticalLabelAlignment.java
 */
export class VerticalLabelAlignment {
  static readonly TOP: VerticalLabelAlignment = new VerticalLabelAlignment('TOP', 0);
  static readonly CENTER: VerticalLabelAlignment = new VerticalLabelAlignment('CENTER', 1);
  static readonly BOTTOM: VerticalLabelAlignment = new VerticalLabelAlignment('BOTTOM', 2);

  static readonly #VALUES: readonly VerticalLabelAlignment[] = [
    VerticalLabelAlignment.TOP,
    VerticalLabelAlignment.CENTER,
    VerticalLabelAlignment.BOTTOM,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly VerticalLabelAlignment[] {
    return VerticalLabelAlignment.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): VerticalLabelAlignment {
    const found = VerticalLabelAlignment.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.nodespacing.cellsystem.VerticalLabelAlignment.${name}`,
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
