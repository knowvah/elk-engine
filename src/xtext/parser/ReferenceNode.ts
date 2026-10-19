// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { ICrossReferenceNode } from '../nodemodel/ICrossReferenceNode.js';
import type { ReferenceRecord } from './ReferenceRecord.js';

/**
 * A recorded cross reference: both the record and the node-model view of it. `text` is
 * `NodeModelUtils.getTokenText`: the non-hidden tokens, one blank where hidden tokens separated them.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export class ReferenceNode implements ICrossReferenceNode, ReferenceRecord {
  readonly owner: EObject;
  readonly feature: string;
  readonly index: number;
  readonly ruleName: string;
  readonly text: string;
  readonly line: number;

  constructor(record: ReferenceRecord) {
    this.owner = record.owner;
    this.feature = record.feature;
    this.index = record.index;
    this.ruleName = record.ruleName;
    this.text = record.text;
    this.line = record.line;
  }

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
