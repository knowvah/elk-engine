// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextReplacerContext } from '../ITextReplacerContext.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';
import { buildToyBlock, FunctionFormatter } from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import { isCompositeTextReplacer, type ICompositeTextReplacer } from './ICompositeTextReplacer.js';
import { HiddenRegionReplacer } from './HiddenRegionReplacer.js';
import { TextReplacerMerger } from './TextReplacerMerger.js';

// Expected values are hand-derived from TextReplacerMerger.java 31-79.
const formatter = new FunctionFormatter(() => {});
const merger = new TextReplacerMerger(formatter);
const { access } = buildToyBlock([['a', '1']]);
const first = access.regionForRootEObject().getPreviousHiddenRegion();
const second = first.getNextHiddenRegion()!;

function hiddenReplacer(region: typeof first, space: string | null): HiddenRegionReplacer {
  const formatting = formatter.createHiddenRegionFormatting();
  formatting.setSpace(space);
  return new HiddenRegionReplacer(region, formatting);
}

class PlainReplacer implements ITextReplacer {
  getRegion(): ITextSegment {
    return first;
  }
  createReplacements(context: ITextReplacerContext): ITextReplacerContext {
    return context;
  }
}

class CompositeReplacer extends PlainReplacer implements ICompositeTextReplacer {
  readonly added: ITextReplacer[] = [];
  addReplacer(replacer: ITextReplacer): void {
    this.added.push(replacer);
  }
}

describe('TextReplacerMerger', () => {
  it('merges hidden region replacers of one region into a replacer with the merged formatting', () => {
    const a = hiddenReplacer(first, null);
    const b = hiddenReplacer(first, ' ');
    const merged = merger.merge([a, b]) as HiddenRegionReplacer;
    expect(merged).toBeInstanceOf(HiddenRegionReplacer);
    expect(merged.getRegion()).toBe(first);
    expect(merged.getFormatting()).toBe(b.getFormatting());
    expect(merged.getFormatting().getSpace()).toBe(' ');
  });

  it('merges more than two into a fresh formatting', () => {
    const merged = merger.merge([
      hiddenReplacer(first, null),
      hiddenReplacer(first, ' '),
      hiddenReplacer(first, null),
    ]) as HiddenRegionReplacer;
    expect(merged.getFormatting().getSpace()).toBe(' ');
  });

  it('merges nothing for hidden region replacers of different regions or foreign replacers', () => {
    expect(merger.merge([hiddenReplacer(first, ' '), hiddenReplacer(second, ' ')])).toBeNull();
    expect(merger.merge([new PlainReplacer(), hiddenReplacer(first, ' ')])).toBeNull();
    expect(merger.merge([hiddenReplacer(first, ' '), new PlainReplacer()])).toBeNull();
    expect(merger.merge([new PlainReplacer(), new PlainReplacer()])).toBeNull();
  });

  it('adds the other replacers to the one composite replacer', () => {
    const composite = new CompositeReplacer();
    const plain = new PlainReplacer();
    expect(merger.merge([plain, composite])).toBe(composite);
    expect(composite.added).toEqual([plain]);
    expect(isCompositeTextReplacer(composite)).toBe(true);
    expect(isCompositeTextReplacer(plain)).toBe(false);
  });

  it('does not merge two composite replacers', () => {
    expect(merger.merge([new CompositeReplacer(), new CompositeReplacer()])).toBeNull();
  });

  it('merges an empty conflict list to nothing', () => {
    expect(merger.merge([])).toBeNull();
  });
});
