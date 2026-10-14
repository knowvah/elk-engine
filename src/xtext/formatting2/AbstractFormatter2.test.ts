// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../emf/ecore/EObject.js';
import { ExceptionAcceptor } from './ExceptionAcceptor.js';
import { FormatterPreferenceKeys } from './FormatterPreferenceKeys.js';
import { FormatterRequest } from './FormatterRequest.js';
import { AbstractFormatter2, isFormattedResource } from './AbstractFormatter2.js';
import type { IHiddenRegion } from './regionaccess/IHiddenRegion.js';
import type { StringHiddenRegion } from './regionaccess/internal/StringHiddenRegion.js';
import type { IFormattableDocument } from './IFormattableDocument.js';
import type { IHiddenRegionFormatter } from './IHiddenRegionFormatter.js';
import { ConflictingFormattingException } from './ConflictingFormattingException.js';
import { ConflictingRegionsException } from './internal/ConflictingRegionsException.js';
import { IntegerKey } from './preferences/IntegerKey.js';
import { MapBasedPreferenceValues } from './preferences/MapBasedPreferenceValues.js';
import type { ITextRegionExtensions } from './regionaccess/ITextRegionExtensions.js';
import {
  buildToyBlock,
  formatToString,
  FunctionFormatter,
  TOY,
  ToyObject,
} from '../../../test/helpers/xtext/ToyBlockFixture.js';

// Expected strings below are hand-derived from the Xtext 2.36.0 sources (AbstractFormatter2.postProcess 385-411,
// WhitespaceReplacer 33-96, HiddenRegionFormatting 83-131), not produced by running this port.
const TEXT_ENTRIES: ReadonlyArray<readonly [string, string]> = [
  ['a', '1'],
  ['b', '2'],
];
const oneSpace = (f: IHiddenRegionFormatter): void => f.oneSpace();
const noSpace = (f: IHiddenRegionFormatter): void => f.noSpace();
const newLine = (f: IHiddenRegionFormatter): void => f.newLine();
const newLines = (f: IHiddenRegionFormatter): void => f.setNewLines(1, 1, 2);
const indent = (f: IHiddenRegionFormatter): void => f.indent();

/** The unformatted text of the toy block: tokens separated by single spaces, no outer whitespace. */
const SPACED = 'block { a : 1 , b : 2 }';

function nothing(): FunctionFormatter {
  return new FunctionFormatter(() => {});
}

describe('AbstractFormatter2 - unformatted flow (postProcess)', () => {
  it('separates the tokens by single spaces with no leading or trailing space', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    expect(formatToString(nothing(), access)).toBe(SPACED);
  });

  it('gives the same result when only undefined hidden regions are formatted (the writer, unformatted)', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const text = formatToString(nothing(), access, (r) => r.setFormatUndefinedHiddenRegionsOnly(true));
    expect(text).toBe(SPACED);
  });

  it('renders an empty block without a space inside the document ends', () => {
    const { access } = buildToyBlock([]);
    expect(formatToString(nothing(), access)).toBe('block { }');
  });
});

/** The toy rules of the scenario in the task notes: braces, indent, comma, colon. */
function toyRules(obj: unknown, document: IFormattableDocument, ext: ITextRegionExtensions): void {
  const o = obj as ToyObject;
  if (o.label === 'root') {
    document.append(ext.regionFor(o).keywordElement(TOY.KW_BLOCK), oneSpace);
    const open = document.prepend(ext.regionFor(o).keywordElement(TOY.KW_LBRACE), oneSpace);
    const close = ext.regionFor(o).keywordElement(TOY.KW_RBRACE);
    document.interior(document.append(open, newLine), close, indent);
    document.prepend(close, newLines);
    for (const comma of ext.regionFor(o).keywords(',')) {
      document.append(document.prepend(comma, noSpace), newLine);
    }
    for (const child of o.children) document.format(child);
  } else {
    for (const colon of ext.regionFor(o).keywords(':')) {
      document.append(document.prepend(colon, noSpace), oneSpace);
    }
  }
}

describe('AbstractFormatter2 - formatted flow', () => {
  it('formats the toy block with spaces, newlines and tab indentation', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    expect(formatToString(new FunctionFormatter(toyRules), access)).toBe('block {\n\ta: 1,\n\tb: 2\n}');
  });

  it('uses the lineSeparator and indentation preferences', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const preferences = new MapBasedPreferenceValues();
    preferences.putTyped(FormatterPreferenceKeys.lineSeparator, '\r\n');
    preferences.putTyped(FormatterPreferenceKeys.indentation, '  ');
    const text = formatToString(new FunctionFormatter(toyRules), access, (r) => r.setPreferences(preferences));
    expect(text).toBe('block {\r\n  a: 1,\r\n  b: 2\r\n}');
  });

  it('defaults to a new line separator of LF and a tab indentation', () => {
    const request = new FormatterRequest();
    const preferences = request.getPreferences();
    expect(preferences.getTypedPreference(FormatterPreferenceKeys.lineSeparator)).toBe('\n');
    expect(preferences.getTypedPreference(FormatterPreferenceKeys.indentation)).toBe('\t');
    expect(preferences.getTypedPreference(FormatterPreferenceKeys.maxLineWidth)).toBe(120);
  });

  it('formats the contents of an object by default (_format(EObject)) and the first content of a resource', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const seen: string[] = [];
    class DefaultFormatter extends AbstractFormatter2 {
      format(obj: unknown, document: IFormattableDocument): void {
        if (isFormattedResource(obj)) {
          this._formatResource(obj, document);
        } else if (obj instanceof ToyObject) {
          seen.push(obj.label);
          this._formatObject(obj, document);
        }
      }
      exposeExtensions(): ITextRegionExtensions {
        return this.textRegionExtensions;
      }
    }
    const formatter = new DefaultFormatter();
    expect(formatToString(formatter, access)).toBe(SPACED);
    expect(seen).toEqual(['root', 'a', 'b']);
    expect(() => formatter.exposeExtensions()).toThrow('the formatter is not formatting');
  });
});

describe('AbstractFormatter2 - postProcess', () => {
  it('adds no space where the formatter covered every undefined hidden region', () => {
    const { access, root } = buildToyBlock(TEXT_ENTRIES);
    const formatter = new FunctionFormatter((obj, document, ext) => {
      if (obj !== root) return;
      document.prepend(ext.regionFor(root).keyword('block'), noSpace);
      for (const region of ext.allSemanticRegions(root)) document.append(region, oneSpace);
    });
    expect(formatToString(formatter, access)).toBe('block { a : 1 , b : 2 } ');
  });

  it('leaves defined hidden regions untouched', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    let hidden: IHiddenRegion | null = access.regionForRootEObject().getPreviousHiddenRegion();
    while (hidden !== null) {
      (hidden as StringHiddenRegion).setUndefined(false);
      hidden = hidden.getNextHiddenRegion();
    }
    expect(formatToString(nothing(), access)).toBe('block{a:1,b:2}');
  });
});

describe('AbstractFormatter2 - conflicting formattings', () => {
  const conflicting = (firstHigh: boolean, secondHigh: boolean) =>
    new FunctionFormatter((obj, document, ext) => {
      const block = ext.regionFor(obj as EObject).keywordElement(TOY.KW_BLOCK);
      document.append(block, (f) => {
        f.oneSpace();
        if (firstHigh) f.highPriority();
      });
      document.append(block, (f) => {
        f.noSpace();
        if (secondHigh) f.highPriority();
      });
    });

  it('keeps the first formatting and reports a ConflictingRegionsException for equal priorities', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const errors: Error[] = [];
    const text = formatToString(conflicting(false, false), access, (r) => r.setExceptionHandler((e) => errors.push(e)));
    expect(text).toBe(SPACED);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(ConflictingRegionsException);
    expect(errors[0]!.message.startsWith('Conflicting Regions.\n')).toBe(true);
    expect(errors[0]!.cause).toBeInstanceOf(ConflictingFormattingException);
    expect((errors[0]!.cause as Error).message).toBe("Conflicting values for 'space': ' ' and ''.");
  });

  it('rethrows the conflict through the THROWING handler, with the formatting exception as cause', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const formatter = conflicting(false, false);
    const request = new FormatterRequest().setTextRegionAccess(access).setExceptionHandler(ExceptionAcceptor.THROWING);
    const thrown = (() => {
      try {
        formatter.formatRequest(request);
        return null;
      } catch (e) {
        return e as Error;
      }
    })();
    expect(thrown).toBeInstanceOf(ConflictingRegionsException);
    expect((thrown!.cause as Error).message).toBe("Conflicting values for 'space': ' ' and ''.");
    expect(request.isEnableDebugTracing()).toBe(true);
    expect(() => formatter.getRequest()).toThrow('the formatter is not formatting');
  });

  it('lets the high priority formatting win in either order', () => {
    const forward = buildToyBlock(TEXT_ENTRIES).access;
    expect(formatToString(conflicting(false, true), forward)).toBe('block{ a : 1 , b : 2 }');
    const backward = buildToyBlock(TEXT_ENTRIES).access;
    expect(formatToString(conflicting(true, false), backward)).toBe(SPACED);
  });

  it('keeps the problematic document when a conflict arises after tracing was switched on', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const formatter = new FunctionFormatter((obj, document, ext) => {
      const block = ext.regionFor(obj as EObject).keywordElement(TOY.KW_BLOCK);
      document.append(block, oneSpace);
      document.getRequest().setEnableDebugTracing(true);
      document.append(block, noSpace);
    });
    expect(formatToString(formatter, access)).toBe(SPACED);
  });
});

describe('AbstractFormatter2 - errors and requests', () => {
  it('drops a failing rule with the default handler and keeps formatting', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const formatter = new FunctionFormatter(() => {
      throw new Error('rule failed');
    });
    expect(formatToString(formatter, access)).toBe(SPACED);
  });

  it('hands a thrown non-Error value to the handler as an Error', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const errors: Error[] = [];
    const formatter = new FunctionFormatter(() => {
      throw 'plain string';
    });
    formatToString(formatter, access, (r) => r.setExceptionHandler((e) => errors.push(e)));
    expect(errors.map((e) => e.message)).toEqual(['plain string']);
  });

  it('ignores exceptions by default for a region access with a syntax error', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const request = new FormatterRequest().setTextRegionAccess({
      ...Object.create(access),
      hasSyntaxError: () => true,
    });
    expect(request.getExplicitExceptionHandler()).toBe(ExceptionAcceptor.IGNORING);
    expect(new FormatterRequest().getExceptionHandler()).toBe(ExceptionAcceptor.LOGGING);
  });

  it('exposes the preference lookup, the preferences and the region access while formatting', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const formatter = new FunctionFormatter((_obj, document) => {
      expect(formatter.getPreference(FormatterPreferenceKeys.tabWidth)).toBe(4);
      expect(formatter.getPreferences()).toBe(document.getRequest().getPreferences());
      expect(formatter.getTextRegionAccess()).toBe(access);
    });
    formatToString(formatter, access, (r) => r.setExceptionHandler(ExceptionAcceptor.THROWING));
  });

  it('rejects a preference key that has neither a value nor a default', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const formatter = new FunctionFormatter(() => {
      formatter.getPreference(new IntegerKey('no.default', null));
    });
    const errors: Error[] = [];
    formatToString(formatter, access, (r) => r.setExceptionHandler((e) => errors.push(e)));
    expect(errors.map((e) => e.message)).toEqual(['no value or default for no.default']);
  });

  it('requires the formatter to be formatting for the extension methods', () => {
    expect(() => nothing().getRequest()).toThrow('the formatter is not formatting');
    expect(() => nothing().getTextRegionAccess()).toThrow('the formatter is not formatting');
  });

  it('formats every non-EObject value (shouldFormat) and every object (no requested regions)', () => {
    const formatter = nothing();
    const document = {} as IFormattableDocument;
    expect(formatter.shouldFormat('text', document)).toBe(true);
    expect(formatter.shouldFormat(new ToyObject('x'), document)).toBe(true);
  });

  it('formats nothing for a resource without contents', () => {
    const { access } = buildToyBlock(TEXT_ENTRIES);
    const empty = Object.create(access) as typeof access;
    empty.getResource = () => ({ getContents: () => [] });
    expect(formatToString(new FunctionFormatter(toyRules), empty)).toBe(SPACED);
  });
});

describe('AbstractFormatter2 - replay of recorded ELK writer output (graph-text-write.json)', () => {
  interface WriteCase {
    id: string;
    formatted: unknown;
    unformatted: unknown;
  }
  const refs = JSON.parse(
    readFileSync(new URL('../../../test/golden/refs/java/graph-text-write.json', import.meta.url), 'utf8'),
  ) as { cases: WriteCase[] };
  const expected = (id: string): { formatted: string; unformatted: string } => {
    const row = refs.cases.find((c) => c.id === id)!;
    return { formatted: row.formatted as string, unformatted: row.unformatted as string };
  };

  const ids = {
    graphKw: 'graphKeyword_1_0',
    nodeKw: 'nodeKeyword_0',
    portKw: 'portKeyword_0',
    lbrace: 'leftCurlyBracketKeyword_2_0',
    rbrace: 'rightCurlyBracketKeyword_2_4',
    identifier: 'identifierAssignment',
  };

  /** The relevant slice of `ElkGraphFormatter` for nodes and ports (T21 ports the whole class). */
  function elkLikeRules(root: ToyObject) {
    return new FunctionFormatter((obj, document, ext) => {
      const o = obj as ToyObject;
      const region = ext.regionFor(o);
      if (o === root) {
        document.append(region.keywordElement(ids.graphKw), oneSpace);
        document.append(region.assignment(ids.identifier), newLines);
      } else if (o.label.startsWith('node')) {
        document.append(region.keywordElement(ids.nodeKw), oneSpace);
        const open = document.append(document.prepend(region.keywordElement(ids.lbrace), oneSpace), newLine);
        document.interior(open, region.keywordElement(ids.rbrace), indent);
      } else {
        document.append(region.keywordElement(ids.portKw), oneSpace);
      }
      for (const child of o.children) {
        document.append(child, newLines);
        document.format(child);
      }
    });
  }

  it('reproduces "graph g" for the empty graph (container-root-empty)', async () => {
    const { TextRegionAccessBuilder } = await import('./regionaccess/TextRegionAccessBuilder.js');
    const root = new ToyObject('root');
    const builder = new TextRegionAccessBuilder(root, 'ElkNode');
    builder.token({ kind: 'keyword', grammarElement: ids.graphKw, assignment: null, text: 'graph', owner: root });
    builder.token({
      kind: 'assignment',
      grammarElement: 'rc.ID',
      assignment: ids.identifier,
      text: 'g',
      owner: root,
    });
    const access = builder.build();
    const ref = expected('container-root-empty');
    expect(ref.formatted).toBe('graph g\n');
    expect(formatToString(elkLikeRules(root), access)).toBe(ref.formatted);
    const again = formatToString(elkLikeRules(root), access, (r) => r.setFormatUndefinedHiddenRegionsOnly(true));
    expect(again).toBe(ref.unformatted);
  });

  it('reproduces nested nodes, braces and a port (hygiene-blank-lines)', async () => {
    const { TextRegionAccessBuilder } = await import('./regionaccess/TextRegionAccessBuilder.js');
    const port = new ToyObject('port p');
    const nodeA = new ToyObject('node a', [port]);
    const nodeB = new ToyObject('node b');
    const root = new ToyObject('root', [nodeA, nodeB]);
    const builder = new TextRegionAccessBuilder(root, 'ElkNode');
    const kw = (id: string, text: string, owner: ToyObject): void =>
      builder.token({ kind: 'keyword', grammarElement: id, assignment: null, text, owner });
    const name = (text: string, owner: ToyObject): void =>
      builder.token({ kind: 'assignment', grammarElement: 'rc.ID', assignment: ids.identifier, text, owner });
    kw(ids.graphKw, 'graph', root);
    name('g', root);
    builder.enterObject('ElkNode', nodeA);
    kw(ids.nodeKw, 'node', nodeA);
    name('a', nodeA);
    kw(ids.lbrace, '{', nodeA);
    builder.enterObject('ElkPort', port);
    kw(ids.portKw, 'port', port);
    name('p', port);
    builder.leaveObject();
    kw(ids.rbrace, '}', nodeA);
    builder.leaveObject();
    builder.enterObject('ElkNode', nodeB);
    kw(ids.nodeKw, 'node', nodeB);
    name('b', nodeB);
    builder.leaveObject();
    const ref = expected('hygiene-blank-lines');
    expect(ref.formatted).toBe('graph g\nnode a {\n\tport p\n}\nnode b\n');
    expect(formatToString(elkLikeRules(root), builder.build())).toBe(ref.formatted);
    expect(ref.unformatted).toBe(ref.formatted);
  });
});
