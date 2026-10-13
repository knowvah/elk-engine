// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { hashCode as stringHashCode } from '../../java/lang/JavaString.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { StringBuilder } from '../../java/lang/StringBuilder.js';
import { ElkUtil } from '../util/ElkUtil.js';

/**
 * Enumeration of issue severities.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/GraphIssue.java
 */
export class Severity {
  /** An error means the layout process is aborted and the error is reported to the user. */
  static readonly ERROR: Severity = new Severity('ERROR', 0, 'Error');
  /** A graph with warnings but no errors can still be processed. */
  static readonly WARNING: Severity = new Severity('WARNING', 1, 'Warning');

  static readonly #VALUES: readonly Severity[] = [Severity.ERROR, Severity.WARNING];

  readonly #name: string;
  readonly #ordinal: number;
  /** User-readable name of this severity. */
  readonly #userString: string;

  private constructor(name: string, ordinal: number, userString: string) {
    this.#name = name;
    this.#ordinal = ordinal;
    this.#userString = userString;
  }

  /** The constants in declaration order. */
  static values(): readonly Severity[] {
    return Severity.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Severity {
    const found = Severity.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.core.validation.GraphIssue.Severity.${name}`,
      );
    }
    return found;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  compareTo(other: Severity): number {
    return this.#ordinal - other.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }

  /** Returns a user-friendly string for this severity. */
  getUserString(): string {
    return this.#userString;
  }
}

/**
 * An issue found while validating a graph element.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/GraphIssue.java
 */
export class GraphIssue {
  /** Enumeration of issue severities (nested type, C3). */
  static readonly Severity: typeof Severity = Severity;

  readonly #element: ElkGraphElement | null;
  readonly #message: string;
  readonly #severity: Severity;

  /**
   * Create a graph issue.
   *
   * @param element the graph element to which the issue applies; may be `null`
   * @param message a message to be shown to users
   * @param severity the severity of the issue
   * (Java's `NullPointerException` for a `null` message or severity is excluded by the types.)
   */
  constructor(element: ElkGraphElement | null, message: string, severity: Severity) {
    this.#element = element;
    this.#message = message;
    this.#severity = severity;
  }

  /** The graph element to which the issue applies. May be `null`. */
  getElement(): ElkGraphElement | null {
    return this.#element;
  }

  /** A message to be shown to users. */
  getMessage(): string {
    return this.#message;
  }

  /** The severity of the issue. */
  getSeverity(): Severity {
    return this.#severity;
  }

  equals(obj: unknown): boolean {
    if (obj instanceof GraphIssue) {
      return this.#element === obj.#element && this.#message === obj.#message && this.#severity === obj.#severity;
    }
    return false;
  }

  /**
   * Java XORs `element.hashCode()` (identity, EMF objects do not override it) and
   * `severity.hashCode()` (identity); both use {@link identityHashCode}, which differs from the
   * JVM's values (journaled). A `null` element throws `TypeError` (Java: `NullPointerException`, D10).
   */
  hashCode(): number {
    return identityHashCode(this.#nonNullElement()) ^ stringHashCode(this.#message) ^ identityHashCode(this.#severity);
  }

  /** Java dereferences `element` and throws `NullPointerException`; the port throws `TypeError` (D10). */
  #nonNullElement(): ElkGraphElement {
    if (this.#element === null) {
      throw new TypeError('the issue has no element');
    }
    return this.#element;
  }

  toString(): string {
    const result = new StringBuilder();
    result.appendObject(this.#severity).append(': ').append(this.#message).append(' (');
    ElkUtil.printElementPath(this.#nonNullElement(), result);
    result.append(')');
    return result.toString();
  }
}
