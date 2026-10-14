// SPDX-License-Identifier: EPL-2.0

/**
 * The severity of an issue, as a ported Java enum (translation rules 6.3).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/Severity.java
 */
export class Severity {
  static readonly ERROR: Severity = new Severity('ERROR', 0);
  static readonly WARNING: Severity = new Severity('WARNING', 1);
  static readonly INFO: Severity = new Severity('INFO', 2);
  static readonly IGNORE: Severity = new Severity('IGNORE', 3);

  static readonly #VALUES: readonly Severity[] = [Severity.ERROR, Severity.WARNING, Severity.INFO, Severity.IGNORE];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly Severity[] {
    return Severity.#VALUES;
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
