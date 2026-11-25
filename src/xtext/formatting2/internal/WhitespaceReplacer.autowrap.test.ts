// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AbstractFormatter2 } from '../AbstractFormatter2.js';
import { FormatterRequest } from '../FormatterRequest.js';
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';
import { TextSegment } from '../regionaccess/internal/TextSegment.js';
import { TextRegionAccessBuilder } from '../regionaccess/TextRegionAccessBuilder.js';
import { ToyObject } from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import { WhitespaceReplacer } from './WhitespaceReplacer.js';

// Expected values are hand-derived from WhitespaceReplacer.java 76-101: a formatting with an autowrap trigger >= 0
// sets the context's canAutowrap; in autowrap state a region that would get no line break gets one, followed by
// the indentation of the region (the IAutowrapFormatter call is skipped: no formatting has one).

class DirectFormatter extends AbstractFormatter2 {
  format(): void {}
  start(request: FormatterRequest): void {
    this.initialize(request);
  }
}

/** Text `ab\ncd` as one token: a0 b1 \n2 c3 d4. */
function run(offset: number, configure: (f: IHiddenRegionFormatting) => void, autowrap: boolean, indentation = 1) {
  const root = new ToyObject('root');
  const builder = new TextRegionAccessBuilder(root, 'R');
  builder.token({ kind: 'assignment', grammarElement: 'rc', assignment: null, text: 'ab\ncd', owner: root });
  const access = builder.build();
  const formatter = new DirectFormatter();
  formatter.start(new FormatterRequest().setTextRegionAccess(access));
  const formatting = formatter.createHiddenRegionFormatting();
  configure(formatting);
  const replacer = new WhitespaceReplacer(new TextSegment(access, offset, 0), formatting);
  const start = formatter.createTextReplacerContext(formatter.createFormattableRootDocument());
  const context = start.withIndentation(indentation).withReplacer(replacer);
  context.setAutowrap(autowrap);
  const next = replacer.createReplacements(context);
  return {
    texts: [...context.getLocalReplacements()].map((r) => r.getReplacementText()),
    canAutowrap: context.canAutowrap(),
    indentation: next.getIndentation(),
  };
}

const spaceAndAutowrap = (f: IHiddenRegionFormatting): void => {
  f.setSpace(' ');
  f.setAutowrap(0);
};

describe('WhitespaceReplacer autowrap', () => {
  it('marks the context as able to autowrap for a trigger >= 0 only', () => {
    expect(run(1, spaceAndAutowrap, false).canAutowrap).toBe(0);
    expect(run(1, (f) => f.setAutowrap(9), false).canAutowrap).toBe(9);
    expect(run(1, (f) => f.setAutowrap(-1), false).canAutowrap).toBeNull();
    expect(run(1, (f) => f.setSpace(' '), false).canAutowrap).toBeNull();
  });

  it('replaces the space by a line break and the indentation in autowrap state', () => {
    expect(run(1, spaceAndAutowrap, false).texts).toEqual([' ']);
    expect(run(1, spaceAndAutowrap, true)).toEqual({ texts: ['\n\t'], canAutowrap: 0, indentation: 1 });
  });

  it('wraps without indentation for noIndentation', () => {
    expect(run(1, (f) => (spaceAndAutowrap(f), f.setNoIndentation(true)), true).texts).toEqual(['\n']);
  });

  it('keeps a computed line count above zero unchanged', () => {
    expect(run(1, (f) => (spaceAndAutowrap(f), f.setNewLinesMin(2)), true).texts).toEqual(['\n\n\t']);
  });

  it('adds one line break after a trailing line break of the previous text', () => {
    // offset 3 follows "\n": without autowrap only the indentation is written
    expect(run(3, spaceAndAutowrap, false).texts).toEqual(['\t']);
    expect(run(3, spaceAndAutowrap, true).texts).toEqual(['\n\t']);
  });

  it('applies the indentation change of the formatting to the wrap', () => {
    expect(run(1, (f) => (spaceAndAutowrap(f), f.setIndentationIncrease(1)), true)).toEqual({
      texts: ['\n\t\t'],
      canAutowrap: 0,
      indentation: 2,
    });
  });
});
