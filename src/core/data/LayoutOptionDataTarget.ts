// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Enumeration of target elements for layout options.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutOptionData.java
 */
export class LayoutOptionDataTarget {
  /** parents target (hierarchical nodes). */
  static readonly PARENTS: LayoutOptionDataTarget = new LayoutOptionDataTarget('PARENTS', 0);
  /** nodes target. */
  static readonly NODES: LayoutOptionDataTarget = new LayoutOptionDataTarget('NODES', 1);
  /** edges target. */
  static readonly EDGES: LayoutOptionDataTarget = new LayoutOptionDataTarget('EDGES', 2);
  /** ports target. */
  static readonly PORTS: LayoutOptionDataTarget = new LayoutOptionDataTarget('PORTS', 3);
  /** labels target. */
  static readonly LABELS: LayoutOptionDataTarget = new LayoutOptionDataTarget('LABELS', 4);

  static readonly #VALUES: readonly LayoutOptionDataTarget[] = [
    LayoutOptionDataTarget.PARENTS,
    LayoutOptionDataTarget.NODES,
    LayoutOptionDataTarget.EDGES,
    LayoutOptionDataTarget.PORTS,
    LayoutOptionDataTarget.LABELS,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LayoutOptionDataTarget[] {
    return LayoutOptionDataTarget.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LayoutOptionDataTarget {
    const found = LayoutOptionDataTarget.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.data.LayoutOptionData.Target.${name}`);
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

  compareTo(other: LayoutOptionDataTarget): number {
    return this.#ordinal - other.#ordinal;
  }
}
