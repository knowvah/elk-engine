// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Enumeration of visibility options for layout options.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutOptionData.java
 */
export class LayoutOptionDataVisibility {
  /** The option shall always be visible in the UI. */
  static readonly VISIBLE: LayoutOptionDataVisibility = new LayoutOptionDataVisibility('VISIBLE', 0);
  /** The option shall be visible only for advanced users. */
  static readonly ADVANCED: LayoutOptionDataVisibility = new LayoutOptionDataVisibility('ADVANCED', 1);
  /** The option shall never be visible in the UI. */
  static readonly HIDDEN: LayoutOptionDataVisibility = new LayoutOptionDataVisibility('HIDDEN', 2);

  static readonly #VALUES: readonly LayoutOptionDataVisibility[] = [
    LayoutOptionDataVisibility.VISIBLE,
    LayoutOptionDataVisibility.ADVANCED,
    LayoutOptionDataVisibility.HIDDEN,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LayoutOptionDataVisibility[] {
    return LayoutOptionDataVisibility.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LayoutOptionDataVisibility {
    const found = LayoutOptionDataVisibility.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.core.data.LayoutOptionData.Visibility.${name}`,
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

  compareTo(other: LayoutOptionDataVisibility): number {
    return this.#ordinal - other.#ordinal;
  }
}
