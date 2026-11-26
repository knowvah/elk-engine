// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Definition of available Graphviz commands.
 *
 * Java's `String.toUpperCase()` (default locale) is JavaScript's locale-independent `toUpperCase()`: the two agree
 * except under locales with special casing rules (Turkish dotted i), which the port does not model.
 *
 * @author msp
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/Command.java
 */
export class Command {
  /** invalid command. */
  static readonly INVALID: Command = new Command('INVALID', 0);
  /** command for Dot layout. */
  static readonly DOT: Command = new Command('DOT', 1);
  /** command for Neato layout. */
  static readonly NEATO: Command = new Command('NEATO', 2);
  /** command for Twopi layout. */
  static readonly TWOPI: Command = new Command('TWOPI', 3);
  /** command for Fdp layout. */
  static readonly FDP: Command = new Command('FDP', 4);
  /** command for Circo layout. */
  static readonly CIRCO: Command = new Command('CIRCO', 5);

  static readonly #VALUES: readonly Command[] = [
    Command.INVALID,
    Command.DOT,
    Command.NEATO,
    Command.TWOPI,
    Command.FDP,
    Command.CIRCO,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly Command[] {
    return Command.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Command {
    const found = Command.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.graphviz.dot.transform.Command.${name}`);
    }
    return found;
  }

  /**
   * Parse the given string into a command, ignoring case.
   *
   * @param string a string
   * @returns the corresponding command, or `INVALID` if the string does not hold a valid command
   */
  static parse(string: string): Command {
    try {
      return Command.valueOf(string.toUpperCase());
    } catch (exception) {
      if (exception instanceof IllegalArgumentException) {
        return Command.INVALID;
      }
      throw exception;
    }
  }

  ordinal(): number {
    return this.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  /** The Java override: `super.toString().toLowerCase()`. */
  toString(): string {
    return this.#name.toLowerCase();
  }

  compareTo(other: Command): number {
    return this.#ordinal - other.#ordinal;
  }
}
