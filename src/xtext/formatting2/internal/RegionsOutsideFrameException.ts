// SPDX-License-Identifier: EPL-2.0
import type { ITextSegment } from '../regionaccess/ITextSegment.js';

/** One titled region (Java `Pair<String, ITextSegment>`). */
export interface TitledRegion {
  readonly title: string;
  readonly region: ITextSegment;
}

/**
 * A replacer or replacement lies outside its frame. As for {@link ConflictingRegionsException} the
 * `TextRegionsWithTitleToString` rendering is replaced by one line `<title> [offset,length]` per region.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/RegionsOutsideFrameException.java
 */
export class RegionsOutsideFrameException extends Error {
  private readonly frameRegion: ITextSegment;
  private readonly frameTitle: string;
  private readonly regions: readonly TitledRegion[];

  constructor(title: string, frame: ITextSegment, ...regions: TitledRegion[]) {
    super();
    this.name = 'RegionsOutsideFrameException';
    this.frameTitle = title;
    this.frameRegion = frame;
    this.regions = regions;
    this.message = this.buildMessage();
  }

  getFrameRegion(): ITextSegment {
    return this.frameRegion;
  }

  getRegions(): readonly TitledRegion[] {
    return this.regions;
  }

  private buildMessage(): string {
    const regionsStr =
      this.regions.length === 1
        ? `region ${this.regions[0]!.title}`
        : `regions ${this.regions.map((p) => p.title).join(', ')}`;
    const lines = [{ title: this.frameTitle, region: this.frameRegion }, ...this.regions].map(
      (p) => `${p.title} [${p.region.getOffset()},${p.region.getLength()}]`,
    );
    return `The ${regionsStr} must not be outside ${this.frameTitle}.\n${lines.join('\n')}`;
  }
}
