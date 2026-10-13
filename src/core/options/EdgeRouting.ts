// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Definition of edge routing styles. To be accessed using {@link CoreOptions#EDGE_ROUTING}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/EdgeRouting.java
 */
export class EdgeRouting {
  /** undefined edge routing. */
  static readonly UNDEFINED: EdgeRouting = new EdgeRouting('UNDEFINED', 0);
  /** polyline edge routing. */
  static readonly POLYLINE: EdgeRouting = new EdgeRouting('POLYLINE', 1);
  /** orthogonal edge routing. */
  static readonly ORTHOGONAL: EdgeRouting = new EdgeRouting('ORTHOGONAL', 2);
  /** splines edge routing. */
  static readonly SPLINES: EdgeRouting = new EdgeRouting('SPLINES', 3);

  static readonly #VALUES: readonly EdgeRouting[] = [
    EdgeRouting.UNDEFINED,
    EdgeRouting.POLYLINE,
    EdgeRouting.ORTHOGONAL,
    EdgeRouting.SPLINES,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeRouting[] {
    return EdgeRouting.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeRouting {
    const found = EdgeRouting.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.EdgeRouting.${name}`);
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

  compareTo(other: EdgeRouting): number {
    return this.#ordinal - other.#ordinal;
  }
}
