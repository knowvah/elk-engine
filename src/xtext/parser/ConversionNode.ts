// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { INode } from '../nodemodel/INode.js';

/**
 * The minimal node handed to a value converter: owner, token text and first line.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export class ConversionNode implements INode {
  constructor(
    private readonly owner: EObject,
    private readonly text: string,
    private readonly line: number,
  ) {}

  getStartLine(): number {
    return this.line;
  }

  getText(): string {
    return this.text;
  }

  getSemanticElement(): EObject {
    return this.owner;
  }
}
