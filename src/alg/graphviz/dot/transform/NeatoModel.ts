// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Definition of Neato distance computation models.
 *
 * Java's `String.toUpperCase()`/`toLowerCase()` (default locale) are JavaScript's locale-independent forms.
 *
 * @author msp
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/NeatoModel.java
 */
export class NeatoModel {
  /** Use length of the shortest path. */
  static readonly SHORTPATH: NeatoModel = new NeatoModel('SHORTPATH', 0);
  /** Use the circuit resistance model. */
  static readonly CIRCUIT: NeatoModel = new NeatoModel('CIRCUIT', 1);
  /** Use the subset model. */
  static readonly SUBSET: NeatoModel = new NeatoModel('SUBSET', 2);

  static readonly #VALUES: readonly NeatoModel[] = [NeatoModel.SHORTPATH, NeatoModel.CIRCUIT, NeatoModel.SUBSET];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly NeatoModel[] {
    return NeatoModel.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): NeatoModel {
    const found = NeatoModel.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.graphviz.dot.transform.NeatoModel.${name}`,
      );
    }
    return found;
  }

  /**
   * Parse the given string into a Neato model, ignoring case.
   *
   * @param string a string
   * @returns the corresponding model
   * @throws IllegalArgumentException if the string names no model
   */
  static parse(string: string): NeatoModel {
    return NeatoModel.valueOf(string.toUpperCase());
  }

  /**
   * Return the literal value as understood by Graphviz.
   *
   * @returns the literal value
   */
  literal(): string {
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

  compareTo(other: NeatoModel): number {
    return this.#ordinal - other.#ordinal;
  }
}
