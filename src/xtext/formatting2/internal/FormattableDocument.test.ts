// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { HiddenRegionFormatterInit } from '../IHiddenRegionFormatter.js';
import type { IFormattableDocument } from '../IFormattableDocument.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextRegionExtensions } from '../regionaccess/ITextRegionExtensions.js';
import { TextSegment } from '../regionaccess/internal/TextSegment.js';
import { TextRegionAccessBuilder } from '../regionaccess/TextRegionAccessBuilder.js';
import {
  buildToyBlock,
  formatToString,
  FunctionFormatter,
  TOY,
  ToyObject,
} from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import type { HiddenRegionFormatting } from './HiddenRegionFormatting.js';
import { RegionsOutsideFrameException } from './RegionsOutsideFrameException.js';

// Expected strings are hand-derived from FormattableDocument.java and AbstractFormatter2.postProcess: every
// hidden region the rule leaves alone becomes one space (none at both ends of the text).
const ENTRIES: ReadonlyArray<readonly [string, string]> = [
  ['a', '1'],
  ['b', '2'],
];
const noSpace: HiddenRegionFormatterInit = (f) => f.noSpace();
const newLine: HiddenRegionFormatterInit = (f) => f.newLine();

type Rule = (root: ToyObject, entry: ToyObject, document: IFormattableDocument, ext: ITextRegionExtensions) => void;
/** Formats `block { a : 1 , b : 2 }` with a rule applied once, to the root, giving it the entry `a`. */
function formatWith(rule: Rule): string {
  const { access, root, entries } = buildToyBlock(ENTRIES);
  const formatter = new FunctionFormatter((obj, document, ext) => {
    if (obj === root) rule(root, entries[0]!, document, ext);
  });
  return formatToString(formatter, access);
}

describe('FormattableDocument append / prepend / surround', () => {
  it('formats the gap after and before an EObject region', () => {
    expect(formatWith((_r, entry, document) => document.append(entry, noSpace))).toBe('block { a : 1, b : 2 }');
    expect(formatWith((_r, entry, document) => document.prepend(entry, noSpace))).toBe('block {a : 1 , b : 2 }');
  });

  it('formats both gaps around an EObject region', () => {
    expect(formatWith((_r, entry, document) => document.surround(entry, noSpace))).toBe('block {a : 1, b : 2 }');
  });

  it('formats the gaps around a semantic region', () => {
    const comma = (ext: ITextRegionExtensions, root: ToyObject) => ext.regionFor(root).keyword(',');
    expect(formatWith((r, _e, document, ext) => document.append(comma(ext, r), noSpace))).toBe(
      'block { a : 1 ,b : 2 }',
    );
    expect(formatWith((r, _e, document, ext) => document.prepend(comma(ext, r), noSpace))).toBe(
      'block { a : 1, b : 2 }',
    );
    expect(formatWith((r, _e, document, ext) => document.surround(comma(ext, r), noSpace))).toBe(
      'block { a : 1,b : 2 }',
    );
  });

  it('ignores null targets and objects without a region', () => {
    const stranger = new ToyObject('stranger');
    const rule: Rule = (_r, _e, document) => {
      expect(document.append(null, noSpace)).toBeNull();
      expect(document.prepend(null, noSpace)).toBeNull();
      expect(document.surround(null, noSpace)).toBeNull();
      expect(document.append(stranger, noSpace)).toBe(stranger);
      expect(document.prepend(stranger, noSpace)).toBe(stranger);
      expect(document.surround(stranger, noSpace)).toBe(stranger);
    };
    expect(formatWith(rule)).toBe('block { a : 1 , b : 2 }');
  });

  it('ignores null hidden regions in set and setPair', () => {
    expect(formatWith((_r, _e, document) => expect(document.set(null, noSpace)).toBeNull())).toBe(
      'block { a : 1 , b : 2 }',
    );
    const rule: Rule = (_r, entry, document, ext) => {
      const following = ext.nextHiddenRegion(entry);
      expect(document.setPair(null, following, noSpace)).toEqual([null, following]);
      expect(document.setPair(following, null, noSpace)).toEqual([following, null]);
    };
    expect(formatWith(rule)).toBe('block { a : 1 , b : 2 }');
  });
});

describe('hidden region formatters of a document', () => {
  it('know the request of the document', () => {
    const rule: Rule = (r, entry, document, ext) => {
      const request = document.getRequest();
      document.append(entry, (f) => expect(f.getRequest()).toBe(request));
      document.interior(ext.regionFor(r).keyword('{'), ext.regionFor(r).keyword('}'), (f) =>
        expect(f.getRequest()).toBe(request),
      );
      const formatting = document.getFormatter().createHiddenRegionFormatting() as HiddenRegionFormatting;
      expect([formatting.getRequest(), formatting.getFormatter()]).toEqual([request, document.getFormatter()]);
    };
    expect(formatWith(rule)).toBe('block { a : 1 , b : 2 }');
  });
});

describe('FormattableDocument interior', () => {
  it('indents between two semantic regions: the first gap increases, the second decreases', () => {
    const rule: Rule = (r, _e, document, ext) => {
      const open = ext.regionFor(r).keyword('{');
      const close = ext.regionFor(r).keyword('}');
      expect(document.interior(open, close, (f) => (f.newLine(), f.indent()))).toEqual([open, close]);
    };
    // gap after '{' -> "\n\t"; gap before '}' -> "\n" with the indentation back at 0
    expect(formatWith(rule)).toBe('block {\n\ta : 1 , b : 2\n}');
  });

  it('does nothing for a missing semantic region', () => {
    const rule: Rule = (_r, _e, document, ext) => {
      document.interior(null, ext.regionFor(_r).keyword('}'), newLine);
    };
    expect(formatWith(rule)).toBe('block { a : 1 , b : 2 }');
  });

  it('formats the gaps between the first and last token of an object', () => {
    const rule: Rule = (_r, entry, document) => {
      expect(document.interiorOfObject(entry, (f) => (f.newLine(), f.indent()))).toBe(entry);
    };
    expect(formatWith(rule)).toBe('block { a\n\t:\n1 , b : 2 }');
  });

  it('formats the gaps of a pair', () => {
    const rule: Rule = (r, _e, document, ext) => {
      const pair = [ext.regionFor(r).keyword('{'), ext.regionFor(r).keyword('}')] as const;
      document.interiorOfPair(pair, newLine);
    };
    expect(formatWith(rule)).toBe('block {\na : 1 , b : 2\n}');
  });

  it('does nothing for an object without region, without tokens, or with a single gap', () => {
    const empty = new ToyObject('empty');
    const root = new ToyObject('root', [empty]);
    const builder = new TextRegionAccessBuilder(root, TOY.BLOCK_RULE);
    builder.token({ kind: 'keyword', grammarElement: TOY.KW_BLOCK, assignment: null, text: 'x', owner: root });
    builder.enterObject(TOY.ENTRY_ACTION, empty);
    builder.leaveObject();
    builder.token({ kind: 'keyword', grammarElement: TOY.KW_BLOCK, assignment: null, text: 'y', owner: root });
    const stranger = new ToyObject('stranger');
    const formatter = new FunctionFormatter((obj, document) => {
      if (obj === root) {
        expect(document.interiorOfObject(empty, newLine)).toBe(empty);
        expect(document.interiorOfObject(stranger, newLine)).toBe(stranger);
        expect(document.interiorOfObject(null, newLine)).toBeNull();
      }
    });
    expect(formatToString(formatter, builder.build())).toBe('x y');
  });
});

describe('FormattableDocument replacers', () => {
  it('reports a replacer outside the document to the exception handler', () => {
    const { access, root } = buildToyBlock(ENTRIES);
    class Outside implements ITextReplacer {
      getRegion() {
        return new TextSegment(access, 20, 5);
      }
      createReplacements<T>(context: T): T {
        return context;
      }
    }
    const errors: Error[] = [];
    const formatter = new FunctionFormatter((obj, document) => {
      if (obj === root) document.addReplacer(new Outside() as unknown as ITextReplacer);
    });
    formatToString(formatter, access, (r) => r.setExceptionHandler((e) => errors.push(e)));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(RegionsOutsideFrameException);
    expect(errors[0]!.message).toBe(
      'The region Outside must not be outside RootDocument.\nRootDocument [0,14]\nOutside [20,5]',
    );
  });

  it('describes several regions in RegionsOutsideFrameException', () => {
    const { access } = buildToyBlock(ENTRIES);
    const frame = new TextSegment(access, 0, 3);
    const e = new RegionsOutsideFrameException(
      'Frame',
      frame,
      { title: 'one', region: new TextSegment(access, 5, 1) },
      { title: 'two', region: new TextSegment(access, 6, 1) },
    );
    expect(e.message).toBe('The regions one, two must not be outside Frame.\nFrame [0,3]\none [5,1]\ntwo [6,1]');
    expect([e.getFrameRegion(), e.getRegions().length]).toEqual([frame, 2]);
  });
});

describe('FormattableDocument.format', () => {
  it('returns the formatted object and formats it through the formatter', () => {
    const { access, root, entries } = buildToyBlock(ENTRIES);
    const seen: EObject[] = [];
    const formatter = new FunctionFormatter((obj, document) => {
      seen.push(obj as EObject);
      if (obj === root) expect(document.format(entries[1])).toBe(entries[1]);
    });
    formatToString(formatter, access);
    expect(seen).toEqual([root, entries[1]]);
  });
});
