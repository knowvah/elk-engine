// SPDX-License-Identifier: EPL-2.0
import type { INode } from '../nodemodel/INode.js';
import { isRegionNode, type Diagnostic } from './Diagnostic.js';

/** The length reported for a diagnostic without a node (`AbstractDiagnostic.getLength`). */
const NO_NODE_LENGTH = 1;
/** The line reported for a diagnostic without a node. */
const NO_NODE_LINE = -1;

/**
 * Base of diagnostics that read their region from a node. Offset and length come from the node when it
 * is a {@link isRegionNode region node}; the T7 `INode` view has no region, so a plain node reports the
 * no-node defaults (offset `0`, length `1`). Column, end line and URI members are not ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/AbstractDiagnostic.java
 */
export abstract class AbstractDiagnostic implements Diagnostic {
  protected abstract getNode(): INode | null;

  abstract getCode(): string | null;

  abstract getData(): readonly string[];

  abstract getMessage(): string | null;

  getLength(): number {
    const node = this.getNode();
    if (node !== null && isRegionNode(node)) return node.getLength();
    return NO_NODE_LENGTH;
  }

  getOffset(): number {
    const node = this.getNode();
    if (node !== null && isRegionNode(node)) return node.getOffset();
    return 0;
  }

  getLine(): number {
    const node = this.getNode();
    if (node !== null) return node.getStartLine();
    return NO_NODE_LINE;
  }

  toString(): string {
    return `${this.constructor.name}: null:${this.getLine()} ${this.getMessage()}`;
  }
}
