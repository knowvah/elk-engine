// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { IAstRegion } from '../IAstRegion.js';
import type { IEObjectRegion } from '../IEObjectRegion.js';
import type { IHiddenRegion } from '../IHiddenRegion.js';
import { isSemanticRegion, type ISemanticRegion } from '../ISemanticRegion.js';
import type { ISemanticRegionFinder } from '../ISemanticRegionFinder.js';
import type { ISemanticRegionsFinder } from '../ISemanticRegionsFinder.js';
import type { ISequentialRegion } from '../ISequentialRegion.js';
import type { ITextRegionAccess } from '../ITextRegionAccess.js';
import { AbstractTextSegment } from './AbstractTextSegment.js';
import { SemanticRegionInIterableFinder } from './SemanticRegionInIterableFinder.js';
import { SemanticRegionIterable } from './SemanticRegionIterable.js';
import { SemanticRegionMatcher } from './SemanticRegionMatcher.js';

/**
 * The region of one semantic object. Java sets the grammar and semantic element through protected setters in the
 * subclass constructor; here they are constructor parameters. `getContainingFeature`,
 * `getIndexInContainingFeature` and `initChildrenFeatureIndexes` are not ported (no metamodel).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/AbstractEObjectRegion.java
 */
export abstract class AbstractEObjectRegion extends AbstractTextSegment implements IEObjectRegion {
  private readonly access: ITextRegionAccess;
  private readonly children: IAstRegion[] = [];
  private readonly grammarElement: string;
  private readonly semanticElement: EObject;
  // Java leaves these null until the building sequencer sets both in `enterEObject`
  private nextHidden: IHiddenRegion | null = null;
  private previousHidden: IHiddenRegion | null = null;
  private parent: IEObjectRegion | null = null;

  protected constructor(access: ITextRegionAccess, grammarElement: string, semanticElement: EObject) {
    super();
    this.access = access;
    this.grammarElement = grammarElement;
    this.semanticElement = semanticElement;
  }

  addChild(astRegion: IAstRegion): void {
    if (astRegion instanceof AbstractEObjectRegion) {
      astRegion.parent = this;
    }
    this.children.push(astRegion);
  }

  getAllRegionsFor(): ISemanticRegionsFinder {
    return new SemanticRegionInIterableFinder(this.getAllSemanticRegions());
  }

  getAllSemanticRegions(): Iterable<ISemanticRegion> {
    const first = this.leadingHidden().getNextSemanticRegion();
    const last = this.trailingHidden().getPreviousSemanticRegion();
    return new SemanticRegionIterable(first, last);
  }

  getAstRegions(): Iterable<IAstRegion> {
    return this.children;
  }

  getContainingRegion(): IEObjectRegion | null {
    return this.parent;
  }

  getGrammarElement(): string {
    return this.grammarElement;
  }

  getLeadingHiddenRegion(): IHiddenRegion {
    return this.leadingHidden();
  }

  getLength(): number {
    return this.trailingHidden().getOffset() - this.getOffset();
  }

  getNextHiddenRegion(): IHiddenRegion {
    return this.trailingHidden();
  }

  getNextSemanticRegion(): ISemanticRegion | null {
    return this.trailingHidden().getNextSemanticRegion();
  }

  getNextSequentialRegion(): ISequentialRegion {
    return this.trailingHidden();
  }

  getOffset(): number {
    return this.leadingHidden().getEndOffset();
  }

  getPreviousHiddenRegion(): IHiddenRegion {
    return this.leadingHidden();
  }

  getPreviousSemanticRegion(): ISemanticRegion | null {
    return this.leadingHidden().getPreviousSemanticRegion();
  }

  getPreviousSequentialRegion(): ISequentialRegion {
    return this.leadingHidden();
  }

  getRegionFor(): ISemanticRegionsFinder {
    return new SemanticRegionInIterableFinder(this.getSemanticRegions());
  }

  getSemanticElement(): EObject {
    return this.semanticElement;
  }

  getSemanticRegions(): Iterable<ISemanticRegion> {
    const children = this.children;
    return {
      *[Symbol.iterator](): Iterator<ISemanticRegion> {
        for (const child of children) {
          if (isSemanticRegion(child)) yield child;
        }
      },
    };
  }

  getTextRegionAccess(): ITextRegionAccess {
    return this.access;
  }

  getTrailingHiddenRegion(): IHiddenRegion {
    return this.trailingHidden();
  }

  immediatelyFollowing(): ISemanticRegionFinder {
    return new SemanticRegionMatcher(this.getNextSemanticRegion());
  }

  immediatelyPreceding(): ISemanticRegionFinder {
    return new SemanticRegionMatcher(this.getPreviousSemanticRegion());
  }

  /** Java protected `setLeadingHiddenRegion`: called by the building sequencer. */
  setLeadingHiddenRegion(leading: IHiddenRegion): void {
    this.previousHidden = leading;
  }

  /** Java protected `setTrailingHiddenRegion`: called by the building sequencer. */
  setTrailingHiddenRegion(trailing: IHiddenRegion): void {
    this.nextHidden = trailing;
  }

  // Java dereferences the (null before enterEObject) fields directly: a NullPointerException there
  private leadingHidden(): IHiddenRegion {
    return this.previousHidden!;
  }

  private trailingHidden(): IHiddenRegion {
    return this.nextHidden!;
  }
}
