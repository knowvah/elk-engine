// SPDX-License-Identifier: EPL-2.0
import { AbstractDiagnostic } from '../../diagnostics/AbstractDiagnostic.js';
import type { INode } from '../../nodemodel/INode.js';

const NULL_NODE = 'node may not be null';
const NULL_DATA = 'data may not contain null';

/**
 * A linking issue located at a cross-reference node. `hashCode` is not ported (no hashed container
 * holds diagnostics); `equals` compares message and node identity as in Java.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/XtextLinkingDiagnostic.java
 */
export class XtextLinkingDiagnostic extends AbstractDiagnostic {
  readonly #node: INode;
  readonly #message: string | null;
  readonly #code: string | null;
  readonly #data: readonly string[];

  /**
   * @param data optional user data; may not contain `null`
   * @throws TypeError (Java `NullPointerException`) if `node` is `null` or `data` contains `null`
   */
  constructor(node: INode | null, message: string | null, code: string | null, data: readonly string[] = []) {
    super();
    if (node === null) throw new TypeError(NULL_NODE);
    if ((data as readonly (string | null)[]).includes(null)) throw new TypeError(NULL_DATA);
    this.#node = node;
    this.#message = message;
    this.#code = code;
    this.#data = data;
  }

  protected override getNode(): INode {
    return this.#node;
  }

  override getMessage(): string | null {
    return this.#message;
  }

  override getCode(): string | null {
    return this.#code;
  }

  override getData(): readonly string[] {
    return this.#data;
  }

  equals(obj: unknown): boolean {
    if (this === obj) return true;
    if (!(obj instanceof XtextLinkingDiagnostic)) return false;
    return this.#message === obj.#message && this.#node === obj.#node;
  }
}
