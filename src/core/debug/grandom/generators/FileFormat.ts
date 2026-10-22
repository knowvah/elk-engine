// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * the available file formats.
 *
 * Nested enum of `GeneratorOptions` in Java; a sibling file here (translation rule 6.4).
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/GeneratorOptions.java
 */
export class FileFormat {
  /** XMI-based format (kgx). */
  static readonly XMI: FileFormat = new FileFormat('XMI', 0);
  /** Xtext-based format (kgt). */
  static readonly XTEXT: FileFormat = new FileFormat('XTEXT', 1);

  static readonly #VALUES: readonly FileFormat[] = [FileFormat.XMI, FileFormat.XTEXT];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly FileFormat[] {
    return FileFormat.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): FileFormat {
    const found = FileFormat.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.core.debug.grandom.generators.GeneratorOptions.FileFormat.${name}`,
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

  compareTo(other: FileFormat): number {
    return this.#ordinal - other.#ordinal;
  }
}
