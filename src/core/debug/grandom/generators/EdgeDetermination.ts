// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * the possible ways to determine edges.
 *
 * Nested enum of `GeneratorOptions` in Java; a sibling file here (translation rule 6.4).
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/GeneratorOptions.java
 */
export class EdgeDetermination {
  /** absolute number of edges in the graph. */
  static readonly ABSOLUTE: EdgeDetermination = new EdgeDetermination('ABSOLUTE', 0);
  /** number of outgoing edges per node. */
  static readonly OUTGOING: EdgeDetermination = new EdgeDetermination('OUTGOING', 1);
  /** relative number of edges (relative to n). */
  static readonly RELATIVE: EdgeDetermination = new EdgeDetermination('RELATIVE', 2);
  /** density (relative to n^2). */
  static readonly DENSITY: EdgeDetermination = new EdgeDetermination('DENSITY', 3);

  static readonly #VALUES: readonly EdgeDetermination[] = [
    EdgeDetermination.ABSOLUTE,
    EdgeDetermination.OUTGOING,
    EdgeDetermination.RELATIVE,
    EdgeDetermination.DENSITY,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeDetermination[] {
    return EdgeDetermination.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeDetermination {
    const found = EdgeDetermination.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.core.debug.grandom.generators.GeneratorOptions.EdgeDetermination.${name}`,
      );
    }
    return found;
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

  compareTo(other: EdgeDetermination): number {
    return this.#ordinal - other.#ordinal;
  }
}
