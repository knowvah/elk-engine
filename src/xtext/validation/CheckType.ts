// SPDX-License-Identifier: EPL-2.0

/**
 * When a check runs: while typing (`FAST`), on save (`NORMAL`) or on demand (`EXPENSIVE`). A ported Java
 * enum (translation rules 6.3).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/CheckType.java
 */
export class CheckType {
  static readonly FAST: CheckType = new CheckType('FAST', 0);
  static readonly NORMAL: CheckType = new CheckType('NORMAL', 1);
  static readonly EXPENSIVE: CheckType = new CheckType('EXPENSIVE', 2);

  static readonly #VALUES: readonly CheckType[] = [CheckType.FAST, CheckType.NORMAL, CheckType.EXPENSIVE];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly CheckType[] {
    return CheckType.#VALUES;
  }

  name(): string {
    return this.#name;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  toString(): string {
    return this.#name;
  }
}
