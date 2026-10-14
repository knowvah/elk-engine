// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { AbstractFormatter2 } from '../AbstractFormatter2.js';
import { FormatterRequest } from '../FormatterRequest.js';
import type { IFormattableDocument } from '../IFormattableDocument.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextReplacerContext } from '../ITextReplacerContext.js';
import { StringHiddenRegion } from '../regionaccess/internal/StringHiddenRegion.js';
import { TextSegment } from '../regionaccess/internal/TextSegment.js';
import type { ITextReplacement } from '../regionaccess/ITextReplacement.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';
import { TextRegionAccessBuilder } from '../regionaccess/TextRegionAccessBuilder.js';
import { RegionsOutsideFrameException } from './RegionsOutsideFrameException.js';
import { ToyObject } from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import { WhitespaceReplacer } from './WhitespaceReplacer.js';

// Expected values are hand-derived from WhitespaceReplacer.java 33-121 and TextReplacerContext.java 248-293.

/** A formatter that can be initialised for direct replacer tests. */
class DirectFormatter extends AbstractFormatter2 {
  format(): void {}
  start(request: FormatterRequest): void {
    this.initialize(request);
  }
}

/** Text `x\n\n\ny` as one token: offsets x0 \n1 \n2 \n3 y4; the replacer regions lie inside the token. */
function setup() {
  const root = new ToyObject('root');
  const builder = new TextRegionAccessBuilder(root, 'R');
  builder.token({ kind: 'assignment', grammarElement: 'rc', assignment: null, text: 'x\n\n\ny', owner: root });
  const access = builder.build();
  const request = new FormatterRequest().setTextRegionAccess(access);
  const formatter = new DirectFormatter();
  formatter.start(request);
  const document: IFormattableDocument = formatter.createFormattableRootDocument();
  return { access, request, formatter, document };
}

function run(
  region: ITextSegment,
  configure: (f: ReturnType<DirectFormatter['createHiddenRegionFormatting']>) => void,
  indentation = 0,
) {
  const { formatter, document, request } = setup();
  const formatting = formatter.createHiddenRegionFormatting();
  configure(formatting);
  const replacer = new WhitespaceReplacer(region, formatting);
  const start = formatter.createTextReplacerContext(document).withIndentation(indentation);
  const context = start.withReplacer(replacer);
  const next = replacer.createReplacements(context);
  return { replacements: [...context.getLocalReplacements()], next, request };
}

const texts = (replacements: ITextReplacement[]): string[] => replacements.map((r) => r.getReplacementText());

describe('WhitespaceReplacer on a text segment of line breaks', () => {
  const region = (offset: number, length: number): ITextSegment => new TextSegment(setup().access, offset, length);

  it('clamps the existing line count up to the minimum', () => {
    const { replacements } = run(region(1, 1), (f) => f.setNewLinesMin(2)); // one line break -> 2
    expect(texts(replacements)).toEqual(['\n\n']);
  });

  it('clamps the existing line count down to the maximum', () => {
    const { replacements } = run(region(1, 3), (f) => f.setNewLinesMax(1)); // three breaks -> 1
    expect(texts(replacements)).toEqual(['\n']);
  });

  it('keeps an existing line count inside min and max (the default is ignored)', () => {
    const { replacements } = run(region(1, 2), (f) => {
      f.setNewLinesMin(1);
      f.setNewLinesDefault(5);
      f.setNewLinesMax(3);
    });
    expect(texts(replacements)).toEqual(['\n\n']);
  });

  it('subtracts the line break right before the region and indents', () => {
    // region offset 2 is preceded by "\n" at offset 1; it holds 1 break, min 1 -> computed 1 -> 1 - 1 = 0 new lines
    const { replacements, next } = run(region(2, 1), (f) => f.setNewLinesMin(1), 0);
    expect(texts(replacements)).toEqual(['']);
    expect(next.getIndentation()).toBe(0);
    const indented = run(region(2, 1), (f) => {
      f.setNewLinesMin(1);
      f.setIndentationIncrease(2);
    });
    expect(texts(indented.replacements)).toEqual(['\t\t']);
    expect(indented.next.getIndentation()).toBe(2);
  });

  it('omits the indentation string with noIndentation', () => {
    const { replacements } = run(region(2, 1), (f) => {
      f.setNewLinesMin(1);
      f.setIndentationIncrease(1);
      f.setNoIndentation(true);
    });
    expect(texts(replacements)).toEqual(['']);
  });

  it('writes the space when no newline is needed, and nothing without a space', () => {
    expect(texts(run(region(0, 1), (f) => f.setSpace('  ')).replacements)).toEqual(['  ']);
    expect(run(region(0, 1), () => {}).replacements).toEqual([]);
  });

  it('clamps an indentation underflow to zero', () => {
    const { next } = run(region(0, 1), (f) => f.setIndentationDecrease(3), 1);
    expect(next.getIndentation()).toBe(0);
  });

  it('adds the formatting increase to the incoming indentation and subtracts the decrease', () => {
    const { next } = run(
      region(0, 1),
      (f) => {
        f.setIndentationIncrease(3);
        f.setIndentationDecrease(1);
      },
      1,
    );
    expect(next.getIndentation()).toBe(3);
  });

  it('exposes its region and formatting', () => {
    const r = region(0, 1);
    const f = setup().formatter.createHiddenRegionFormatting();
    const replacer = new WhitespaceReplacer(r, f);
    expect([replacer.getRegion(), replacer.getFormatting()]).toEqual([r, f]);
  });
});

describe('WhitespaceReplacer on hidden regions', () => {
  function hiddenRegion() {
    const { access } = setup();
    return access.regionForRootEObject().getPreviousHiddenRegion() as StringHiddenRegion;
  }

  it('uses default, else min, else max for an undefined region (the existing text is ignored)', () => {
    const h = hiddenRegion();
    expect(
      texts(
        run(h, (f) => {
          f.setNewLinesMin(1);
          f.setNewLinesDefault(2);
          f.setNewLinesMax(3);
        }).replacements,
      ),
    ).toEqual(['\n\n']);
    expect(
      texts(
        run(h, (f) => {
          f.setNewLinesMin(3);
          f.setNewLinesMax(4);
        }).replacements,
      ),
    ).toEqual(['\n\n\n']);
    expect(texts(run(h, (f) => f.setNewLinesMax(2)).replacements)).toEqual(['\n\n']);
  });

  it('clamps a defined region by its existing line count (an empty hidden region has none)', () => {
    const h = hiddenRegion();
    h.setUndefined(false);
    expect(texts(run(h, (f) => f.setNewLinesMin(1)).replacements)).toEqual(['\n']);
    expect(texts(run(h, (f) => f.setNewLinesMax(0)).replacements)).toEqual([]);
  });
});

describe('TextReplacerContext', () => {
  it('skips edits to defined regions when only undefined ones are formatted, and identity edits unless allowed', () => {
    const { access } = setup();
    const defined = access.regionForRootEObject().getPreviousHiddenRegion() as StringHiddenRegion;
    defined.setUndefined(false);
    const outcome = (configure: (r: FormatterRequest) => void): string[] => {
      const { formatter, document, request } = setup();
      configure(request);
      const replacer = new WhitespaceReplacer(defined, formatter.createHiddenRegionFormatting());
      replacer.getFormatting().setSpace('');
      const context = formatter.createTextReplacerContext(document).withReplacer(replacer);
      replacer.createReplacements(context);
      return texts([...context.getLocalReplacements()]);
    };
    expect(outcome(() => {})).toEqual([]);
    expect(outcome((r) => r.setAllowIdentityEdits(true))).toEqual(['']);
    expect(outcome((r) => r.setAllowIdentityEdits(true).setFormatUndefinedHiddenRegionsOnly(true))).toEqual([]);
  });

  it('reports an edit outside its replacer region to the exception handler', () => {
    const { formatter, document, request, access } = setup();
    const errors: Error[] = [];
    request.setExceptionHandler((e) => errors.push(e));
    class Outside implements ITextReplacer {
      getRegion(): ITextSegment {
        return new TextSegment(access, 4, 1);
      }
      createReplacements(context: ITextReplacerContext): ITextReplacerContext {
        context.addReplacement(new TextSegment(access, 0, 2).replaceWith('zz'));
        return context;
      }
    }
    const replacer = new Outside();
    replacer.createReplacements(formatter.createTextReplacerContext(document).withReplacer(replacer));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(RegionsOutsideFrameException);
    expect(errors[0]!.message).toBe('The region zz must not be outside Outside.\nOutside [4,1]\nzz [0,2]');
  });

  it('reports overlapping replacements as a conflict to the exception handler', () => {
    const { formatter, document, request, access } = setup();
    const errors: Error[] = [];
    request.setExceptionHandler((e) => errors.push(e));
    request.setEnableDebugTracing(true); // otherwise the conflict is a RegionTraceMissingException
    class Twice implements ITextReplacer {
      getRegion(): ITextSegment {
        return new TextSegment(access, 0, 4);
      }
      createReplacements(context: ITextReplacerContext): ITextReplacerContext {
        context.addReplacement(new TextSegment(access, 0, 3).replaceWith('a'));
        context.addReplacement(new TextSegment(access, 1, 2).replaceWith('b'));
        return context;
      }
    }
    const replacer = new Twice();
    replacer.createReplacements(formatter.createTextReplacerContext(document).withReplacer(replacer));
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message.startsWith('Conflicting Regions.')).toBe(true);
  });

  it('passes through other exceptions of the replacement set', () => {
    const { formatter, document, access } = setup(); // tracing off: the conflict is a RegionTraceMissingException
    class Twice implements ITextReplacer {
      getRegion(): ITextSegment {
        return new TextSegment(access, 0, 4);
      }
      createReplacements(context: ITextReplacerContext): ITextReplacerContext {
        context.addReplacement(new TextSegment(access, 0, 3).replaceWith('a'));
        context.addReplacement(new TextSegment(access, 1, 2).replaceWith('b'));
        return context;
      }
    }
    const replacer = new Twice();
    const context = formatter.createTextReplacerContext(document).withReplacer(replacer);
    expect(() => replacer.createReplacements(context)).toThrow('RegionTraceMissingException');
  });

  it('requires a replacer to add a replacement', () => {
    const { formatter, document, access } = setup();
    const context = formatter.createTextReplacerContext(document);
    expect(() => context.addReplacement(new TextSegment(access, 0, 1).replaceWith('x'))).toThrow(IllegalStateException);
  });

  it('checks the document order of replacers, and nesting once a child is announced', () => {
    const { formatter, document, access } = setup();
    const replacer = (offset: number, length: number): ITextReplacer => ({
      getRegion: () => new TextSegment(access, offset, length),
      createReplacements: (context) => context,
    });
    const first = formatter.createTextReplacerContext(document).withReplacer(replacer(2, 2));
    expect(() => first.withReplacer(replacer(0, 1))).toThrow(IllegalArgumentException);
    expect(() => first.withReplacer(replacer(3, 1))).toThrow(IllegalArgumentException);
    expect(first.withReplacer(replacer(4, 1)).getReplacer()).not.toBeNull();
    first.setNextReplacerIsChild();
    expect(first.withReplacer(replacer(3, 1)).getReplacer()).not.toBeNull();
    expect(() => first.withReplacer(replacer(0, 1))).toThrow(IllegalArgumentException);
    expect(first.withReplacer(first.getReplacer()!)).toBe(first);
  });

  it('keeps the child flag when switching document, and returns itself for the same document or indentation', () => {
    const { formatter, document } = setup();
    const other = formatter.createFormattableRootDocument();
    const base = formatter.createTextReplacerContext(document);
    expect(base.withDocument(document)).toBe(base);
    expect(base.withIndentation(0)).toBe(base);
    const switched = base.withDocument(other);
    expect(switched).not.toBe(base);
    expect([switched.getDocument(), switched.getPreviousContext(), switched.getReplacer()]).toEqual([
      other,
      base,
      null,
    ]);
    base.setNextReplacerIsChild();
    const childSwitched = base.withDocument(other);
    expect(childSwitched.getFormatter()).toBe(formatter);
  });

  it('joins the replacements of the contexts between the last and the first, in document order', () => {
    const { formatter, document, access } = setup();
    const replacer = (offset: number, text: string): ITextReplacer => {
      const region = new TextSegment(access, offset, 1);
      return {
        getRegion: () => region,
        createReplacements: (context) => {
          context.addReplacement(region.replaceWith(text));
          return context;
        },
      };
    };
    const first = formatter.createTextReplacerContext(document);
    const r1 = replacer(0, 'A');
    const r2 = replacer(2, 'B');
    const c1 = r1.createReplacements(first.withReplacer(r1));
    const c2 = r2.createReplacements(c1.withReplacer(r2));
    expect(texts(c2.getReplacementsUntil(first))).toEqual(['A', 'B']);
    expect(texts(c2.getReplacementsUntil(c2))).toEqual(['B']);
  });

  it('builds indentation and line separators from the preferences, and rejects negative counts', () => {
    const { formatter, document } = setup();
    const context = formatter.createTextReplacerContext(document);
    expect([context.getIndentationString(2), context.getNewLinesString(2), context.getNewLinesString(0)]).toEqual([
      '\t\t',
      '\n\n',
      '',
    ]);
    expect(() => context.getIndentationString(-1)).toThrow(IllegalArgumentException);
  });
});
