// SPDX-License-Identifier: EPL-2.0
import type { INode } from '../nodemodel/INode.js';
import { ValueConverterException } from './ValueConverterException.js';

/** The `offset`/`length` of a ranged exception (Java's six-argument constructor). */
export interface ErrorRange {
  /** The offset relative to the total offset of the node. */
  readonly offset: number;
  /** The length of the error. */
  readonly length: number;
}

const NO_RANGE: ErrorRange = { offset: -1, length: -1 };

/**
 * A value converter exception that carries the value around, that was recoverable from a badly
 * formatted string or erroneous node. Java's ranged constructor
 * `(message, node, value, offset, length, cause)` is the four-argument constructor plus an optional
 * trailing {@link ErrorRange} (the complexity limit allows five parameters); without a range, `offset`
 * and `length` are `-1`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/ValueConverterWithValueException.java
 */
export class ValueConverterWithValueException extends ValueConverterException {
  readonly #value: unknown;
  readonly #range: ErrorRange;

  constructor(
    message: string | null,
    node: INode | null,
    value: unknown,
    cause: Error | null,
    range: ErrorRange = NO_RANGE,
  ) {
    super(message, node, cause);
    this.name = 'ValueConverterWithValueException';
    this.#value = value;
    this.#range = range;
  }

  hasRange(): boolean {
    return this.#range.offset !== -1;
  }

  getOffset(): number {
    return this.#range.offset;
  }

  getLength(): number {
    return this.#range.length;
  }

  getValue(): unknown {
    return this.#value;
  }
}
