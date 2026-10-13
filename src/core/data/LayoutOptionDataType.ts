// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Enumeration of data types for layout options.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutOptionData.java
 */
export class LayoutOptionDataType {
  /** undefined type. */
  static readonly UNDEFINED: LayoutOptionDataType = new LayoutOptionDataType('UNDEFINED', 0);
  /** boolean type. */
  static readonly BOOLEAN: LayoutOptionDataType = new LayoutOptionDataType('BOOLEAN', 1);
  /** integer type. */
  static readonly INT: LayoutOptionDataType = new LayoutOptionDataType('INT', 2);
  /** string type. */
  static readonly STRING: LayoutOptionDataType = new LayoutOptionDataType('STRING', 3);
  /** double type. */
  static readonly DOUBLE: LayoutOptionDataType = new LayoutOptionDataType('DOUBLE', 4);
  /** enumeration type. */
  static readonly ENUM: LayoutOptionDataType = new LayoutOptionDataType('ENUM', 5);
  /** enumeration set type. */
  static readonly ENUMSET: LayoutOptionDataType = new LayoutOptionDataType('ENUMSET', 6);
  /** {@link IDataObject} type. */
  static readonly OBJECT: LayoutOptionDataType = new LayoutOptionDataType('OBJECT', 7);

  static readonly #VALUES: readonly LayoutOptionDataType[] = [
    LayoutOptionDataType.UNDEFINED,
    LayoutOptionDataType.BOOLEAN,
    LayoutOptionDataType.INT,
    LayoutOptionDataType.STRING,
    LayoutOptionDataType.DOUBLE,
    LayoutOptionDataType.ENUM,
    LayoutOptionDataType.ENUMSET,
    LayoutOptionDataType.OBJECT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LayoutOptionDataType[] {
    return LayoutOptionDataType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LayoutOptionDataType {
    const found = LayoutOptionDataType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.data.LayoutOptionData.Type.${name}`);
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

  compareTo(other: LayoutOptionDataType): number {
    return this.#ordinal - other.#ordinal;
  }
}
