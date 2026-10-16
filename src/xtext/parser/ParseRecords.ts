// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { ICrossReferenceNode } from '../nodemodel/ICrossReferenceNode.js';
import type { INodeModel } from '../nodemodel/INodeModel.js';
import type { EStructuralFeature } from '../validation/EStructuralFeature.js';
import type { ContainmentSlot, IssueLocator } from '../validation/IssueLocator.js';
import { ReferenceNode } from './ReferenceNode.js';
import type { ReferenceRecord } from './ReferenceRecord.js';

/**
 * Positions and reference nodes of one parse: the port's stand-in for the node model.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/nodemodel/util/NodeModelUtils.java
 */
export class ParseRecords implements INodeModel, IssueLocator {
  readonly references: ReferenceNode[] = [];
  readonly #objectLines = new Map<EObject, number>();
  readonly #featureLines = new Map<EObject, Array<readonly [string, number]>>();
  readonly #referencesByOwner = new Map<EObject, ReferenceNode[]>();
  readonly #slots = new Map<EObject, ContainmentSlot>();
  readonly #features = new Map<string, EStructuralFeature>();

  markObject(obj: EObject, line: number): void {
    this.#objectLines.set(obj, line);
  }

  noteFeature(owner: EObject, feature: string, line: number): void {
    const entries = this.#featureLines.get(owner);
    if (entries === undefined) {
      this.#featureLines.set(owner, [[feature, line]]);
    } else {
      entries.push([feature, line]);
    }
  }

  noteContainment(owner: EObject, feature: string, child: EObject, index: number): void {
    this.#slots.set(child, { feature: this.#featureOf(feature), index });
    this.noteFeature(owner, feature, this.#objectLines.get(child) ?? 1);
  }

  addReference(record: ReferenceRecord): void {
    const node = new ReferenceNode(record);
    this.references.push(node);
    this.noteFeature(record.owner, record.feature, record.line);
    const owned = this.#referencesByOwner.get(record.owner);
    if (owned === undefined) {
      this.#referencesByOwner.set(record.owner, [node]);
    } else {
      owned.push(node);
    }
  }

  getCrossReferenceNodes(obj: EObject): readonly ICrossReferenceNode[] | null {
    if (!this.#objectLines.has(obj)) {
      return null;
    }
    return this.#referencesByOwner.get(obj) ?? [];
  }

  objectStartLine(obj: EObject): number | null {
    return this.#objectLines.get(obj) ?? null;
  }

  featureStartLines(obj: EObject, featureName: string): readonly number[] {
    const lines: number[] = [];
    for (const [name, line] of this.#featureLines.get(obj) ?? []) {
      if (name === featureName) {
        lines.push(line);
      }
    }
    return lines;
  }

  containingSlot(obj: EObject): ContainmentSlot {
    const slot = this.#slots.get(obj);
    if (slot === undefined) {
      throw new Error('The object was not contained by the parse that produced these positions.');
    }
    return slot;
  }

  /** Features are compared by reference where Java compares them: one instance per name. */
  #featureOf(name: string): EStructuralFeature {
    let feature = this.#features.get(name);
    if (feature === undefined) {
      feature = { getName: () => name };
      this.#features.set(name, feature);
    }
    return feature;
  }
}
