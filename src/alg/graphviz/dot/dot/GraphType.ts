// SPDX-License-Identifier: EPL-2.0

/**
 * A representation of the literals of the enumeration '<em><b>Graph Type</b></em>', and utility methods for
 * working with them. EMF's `Enumerator` interface is not ported; `name()` is the Java enum's constant name.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/GraphType.java
 */
export class GraphType {
  /** The '<em><b>Graph</b></em>' literal value. */
  static readonly GRAPH_VALUE: number = 0;
  /** The '<em><b>Digraph</b></em>' literal value. */
  static readonly DIGRAPH_VALUE: number = 1;

  /** The '<em><b>Graph</b></em>' literal object. */
  static readonly GRAPH: GraphType = new GraphType('GRAPH', 0, 'graph', 'graph');
  /** The '<em><b>Digraph</b></em>' literal object. */
  static readonly DIGRAPH: GraphType = new GraphType('DIGRAPH', 1, 'digraph', 'digraph');

  /** A public read-only list of all the '<em><b>Graph Type</b></em>' enumerators. */
  static readonly VALUES: readonly GraphType[] = Object.freeze([GraphType.GRAPH, GraphType.DIGRAPH]);

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
  static get(literal: string): GraphType | null;
  static get(value: number): GraphType | null;
  static get(literalOrValue: string | number): GraphType | null {
    if (typeof literalOrValue === 'number') {
      return GraphType.VALUES.find((result) => result.getValue() === literalOrValue) ?? null;
    }
    return GraphType.VALUES.find((result) => result.toString() === literalOrValue) ?? null;
  }

  /** Returns the '<em><b>Graph Type</b></em>' literal with the specified name, or `null`. */
  static getByName(name: string): GraphType | null {
    return GraphType.VALUES.find((result) => result.getName() === name) ?? null;
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
