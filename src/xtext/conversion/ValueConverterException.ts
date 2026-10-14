// SPDX-License-Identifier: EPL-2.0
import type { INode } from '../nodemodel/INode.js';

/**
 * A `ValueConverterException` indicates an input string or node that cannot be converted to a semantic
 * value. Like Java's `RuntimeException(message, cause)` constructor, a `null` message with a cause takes
 * the cause's message.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/ValueConverterException.java
 */
export class ValueConverterException extends Error {
  readonly #node: INode | null;
  readonly #message: string | null;

  constructor(message: string | null, node: INode | null, cause: Error | null) {
    const effective = message === null && cause !== null ? cause.message : message;
    super(effective ?? '', cause === null ? undefined : { cause });
    this.name = 'ValueConverterException';
    this.#message = effective;
    this.#node = node;
  }

  /** Java `Throwable.getMessage()`: `null` when neither a message nor a cause message exists. */
  getMessage(): string | null {
    return this.#message;
  }

  getNode(): INode | null {
    return this.#node;
  }
}
