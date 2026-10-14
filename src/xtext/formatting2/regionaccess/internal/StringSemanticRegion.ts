// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { FormattingToken, SemanticKind } from '../FormattingToken.js';
import type { IEObjectRegion } from '../IEObjectRegion.js';
import type { IHiddenRegion } from '../IHiddenRegion.js';
import type { ISemanticRegion } from '../ISemanticRegion.js';
import type { ISemanticRegionFinder } from '../ISemanticRegionFinder.js';
import type { ISequentialRegion } from '../ISequentialRegion.js';
import type { AbstractEObjectRegion } from './AbstractEObjectRegion.js';
import { SemanticRegionMatcher } from './SemanticRegionMatcher.js';
import { StringRegion } from './StringRegion.js';
import type { StringBasedRegionAccess } from './StringBasedRegionAccess.js';

/**
 * A token of the writer output. Java passes the grammar element; here the token also carries its kind,
 * assignment id and feature name (see {@link FormattingToken}). `getContainingFeature` and
 * `getIndexInContainingFeature` are not ported (no metamodel).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/StringSemanticRegion.java
 */
export class StringSemanticRegion extends StringRegion implements ISemanticRegion {
  private readonly eObjectRegion: AbstractEObjectRegion;
  private readonly token: FormattingToken;
  // Java protected (package) setters: set by the building sequencer right after construction
  private leading: IHiddenRegion | null = null;
  private trailing: IHiddenRegion | null = null;

  constructor(
    regionAccess: StringBasedRegionAccess,
    semanticElement: AbstractEObjectRegion,
    token: FormattingToken,
    offset: number,
  ) {
    super(regionAccess, offset, token.text.length);
    this.eObjectRegion = semanticElement;
    this.token = token;
  }

  getContainingRegion(): IEObjectRegion | null {
    return this.eObjectRegion;
  }

  getEObjectRegion(): IEObjectRegion {
    return this.eObjectRegion;
  }

  getGrammarElement(): string {
    return this.token.grammarElement;
  }

  getKind(): SemanticKind {
    return this.token.kind;
  }

  getAssignment(): string | null {
    return this.token.assignment;
  }

  getFeatureName(): string | null {
    return this.token.feature ?? null;
  }

  getNextHiddenRegion(): IHiddenRegion | null {
    return this.trailing;
  }

  getNextSemanticRegion(): ISemanticRegion | null {
    return this.trailing !== null ? this.trailing.getNextSemanticRegion() : null;
  }

  getNextSequentialRegion(): ISequentialRegion | null {
    return this.trailing;
  }

  getPreviousHiddenRegion(): IHiddenRegion | null {
    return this.leading;
  }

  getPreviousSemanticRegion(): ISemanticRegion | null {
    return this.leading !== null ? this.leading.getPreviousSemanticRegion() : null;
  }

  getPreviousSequentialRegion(): ISequentialRegion | null {
    return this.leading;
  }

  getSemanticElement(): EObject {
    return this.eObjectRegion.getSemanticElement();
  }

  immediatelyFollowing(): ISemanticRegionFinder {
    return new SemanticRegionMatcher(this.getNextSemanticRegion());
  }

  immediatelyPreceding(): ISemanticRegionFinder {
    return new SemanticRegionMatcher(this.getPreviousSemanticRegion());
  }

  setLeadingHiddenRegion(leading: IHiddenRegion): void {
    this.leading = leading;
  }

  setTrailingHiddenRegion(trailing: IHiddenRegion): void {
    this.trailing = trailing;
  }
}
