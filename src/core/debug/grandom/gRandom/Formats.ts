// SPDX-License-Identifier: EPL-2.0

/**
 * The generated EMF enumerator `Formats`.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Formats.java
 */
export class Formats {
  static readonly ELKT_VALUE: number = 0;
  static readonly ELKG_VALUE: number = 1;

  static readonly ELKT: Formats = new Formats(0, 'elkt', 'elkt');
  static readonly ELKG: Formats = new Formats(1, 'elkg', 'elkg');

  static readonly VALUES: readonly Formats[] = [Formats.ELKT, Formats.ELKG];

  readonly #value: number;
  readonly #name: string;
  readonly #literal: string;

  private constructor(value: number, name: string, literal: string) {
    this.#value = value;
    this.#name = name;
    this.#literal = literal;
  }

  /** Java `get(String literal)`: the constant with the given literal, or `null`. */
  static get(literal: string): Formats | null {
    return Formats.VALUES.find((result) => result.toString() === literal) ?? null;
  }

  /** Java `getByName(String)`: the constant with the given name, or `null`. */
  static getByName(name: string): Formats | null {
    return Formats.VALUES.find((result) => result.getName() === name) ?? null;
  }

  /** Java `get(int value)` (suffixed, translation rule 6.5): the constant with the given value, or `null`. */
  static getByValue(value: number): Formats | null {
    return Formats.VALUES.find((result) => result.getValue() === value) ?? null;
  }

  getValue(): number {
    return this.#value;
  }

  getName(): string {
    return this.#name;
  }

  getLiteral(): string {
    return this.#literal;
  }

  toString(): string {
    return this.#literal;
  }
}
