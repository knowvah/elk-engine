// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/EdgeLabelSideSelection.java
 */
export class EdgeLabelSideSelection {
  static readonly ALWAYS_UP: EdgeLabelSideSelection = new EdgeLabelSideSelection('ALWAYS_UP', 0);
  static readonly ALWAYS_DOWN: EdgeLabelSideSelection = new EdgeLabelSideSelection('ALWAYS_DOWN', 1);
  static readonly DIRECTION_UP: EdgeLabelSideSelection = new EdgeLabelSideSelection('DIRECTION_UP', 2);
  static readonly DIRECTION_DOWN: EdgeLabelSideSelection = new EdgeLabelSideSelection('DIRECTION_DOWN', 3);
  static readonly SMART_UP: EdgeLabelSideSelection = new EdgeLabelSideSelection('SMART_UP', 4);
  static readonly SMART_DOWN: EdgeLabelSideSelection = new EdgeLabelSideSelection('SMART_DOWN', 5);

  static readonly #VALUES: readonly EdgeLabelSideSelection[] = [
    EdgeLabelSideSelection.ALWAYS_UP,
    EdgeLabelSideSelection.ALWAYS_DOWN,
    EdgeLabelSideSelection.DIRECTION_UP,
    EdgeLabelSideSelection.DIRECTION_DOWN,
    EdgeLabelSideSelection.SMART_UP,
    EdgeLabelSideSelection.SMART_DOWN,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeLabelSideSelection[] {
    return EdgeLabelSideSelection.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeLabelSideSelection {
    const found = EdgeLabelSideSelection.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.EdgeLabelSideSelection.${name}`,
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

  compareTo(other: EdgeLabelSideSelection): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Transposes this label side selection strategy and returns the result. Downward selections are turned upwards
   * while upward selections are turned downwards.
   */
  transpose(): EdgeLabelSideSelection | null {
    switch (this) {
      case EdgeLabelSideSelection.ALWAYS_UP:
        return EdgeLabelSideSelection.ALWAYS_DOWN;
      case EdgeLabelSideSelection.ALWAYS_DOWN:
        return EdgeLabelSideSelection.ALWAYS_UP;
      case EdgeLabelSideSelection.DIRECTION_UP:
        return EdgeLabelSideSelection.DIRECTION_DOWN;
      case EdgeLabelSideSelection.DIRECTION_DOWN:
        return EdgeLabelSideSelection.DIRECTION_UP;
      case EdgeLabelSideSelection.SMART_UP:
        return EdgeLabelSideSelection.SMART_DOWN;
      case EdgeLabelSideSelection.SMART_DOWN:
        return EdgeLabelSideSelection.SMART_UP;
      default:
        // Java: `assert false; return null;`. Unreachable (the enum is closed); assertions are omitted
        // (KVector.ts precedent, no devAssert helper) and the JVM, run without -ea, returns null.
        return null;
    }
  }
}
