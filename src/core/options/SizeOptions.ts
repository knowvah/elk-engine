// SPDX-License-Identifier: EPL-2.0
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Options modifying how node sizes are calculated; used in an `EnumSet`.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/SizeOptions.java
 */
export class SizeOptions {
  static readonly DEFAULT_MINIMUM_SIZE: SizeOptions = new SizeOptions('DEFAULT_MINIMUM_SIZE', 0);
  static readonly MINIMUM_SIZE_ACCOUNTS_FOR_PADDING: SizeOptions = new SizeOptions(
    'MINIMUM_SIZE_ACCOUNTS_FOR_PADDING',
    1,
  );
  static readonly COMPUTE_PADDING: SizeOptions = new SizeOptions('COMPUTE_PADDING', 2);
  static readonly OUTSIDE_NODE_LABELS_OVERHANG: SizeOptions = new SizeOptions('OUTSIDE_NODE_LABELS_OVERHANG', 3);
  static readonly PORTS_OVERHANG: SizeOptions = new SizeOptions('PORTS_OVERHANG', 4);
  static readonly UNIFORM_PORT_SPACING: SizeOptions = new SizeOptions('UNIFORM_PORT_SPACING', 5);
  /** @deprecated Use {@link PortLabelPlacement#SPACE_EFFICIENT}. */
  static readonly SPACE_EFFICIENT_PORT_LABELS: SizeOptions = new SizeOptions('SPACE_EFFICIENT_PORT_LABELS', 6);
  static readonly FORCE_TABULAR_NODE_LABELS: SizeOptions = new SizeOptions('FORCE_TABULAR_NODE_LABELS', 7);
  static readonly ASYMMETRICAL: SizeOptions = new SizeOptions('ASYMMETRICAL', 8);

  static readonly #VALUES: readonly SizeOptions[] = [
    SizeOptions.DEFAULT_MINIMUM_SIZE,
    SizeOptions.MINIMUM_SIZE_ACCOUNTS_FOR_PADDING,
    SizeOptions.COMPUTE_PADDING,
    SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG,
    SizeOptions.PORTS_OVERHANG,
    SizeOptions.UNIFORM_PORT_SPACING,
    SizeOptions.SPACE_EFFICIENT_PORT_LABELS,
    SizeOptions.FORCE_TABULAR_NODE_LABELS,
    SizeOptions.ASYMMETRICAL,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SizeOptions[] {
    return SizeOptions.#VALUES;
  }

  /**
   * Resolves a constant by name (the enum's implicit `valueOf(String)`) or by ordinal (the custom
   * `valueOf(int)`); one method dispatches on `typeof` per translation-rules 6.5.
   *
   * @throws IllegalArgumentException if no constant has the given name.
   * @throws ArrayIndexOutOfBoundsException if the ordinal is out of range.
   */
  static valueOf(key: string | number): SizeOptions {
    if (typeof key === 'number') {
      const byOrdinal = SizeOptions.#VALUES[key];
      if (byOrdinal === undefined) {
        throw new ArrayIndexOutOfBoundsException(`Index ${key} out of bounds for length ${SizeOptions.#VALUES.length}`);
      }
      return byOrdinal;
    }
    const found = SizeOptions.#VALUES.find((constant) => constant.#name === key);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.SizeOptions.${key}`);
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

  compareTo(other: SizeOptions): number {
    return this.#ordinal - other.#ordinal;
  }
}
