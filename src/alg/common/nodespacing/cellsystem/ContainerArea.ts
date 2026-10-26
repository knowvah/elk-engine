// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Enumeration of three container areas that can be used by containers that use three areas. BEGIN is the top row or left column, CENTER the center row or column, END the bottom row or right column.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/ContainerArea.java
 */
export class ContainerArea {
  static readonly BEGIN: ContainerArea = new ContainerArea('BEGIN', 0);
  static readonly CENTER: ContainerArea = new ContainerArea('CENTER', 1);
  static readonly END: ContainerArea = new ContainerArea('END', 2);

  static readonly #VALUES: readonly ContainerArea[] = [ContainerArea.BEGIN, ContainerArea.CENTER, ContainerArea.END];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly ContainerArea[] {
    return ContainerArea.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): ContainerArea {
    const found = ContainerArea.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.nodespacing.cellsystem.ContainerArea.${name}`,
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
