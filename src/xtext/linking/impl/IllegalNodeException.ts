// SPDX-License-Identifier: EPL-2.0
import type { INode } from '../../nodemodel/INode.js';

/** The Java package of the exceptions a linking cause can be (`ValueConverterException` and subclasses). */
const CONVERSION_PACKAGE = 'org.eclipse.xtext.conversion.';

/**
 * Java `Throwable(Throwable cause)` takes `cause.toString()` as its message: the binary class name, then
 * `": "` and the cause's message when it has one.
 */
function javaCauseMessage(cause: Error): string {
  const className = `${CONVERSION_PACKAGE}${cause.name}`;
  const getMessage = (cause as { getMessage?: () => string | null }).getMessage;
  const message = typeof getMessage === 'function' ? getMessage.call(cause) : cause.message;
  return message === null ? className : `${className}: ${message}`;
}

/**
 * Thrown when the text of a cross-reference node cannot be converted. Java's four constructors are one:
 * `(node)`, `(node, message)`, `(node, message, cause)` and `(node, cause)` (message = `cause.toString()`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/IllegalNodeException.java
 */
export class IllegalNodeException extends Error {
  readonly #node: INode;

  constructor(node: INode, messageOrCause?: string | Error, cause?: Error) {
    const message = typeof messageOrCause === 'object' ? javaCauseMessage(messageOrCause) : messageOrCause;
    const effectiveCause = typeof messageOrCause === 'object' ? messageOrCause : cause;
    super(message, effectiveCause === undefined ? undefined : { cause: effectiveCause });
    this.name = 'IllegalNodeException';
    this.#node = node;
  }

  getNode(): INode {
    return this.#node;
  }
}
