// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AbstractFormatter2 } from '../AbstractFormatter2.js';
import { FormatterPreferenceKeys } from '../FormatterPreferenceKeys.js';
import { FormatterRequest } from '../FormatterRequest.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextReplacerContext } from '../ITextReplacerContext.js';
import { MapBasedPreferenceValues } from '../preferences/MapBasedPreferenceValues.js';
import { TextSegment } from '../regionaccess/internal/TextSegment.js';
import type { StringBasedRegionAccess } from '../regionaccess/internal/StringBasedRegionAccess.js';
import { TextRegionAccessBuilder } from '../regionaccess/TextRegionAccessBuilder.js';
import { ToyObject } from '../../../../test/helpers/xtext/ToyBlockFixture.js';

// Expected values are hand-derived from TextReplacerContext.java: getLeadingCharsInLineCount 106-155,
// logicalLength 222-238, isWrapInRegion 368-385, isWrapSincePrevious 387-400, getRegion(int) 354-366,
// setAutowrap 297-301.

/** A formatter that can be initialised for direct context tests. */
class DirectFormatter extends AbstractFormatter2 {
  format(): void {}
  start(request: FormatterRequest): void {
    this.initialize(request);
  }
}

/** One token holding `text`, so that the test regions can lie anywhere in it. */
function setup(text: string, configure: (preferences: MapBasedPreferenceValues) => void = () => {}) {
  const root = new ToyObject('root');
  const builder = new TextRegionAccessBuilder(root, 'R');
  builder.token({ kind: 'assignment', grammarElement: 'rc', assignment: null, text, owner: root });
  const access = builder.build();
  const preferences = new MapBasedPreferenceValues();
  configure(preferences);
  const request = new FormatterRequest().setTextRegionAccess(access).setPreferences(preferences);
  const formatter = new DirectFormatter();
  formatter.start(request);
  const start = formatter.createTextReplacerContext(formatter.createFormattableRootDocument());
  return { access, start };
}

/** A replacer over `[offset, offset + length)` that makes no replacements itself. */
function replacer(access: StringBasedRegionAccess, offset: number, length = 0): ITextReplacer {
  const region = new TextSegment(access, offset, length);
  return { getRegion: () => region, createReplacements: (context: ITextReplacerContext) => context };
}

/** Adds the replacement of `[offset, offset + length)` by `text` to `context`. */
function replace(context: ITextReplacerContext, offset: number, length: number, text: string): ITextReplacerContext {
  const access = context.getDocument().getRequest().getTextRegionAccess();
  context.addReplacement(new TextSegment(access, offset, length).replaceWith(text));
  return context;
}

// "ab\n\tcdefgh": a0 b1 \n2 \t3 c4 d5 e6 f7 g8 h9
const TWO_LINES = 'ab\n\tcdefgh';
const ONE_LINE = 'abcdef';

describe('TextReplacerContext autowrap state', () => {
  it('starts without autowrap and without an autowrap trigger', () => {
    const { start } = setup(ONE_LINE);
    expect([start.isAutowrap(), start.canAutowrap()]).toEqual([false, null]);
  });

  it('stores the autowrap trigger', () => {
    const { start } = setup(ONE_LINE);
    start.setCanAutowrap(3);
    expect(start.canAutowrap()).toBe(3);
    start.setCanAutowrap(null);
    expect(start.canAutowrap()).toBeNull();
  });

  it('drops the local replacements when the autowrap state is set', () => {
    const { access, start } = setup(ONE_LINE);
    const context = replace(start.withReplacer(replacer(access, 2)), 2, 0, ' ');
    expect([...context.getLocalReplacements()].length).toBe(1);
    context.setAutowrap(true);
    expect([context.isAutowrap(), [...context.getLocalReplacements()]]).toEqual([true, []]);
  });

  it('lists the local replacements in reverse order', () => {
    const { access, start } = setup(ONE_LINE);
    const context = start.withReplacer(replacer(access, 1, 4));
    replace(context, 1, 0, 'x');
    replace(context, 3, 0, 'y');
    expect([...context.getLocalReplacementsReverse()].map((r) => r.getReplacementText())).toEqual(['y', 'x']);
  });
});

describe('TextReplacerContext.getLeadingCharsInLineCount', () => {
  it('counts back to the last line break of the text before the replacer (tabs count tabWidth)', () => {
    const { access, start } = setup(TWO_LINES);
    expect(start.withReplacer(replacer(access, 8)).getLeadingCharsInLineCount()).toBe(8); // "\tcdef" = 4 + 4
  });

  it('counts the raw offset on the first line of the text (tabs count 1 there)', () => {
    const { access, start } = setup('\tabc');
    expect(start.withReplacer(replacer(access, 2)).getLeadingCharsInLineCount()).toBe(2);
  });

  it('stops at a line break inside an earlier replacement', () => {
    const { access, start } = setup(TWO_LINES);
    const first = replace(start.withReplacer(replacer(access, 5)), 5, 0, '\n\t\t');
    expect(first.withReplacer(replacer(access, 7)).getLeadingCharsInLineCount()).toBe(10); // "\t\t" + "de"
  });

  it('stops at a line break in the text between an earlier replacement and the replacer', () => {
    const { access, start } = setup(TWO_LINES);
    const first = replace(start.withReplacer(replacer(access, 1)), 1, 0, ' ');
    expect(first.withReplacer(replacer(access, 6)).getLeadingCharsInLineCount()).toBe(6); // "\tcd"
  });

  it('adds replacement texts and the rest of the first line', () => {
    const { access, start } = setup(ONE_LINE);
    const first = replace(start.withReplacer(replacer(access, 2)), 2, 0, '  ');
    expect(first.withReplacer(replacer(access, 4)).getLeadingCharsInLineCount()).toBe(6); // "ab" + "  " + "cd"
  });

  it('counts the text of an earlier replacer before its first replacement', () => {
    const { access, start } = setup(TWO_LINES);
    const first = replace(start.withReplacer(replacer(access, 1, 4)), 4, 0, 'x');
    expect(first.withReplacer(replacer(access, 6)).getLeadingCharsInLineCount()).toBe(7); // "\t" + "x" + "cd"
    const flat = setup(ONE_LINE);
    const other = replace(flat.start.withReplacer(replacer(flat.access, 1, 3)), 3, 0, 'x');
    expect(other.withReplacer(replacer(flat.access, 5)).getLeadingCharsInLineCount()).toBe(6); // a bc x de
  });

  it('skips a replacement that ends after the replacer offset', () => {
    const { access, start } = setup(ONE_LINE);
    const context = replace(start.withReplacer(replacer(access, 1, 4)), 3, 1, '\n');
    expect(context.getLeadingCharsInLineCount()).toBe(1);
  });

  it('counts a tab as one column when the indentation is not a tab', () => {
    const { access, start } = setup(TWO_LINES, (p) => p.putTyped(FormatterPreferenceKeys.indentation, '  '));
    expect(start.withReplacer(replacer(access, 8)).getLeadingCharsInLineCount()).toBe(5);
  });

  it('prefers the deprecated indentation length over the tab width when it is not negative', () => {
    const { access, start } = setup(TWO_LINES, (p) => p.putTyped(FormatterPreferenceKeys.indentationLength, 2));
    expect(start.withReplacer(replacer(access, 8)).getLeadingCharsInLineCount()).toBe(6);
  });

  it('reads the tab width preference', () => {
    const { access, start } = setup(TWO_LINES, (p) => p.putTyped(FormatterPreferenceKeys.tabWidth, 8));
    expect(start.withReplacer(replacer(access, 8)).getLeadingCharsInLineCount()).toBe(12);
  });
});

describe('TextReplacerContext.isWrapInRegion', () => {
  it('is false for a replacement without a line break', () => {
    const { access, start } = setup(TWO_LINES);
    expect(replace(start.withReplacer(replacer(access, 5)), 5, 0, ' ').isWrapInRegion()).toBe(false);
  });

  it('is true for a replacement with a line break', () => {
    const { access, start } = setup(TWO_LINES);
    expect(replace(start.withReplacer(replacer(access, 5)), 5, 0, '\n').isWrapInRegion()).toBe(true);
  });

  it('is true for a line break in the region before a replacement', () => {
    const { access, start } = setup(TWO_LINES);
    expect(replace(start.withReplacer(replacer(access, 1, 4)), 4, 0, 'x').isWrapInRegion()).toBe(true);
  });

  it('is true for a line break in the region after the last replacement', () => {
    const { access, start } = setup(TWO_LINES);
    expect(replace(start.withReplacer(replacer(access, 1, 2)), 1, 0, ' ').isWrapInRegion()).toBe(true);
  });

  it('is false for a region without line breaks and replacements', () => {
    const { access, start } = setup(TWO_LINES);
    expect(start.withReplacer(replacer(access, 4, 2)).isWrapInRegion()).toBe(false);
  });
});

describe('TextReplacerContext.isWrapSincePrevious', () => {
  it('is false without a previous replacer', () => {
    const { access, start } = setup(TWO_LINES);
    expect(start.withReplacer(replacer(access, 4)).isWrapSincePrevious()).toBe(false);
  });

  it('is true for a line break between the previous replacer and this one (contexts without replacer skipped)', () => {
    const { access, start } = setup(TWO_LINES);
    const context = start.withReplacer(replacer(access, 1)).withIndentation(1).withReplacer(replacer(access, 4));
    expect(context.isWrapSincePrevious()).toBe(true);
  });

  it('is false for text without a line break since the previous replacer', () => {
    const { access, start } = setup(TWO_LINES);
    expect(start.withReplacer(replacer(access, 4)).withReplacer(replacer(access, 6)).isWrapSincePrevious()).toBe(false);
  });
});
