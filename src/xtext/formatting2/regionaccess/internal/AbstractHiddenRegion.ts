// SPDX-License-Identifier: EPL-2.0
import type { IHiddenRegion } from '../IHiddenRegion.js';
import type { ISemanticRegion } from '../ISemanticRegion.js';
import type { ISemanticRegionFinder } from '../ISemanticRegionFinder.js';
import type { ISequentialRegion } from '../ISequentialRegion.js';
import type { ITextRegionAccess } from '../ITextRegionAccess.js';
import type { ITextSegment } from '../ITextSegment.js';
import { AbstractTextSegment } from './AbstractTextSegment.js';
import { SemanticRegionMatcher } from './SemanticRegionMatcher.js';

/**
 * A hidden region without parts. The writer input has no node model, so the building sequencer never receives
 * comments or whitespace (`acceptComment`/`acceptWhitespace` are dead for this flow) and `hiddens` is always
 * empty. Every method is ported for that case: `getLength()` is 0, `getOffset()` is the end of the previous
 * semantic region (0 for the first region), `getMergedSpaces()` is the region itself. `addPart`,
 * `getParts`, `containsComment`, `getAlternatingMergedSpaceAndComments` (the non-empty arms) and
 * `initAssociations` (node-model only) are not ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/AbstractHiddenRegion.java
 */
export abstract class AbstractHiddenRegion extends AbstractTextSegment implements IHiddenRegion {
  private readonly access: ITextRegionAccess;
  private next: ISemanticRegion | null = null;
  private previous: ISemanticRegion | null = null;

  protected constructor(access: ITextRegionAccess) {
    super();
    this.access = access;
  }

  abstract isUndefined(): boolean;

  getLength(): number {
    return 0;
  }

  getMergedSpaces(): ITextSegment[] {
    return [this];
  }

  getNextHiddenRegion(): IHiddenRegion | null {
    return this.next === null ? null : this.next.getNextHiddenRegion();
  }

  getNextSemanticRegion(): ISemanticRegion | null {
    return this.next;
  }

  getNextSequentialRegion(): ISequentialRegion | null {
    return this.next;
  }

  getOffset(): number {
    if (this.previous !== null) return this.previous.getOffset() + this.previous.getLength();
    return 0;
  }

  getPreviousHiddenRegion(): IHiddenRegion | null {
    return this.previous === null ? null : this.previous.getPreviousHiddenRegion();
  }

  getPreviousSemanticRegion(): ISemanticRegion | null {
    return this.previous;
  }

  getPreviousSequentialRegion(): ISequentialRegion | null {
    return this.previous;
  }

  getTextRegionAccess(): ITextRegionAccess {
    return this.access;
  }

  /** Java protected `setNext`: called by the building sequencer. */
  setNext(next: ISemanticRegion | null): void {
    this.next = next;
  }

  /** Java protected `setPrevious`: called by the building sequencer. */
  setPrevious(previous: ISemanticRegion | null): void {
    this.previous = previous;
  }

  immediatelyFollowing(): ISemanticRegionFinder {
    return new SemanticRegionMatcher(this.getNextSemanticRegion());
  }

  immediatelyPreceding(): ISemanticRegionFinder {
    return new SemanticRegionMatcher(this.getPreviousSemanticRegion());
  }
}
