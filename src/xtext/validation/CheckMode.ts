// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { CheckType } from './CheckType.js';

/**
 * Selects which check types run. The five Java singletons (anonymous subclasses) are instances of one
 * class holding the predicate and the `toString` text.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/CheckMode.java
 */
export class CheckMode {
  /** The context key holding the mode of a validation run. */
  static readonly KEY: string = 'check.mode';

  static readonly FAST_ONLY: CheckMode = new CheckMode((type) => type === CheckType.FAST, CheckType.FAST.toString());
  static readonly NORMAL_ONLY: CheckMode = new CheckMode(
    (type) => type === CheckType.NORMAL,
    CheckType.NORMAL.toString(),
  );
  static readonly EXPENSIVE_ONLY: CheckMode = new CheckMode(
    (type) => type === CheckType.EXPENSIVE,
    CheckType.EXPENSIVE.toString(),
  );
  static readonly NORMAL_AND_FAST: CheckMode = new CheckMode(
    (type) => type === CheckType.NORMAL || type === CheckType.FAST,
    `${CheckType.NORMAL.toString()}|${CheckType.FAST.toString()}`,
  );
  static readonly ALL: CheckMode = new CheckMode(() => true, 'ALL');

  readonly #predicate: (type: CheckType) => boolean;
  readonly #text: string;

  private constructor(predicate: (type: CheckType) => boolean, text: string) {
    this.#predicate = predicate;
    this.#text = text;
  }

  shouldCheck(type: CheckType): boolean {
    return this.#predicate(type);
  }

  toString(): string {
    return this.#text;
  }

  /**
   * The mode stored in a validation context, `ALL` when absent.
   *
   * @param context the validation context, or `null`
   * @returns the mode under {@link CheckMode.KEY}
   * @throws IllegalArgumentException if the stored value is not a `CheckMode`
   */
  static getCheckMode(context: ReadonlyMap<unknown, unknown> | null): CheckMode {
    if (context === null) {
      return CheckMode.ALL;
    }
    const stored = context.get(CheckMode.KEY);
    if (stored instanceof CheckMode) {
      return stored;
    }
    if (stored !== undefined && stored !== null) {
      throw new IllegalArgumentException(
        `Context object for key ${CheckMode.KEY} should be of Type CheckMode but was ${typeof stored}`,
      );
    }
    return CheckMode.ALL;
  }
}
