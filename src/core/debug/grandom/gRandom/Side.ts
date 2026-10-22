// SPDX-License-Identifier: EPL-2.0

/**
 * The generated EMF enumerator `Side`.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Side.java
 */
export class Side {
  static readonly NORTH_VALUE: number = 0;
  static readonly EAST_VALUE: number = 1;
  static readonly SOUTH_VALUE: number = 2;
  static readonly WEST_VALUE: number = 3;

  static readonly NORTH: Side = new Side(0, 'north', 'north');
  static readonly EAST: Side = new Side(1, 'east', 'east');
  static readonly SOUTH: Side = new Side(2, 'south', 'south');
  static readonly WEST: Side = new Side(3, 'west', 'west');

  static readonly VALUES: readonly Side[] = [Side.NORTH, Side.EAST, Side.SOUTH, Side.WEST];

  readonly #value: number;
  readonly #name: string;
  readonly #literal: string;

  private constructor(value: number, name: string, literal: string) {
    this.#value = value;
    this.#name = name;
    this.#literal = literal;
  }

  /** Java `get(String literal)`: the constant with the given literal, or `null`. */
  static get(literal: string): Side | null {
    return Side.VALUES.find((result) => result.toString() === literal) ?? null;
  }

  /** Java `getByName(String)`: the constant with the given name, or `null`. */
  static getByName(name: string): Side | null {
    return Side.VALUES.find((result) => result.getName() === name) ?? null;
  }

  /** Java `get(int value)` (suffixed, translation rule 6.5): the constant with the given value, or `null`. */
  static getByValue(value: number): Side | null {
    return Side.VALUES.find((result) => result.getValue() === value) ?? null;
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
