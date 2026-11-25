// SPDX-License-Identifier: EPL-2.0

/**
 * A representation of the literals of the enumeration '<em><b>Edge Operator</b></em>', and utility methods
 * for working with them. EMF's `Enumerator` interface is not ported; `name()` is the Java enum's constant name.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/EdgeOperator.java
 */
export class EdgeOperator {
  /** The '<em><b>Directed</b></em>' literal value. */
  static readonly DIRECTED_VALUE: number = 0;
  /** The '<em><b>Undirected</b></em>' literal value. */
  static readonly UNDIRECTED_VALUE: number = 1;

  /** The '<em><b>Directed</b></em>' literal object. */
  static readonly DIRECTED: EdgeOperator = new EdgeOperator('DIRECTED', 0, 'directed', '->');
  /** The '<em><b>Undirected</b></em>' literal object. */
  static readonly UNDIRECTED: EdgeOperator = new EdgeOperator('UNDIRECTED', 1, 'undirected', '--');

  /** A public read-only list of all the '<em><b>Edge Operator</b></em>' enumerators. */
  static readonly VALUES: readonly EdgeOperator[] = Object.freeze([EdgeOperator.DIRECTED, EdgeOperator.UNDIRECTED]);

  readonly #javaName: string;
  readonly #value: number;
  readonly #name: string;
  readonly #literal: string;

  private constructor(javaName: string, value: number, name: string, literal: string) {
    this.#javaName = javaName;
    this.#value = value;
    this.#name = name;
    this.#literal = literal;
  }

  /**
   * Java's `get(String literal)` and `get(int value)`, merged (translation rule 6.5): the literal with the
   * specified literal value (compared with `toString()`) or integer value, or `null`.
   */
  static get(literal: string): EdgeOperator | null;
  static get(value: number): EdgeOperator | null;
  static get(literalOrValue: string | number): EdgeOperator | null {
    if (typeof literalOrValue === 'number') {
      return EdgeOperator.VALUES.find((result) => result.getValue() === literalOrValue) ?? null;
    }
    return EdgeOperator.VALUES.find((result) => result.toString() === literalOrValue) ?? null;
  }

  /** Returns the '<em><b>Edge Operator</b></em>' literal with the specified name, or `null`. */
  static getByName(name: string): EdgeOperator | null {
    return EdgeOperator.VALUES.find((result) => result.getName() === name) ?? null;
  }

  /** Java `Enum.name()`: the constant's identifier. */
  name(): string {
    return this.#javaName;
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

  /** Returns the literal value of the enumerator, which is its string representation. */
  toString(): string {
    return this.#literal;
  }
}
