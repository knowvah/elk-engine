// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Definition of overlap removal modes.
 *
 * Java's `String.toUpperCase()`/`toLowerCase()` (default locale) are JavaScript's locale-independent forms.
 *
 * @author msp
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/OverlapMode.java
 */
export class OverlapMode {
  /** overlaps are retained ("true" in the Graphviz options). */
  static readonly NONE: OverlapMode = new OverlapMode('NONE', 0);
  /** overlaps are removed by uniformly scaling in x and y. */
  static readonly SCALE: OverlapMode = new OverlapMode('SCALE', 1);
  /** x and y are separately scaled to remove overlaps. */
  static readonly SCALEXY: OverlapMode = new OverlapMode('SCALEXY', 2);
  /** Prism, a proximity graph-based algorithm, is used to remove node overlaps. */
  static readonly PRISM: OverlapMode = new OverlapMode('PRISM', 3);
  /** the layout will be scaled down as much as possible without introducing any overlaps. */
  static readonly COMPRESS: OverlapMode = new OverlapMode('COMPRESS', 4);

  static readonly #VALUES: readonly OverlapMode[] = [
    OverlapMode.NONE,
    OverlapMode.SCALE,
    OverlapMode.SCALEXY,
    OverlapMode.PRISM,
    OverlapMode.COMPRESS,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly OverlapMode[] {
    return OverlapMode.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): OverlapMode {
    const found = OverlapMode.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.graphviz.dot.transform.OverlapMode.${name}`,
      );
    }
    return found;
  }

  /**
   * Parse the given string into an overlap mode, ignoring case.
   *
   * @param string a string
   * @returns the corresponding mode
   * @throws IllegalArgumentException if the string names no mode
   */
  static parse(string: string): OverlapMode {
    if (string.toLowerCase() === 'true') {
      return OverlapMode.NONE;
    }
    return OverlapMode.valueOf(string.toUpperCase());
  }

  /**
   * Return the literal value as understood by Graphviz.
   *
   * @returns the literal value
   */
  literal(): string {
    if (this === OverlapMode.NONE) {
      return 'true';
    }
    return this.#name.toLowerCase();
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

  compareTo(other: OverlapMode): number {
    return this.#ordinal - other.#ordinal;
  }
}
