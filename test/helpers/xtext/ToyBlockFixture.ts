// SPDX-License-Identifier: EPL-2.0
import { BasicEList } from '../../../src/emf/common/util/BasicEList.js';
import type { EList } from '../../../src/emf/common/util/EList.js';
import type { EClass } from '../../../src/emf/ecore/EClass.js';
import type { EObject } from '../../../src/emf/ecore/EObject.js';
import { AbstractFormatter2, isFormattedResource } from '../../../src/xtext/formatting2/AbstractFormatter2.js';
import { FormatterRequest } from '../../../src/xtext/formatting2/FormatterRequest.js';
import type { IFormattableDocument } from '../../../src/xtext/formatting2/IFormattableDocument.js';
import type { IFormatter2 } from '../../../src/xtext/formatting2/IFormatter2.js';
import type { ITextRegionExtensions } from '../../../src/xtext/formatting2/regionaccess/ITextRegionExtensions.js';
import { TextRegionAccessBuilder } from '../../../src/xtext/formatting2/regionaccess/TextRegionAccessBuilder.js';
import type { StringBasedRegionAccess } from '../../../src/xtext/formatting2/regionaccess/internal/StringBasedRegionAccess.js';

/**
 * Test-only toy grammar for the `formatting2` tests (the real ElkGraph ids arrive with T19/T21):
 * `Block: 'block' '{' (entries+=Entry (',' entries+=Entry)*)? '}'` and
 * `Entry: name=ID ':' value=INT`. Not part of the library surface.
 */
export const TOY = {
  BLOCK_RULE: 'Block',
  ENTRY_ACTION: 'rc.Entry',
  KW_BLOCK: 'kw.block',
  KW_LBRACE: 'kw.lbrace',
  KW_RBRACE: 'kw.rbrace',
  KW_COMMA: 'kw.comma',
  KW_COLON: 'kw.colon',
  RC_ID: 'rc.ID',
  RC_INT: 'rc.INT',
  AS_NAME: 'as.name',
  AS_VALUE: 'as.value',
} as const;

const TOY_CLASS: EClass = { getName: (): string => 'Toy' };

/** A minimal `EObject` with explicit contents. */
export class ToyObject implements EObject {
  readonly label: string;
  readonly children: ToyObject[];

  constructor(label: string, children: ToyObject[] = []) {
    this.label = label;
    this.children = children;
  }

  eClass(): EClass {
    return TOY_CLASS;
  }

  eContainer(): EObject | null {
    return null;
  }

  eContents(): EList<EObject> {
    const list = new BasicEList<EObject>();
    for (const child of this.children) list.add(child);
    return list;
  }

  eAllContents(): IterableIterator<EObject> {
    return this.children[Symbol.iterator]();
  }
}

/** A built toy document: `block{a:1,b:2}` as unspaced token text. */
export interface ToyBlock {
  readonly root: ToyObject;
  readonly entries: readonly ToyObject[];
  readonly access: StringBasedRegionAccess;
}

/** Builds `block { a : 1 , b : 2 }` (names/values as given) through the builder, tokens unspaced. */
export function buildToyBlock(entrySpecs: ReadonlyArray<readonly [string, string]>): ToyBlock {
  const entries = entrySpecs.map(([name]) => new ToyObject(name));
  const root = new ToyObject('root', entries);
  const builder = new TextRegionAccessBuilder(root, TOY.BLOCK_RULE);
  const keyword = (grammarElement: string, text: string): void =>
    builder.token({ kind: 'keyword', grammarElement, assignment: null, text, owner: root });
  keyword(TOY.KW_BLOCK, 'block');
  keyword(TOY.KW_LBRACE, '{');
  entrySpecs.forEach(([name, value], index) => {
    if (index > 0) keyword(TOY.KW_COMMA, ',');
    const entry = entries[index]!;
    builder.enterObject(TOY.ENTRY_ACTION, entry);
    builder.token({
      kind: 'assignment',
      grammarElement: TOY.RC_ID,
      assignment: TOY.AS_NAME,
      text: name,
      owner: entry,
      feature: 'name',
    });
    builder.token({ kind: 'keyword', grammarElement: TOY.KW_COLON, assignment: null, text: ':', owner: entry });
    builder.token({
      kind: 'assignment',
      grammarElement: TOY.RC_INT,
      assignment: TOY.AS_VALUE,
      text: value,
      owner: entry,
      feature: 'value',
    });
    builder.leaveObject();
  });
  keyword(TOY.KW_RBRACE, '}');
  return { root, entries, access: builder.build() };
}

/** A formatter whose per-object formatting is a function (the Xtend `dispatch format` of a test grammar). */
export class FunctionFormatter extends AbstractFormatter2 implements IFormatter2 {
  private readonly rules: (obj: unknown, document: IFormattableDocument, extensions: ITextRegionExtensions) => void;

  constructor(rules: (obj: unknown, document: IFormattableDocument, extensions: ITextRegionExtensions) => void) {
    super();
    this.rules = rules;
  }

  format(obj: unknown, document: IFormattableDocument): void {
    if (isFormattedResource(obj)) {
      this._formatResource(obj, document);
    } else {
      this.rules(obj, document, this.textRegionExtensions);
    }
  }
}

/** Formats `access` with `formatter` and renders the result. */
export function formatToString(
  formatter: IFormatter2,
  access: StringBasedRegionAccess,
  configure: (request: FormatterRequest) => void = (): void => {},
): string {
  const request = new FormatterRequest().setTextRegionAccess(access);
  configure(request);
  return access.getRewriter().renderToString(formatter.formatRequest(request));
}
