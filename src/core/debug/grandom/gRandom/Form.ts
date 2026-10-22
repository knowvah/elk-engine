// SPDX-License-Identifier: EPL-2.0

/**
 * The generated EMF enumerator `Form`.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Form.java
 */
export class Form {
  static readonly TREES_VALUE: number = 0;
  static readonly CUSTOM_VALUE: number = 1;
  static readonly BIPARTITE_VALUE: number = 2;
  static readonly BICONNECTED_VALUE: number = 3;
  static readonly TRICONNECTED_VALUE: number = 4;
  static readonly ACYCLIC_VALUE: number = 5;

  static readonly TREES: Form = new Form(0, 'trees', 'trees');
  static readonly CUSTOM: Form = new Form(1, 'custom', 'graphs');
  static readonly BIPARTITE: Form = new Form(2, 'bipartite', 'bipartite graphs');
  static readonly BICONNECTED: Form = new Form(3, 'biconnected', 'biconnected graphs');
  static readonly TRICONNECTED: Form = new Form(4, 'triconnected', 'triconnected graphs');
  static readonly ACYCLIC: Form = new Form(5, 'acyclic', 'acyclic graphs');

  static readonly VALUES: readonly Form[] = [
    Form.TREES,
    Form.CUSTOM,
    Form.BIPARTITE,
    Form.BICONNECTED,
    Form.TRICONNECTED,
    Form.ACYCLIC,
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
  static get(literal: string): Form | null {
    return Form.VALUES.find((result) => result.toString() === literal) ?? null;
  }

  /** Java `getByName(String)`: the constant with the given name, or `null`. */
  static getByName(name: string): Form | null {
    return Form.VALUES.find((result) => result.getName() === name) ?? null;
  }

  /** Java `get(int value)` (suffixed, translation rule 6.5): the constant with the given value, or `null`. */
  static getByValue(value: number): Form | null {
    return Form.VALUES.find((result) => result.getValue() === value) ?? null;
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
