// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Configures the packing mode used by the `BoxLayoutProvider`. If `SIMPLE` is not required, `GROUP_DEC` could
 * improve the packing and decrease the area. `GROUP_MIXED` and `GROUP_INC` may, in very specific scenarios, work
 * better.
 *
 * `BoxLayoutProvider.PackingMode` in its own file (C3: the outer class is not ported yet; it adds
 * `static readonly PackingMode = PackingMode` when it is).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/BoxLayoutProvider.java
 */
export class PackingMode {
  /** In order to use either of `BoxLayouterOptions.PRIORITY` `BoxLayouterOptions.INTERACTIVE`, this mode must be used. */
  static readonly SIMPLE: PackingMode = new PackingMode('SIMPLE', 0);
  /** Tries to group boxes iterating the boxes in decreasing area. */
  static readonly GROUP_DEC: PackingMode = new PackingMode('GROUP_DEC', 1);
  /**
   * Iterating in increasing area, tries to be smart by grouping a subset of small nodes such that their combined
   * area is close to half of the area of a larger node.
   */
  static readonly GROUP_MIXED: PackingMode = new PackingMode('GROUP_MIXED', 2);
  /** Tries to group boxes iterating the boxes in increasing area. */
  static readonly GROUP_INC: PackingMode = new PackingMode('GROUP_INC', 3);

  static readonly #VALUES: readonly PackingMode[] = [
    PackingMode.SIMPLE,
    PackingMode.GROUP_DEC,
    PackingMode.GROUP_MIXED,
    PackingMode.GROUP_INC,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly PackingMode[] {
    return PackingMode.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): PackingMode {
    const found = PackingMode.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.core.util.BoxLayoutProvider.PackingMode.${name}`,
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

  compareTo(other: PackingMode): number {
    return this.#ordinal - other.#ordinal;
  }
}
