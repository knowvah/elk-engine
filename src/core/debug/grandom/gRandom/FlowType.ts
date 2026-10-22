// SPDX-License-Identifier: EPL-2.0

/**
 * The generated EMF enumerator `FlowType`.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/FlowType.java
 */
export class FlowType {
  static readonly INCOMING_VALUE: number = 0;
  static readonly OUTGOING_VALUE: number = 1;

  static readonly INCOMING: FlowType = new FlowType(0, 'incoming', 'incoming');
  static readonly OUTGOING: FlowType = new FlowType(1, 'outgoing', 'outgoing');

  static readonly VALUES: readonly FlowType[] = [FlowType.INCOMING, FlowType.OUTGOING];

  readonly #value: number;
  readonly #name: string;
  readonly #literal: string;

  private constructor(value: number, name: string, literal: string) {
    this.#value = value;
    this.#name = name;
    this.#literal = literal;
  }

  /** Java `get(String literal)`: the constant with the given literal, or `null`. */
  static get(literal: string): FlowType | null {
    return FlowType.VALUES.find((result) => result.toString() === literal) ?? null;
  }

  /** Java `getByName(String)`: the constant with the given name, or `null`. */
  static getByName(name: string): FlowType | null {
    return FlowType.VALUES.find((result) => result.getName() === name) ?? null;
  }

  /** Java `get(int value)` (suffixed, translation rule 6.5): the constant with the given value, or `null`. */
  static getByValue(value: number): FlowType | null {
    return FlowType.VALUES.find((result) => result.getValue() === value) ?? null;
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
