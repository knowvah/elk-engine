// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * The mode of a {@link StripContainerCell} describes whether its child cells are to be regarded as rows or as
 * columns. Java's public nested enum `StripContainerCell.Strip`, split into its own file (Q1, M15).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/StripContainerCell.java
 */
export class StripContainerCellStrip {
  /** In a vertical strip, the container's child cells are its rows. */
  static readonly VERTICAL: StripContainerCellStrip = new StripContainerCellStrip('VERTICAL', 0);
  /** In a horizontal strip, the container's child cells are its columns. */
  static readonly HORIZONTAL: StripContainerCellStrip = new StripContainerCellStrip('HORIZONTAL', 1);

  static readonly #VALUES: readonly StripContainerCellStrip[] = [
    StripContainerCellStrip.VERTICAL,
    StripContainerCellStrip.HORIZONTAL,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly StripContainerCellStrip[] {
    return StripContainerCellStrip.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): StripContainerCellStrip {
    const found = StripContainerCellStrip.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.nodespacing.cellsystem.StripContainerCell.Strip.${name}`,
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
