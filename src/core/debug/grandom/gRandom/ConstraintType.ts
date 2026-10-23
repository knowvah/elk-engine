// SPDX-License-Identifier: EPL-2.0

/**
 * The generated EMF enumerator `ConstraintType`.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/ConstraintType.java
 */
export class ConstraintType {
  static readonly FREE_VALUE: number = 0;
  static readonly SIDE_VALUE: number = 1;
  static readonly POSITION_VALUE: number = 2;
  static readonly ORDER_VALUE: number = 3;
  static readonly RATIO_VALUE: number = 4;

  static readonly FREE: ConstraintType = new ConstraintType(0, 'free', 'free');
  static readonly SIDE: ConstraintType = new ConstraintType(1, 'side', 'side');
  static readonly POSITION: ConstraintType = new ConstraintType(2, 'position', 'position');
  static readonly ORDER: ConstraintType = new ConstraintType(3, 'order', 'order');
  static readonly RATIO: ConstraintType = new ConstraintType(4, 'ratio', 'ratio');

  static readonly VALUES: readonly ConstraintType[] = [
    ConstraintType.FREE,
    ConstraintType.SIDE,
    ConstraintType.POSITION,
    ConstraintType.ORDER,
    ConstraintType.RATIO,
  ];

  readonly #value: number;
  readonly #name: string;
  readonly #literal: string;

  private constructor(value: number, name: string, literal: string) {
    this.#value = value;
    this.#name = name;
    this.#literal = literal;
  }

  /** Java `get(String literal)`: the constant with the given literal, or `null`. */
  static get(literal: string): ConstraintType | null {
    return ConstraintType.VALUES.find((result) => result.toString() === literal) ?? null;
  }

  /** Java `getByName(String)`: the constant with the given name, or `null`. */
  static getByName(name: string): ConstraintType | null {
    return ConstraintType.VALUES.find((result) => result.getName() === name) ?? null;
  }

  /** Java `get(int value)` (suffixed, translation rule 6.5): the constant with the given value, or `null`. */
  static getByValue(value: number): ConstraintType | null {
    return ConstraintType.VALUES.find((result) => result.getValue() === value) ?? null;
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
