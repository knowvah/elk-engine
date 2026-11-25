// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { FormatterPreferenceKeys } from '../FormatterPreferenceKeys.js';
import type { FormatterRequest } from '../FormatterRequest.js';
import type { HiddenRegionFormatterInit } from '../IHiddenRegionFormatter.js';
import type { IFormattableDocument } from '../IFormattableDocument.js';
import { MapBasedPreferenceValues } from '../preferences/MapBasedPreferenceValues.js';
import type { FeatureRef } from '../regionaccess/FeatureRef.js';
import type { IHiddenRegion } from '../regionaccess/IHiddenRegion.js';
import type { ITextRegionExtensions } from '../regionaccess/ITextRegionExtensions.js';
import { TextRegionAccessBuilder } from '../regionaccess/TextRegionAccessBuilder.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextReplacerContext } from '../ITextReplacerContext.js';
import {
  buildToyBlock,
  formatToString,
  FunctionFormatter,
  ToyObject,
} from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import { RootDocument } from './RootDocument.js';

// End-to-end proof of the autowrap path against the JVM: `graphviz-dot-write.json` (recorded by
// tools/vectors/DotWriteVectors.java with Xtext 2.36 and GraphvizDotSerializer's maxLineWidth 255). The DOT model
// is rebuilt here from stand-in objects (src/xtext may not import src/alg), its token sequence is the one the
// generated sequencer emits (Graph: type name '{' statements '}'; the optional ';' and ',' are emitted by the
// GraphvizDotSyntacticSequencer overrides), and the formatter calls are those of GraphvizDotFormatter.java
// (xtend-gen), in its order. Inputs follow DotWriteModels.java (autowrapModels, widthModels).

const REF = fileURLToPath(new URL('../../../../test/golden/refs/java/graphviz-dot-write.json', import.meta.url));
const MAX_LINE_LENGTH = 255; // GraphvizDotSerializer.MAX_LINE_LENGTH

interface RefRow {
  readonly id: string;
  readonly detached: { readonly formatted: string | { readonly error: unknown }; readonly log?: unknown };
}
const ROWS: ReadonlyMap<string, RefRow> = new Map(
  (JSON.parse(readFileSync(REF, 'utf8')) as { rows: RefRow[] }).rows.map((row) => [row.id, row]),
);

function expectedText(id: string): string {
  const row = ROWS.get(id);
  if (row === undefined) throw new Error(`missing ref row ${id}`);
  expect(row.detached.log).toBeUndefined();
  const formatted = row.detached.formatted;
  if (typeof formatted !== 'string') throw new Error(`ref row ${id} is an error`);
  return formatted;
}

// ---- the stand-in model: B.n / B.a / B.sub / B.digraph of DotWriteModels.java ----

type Statement =
  | { readonly kind: 'NodeStatement'; readonly name: string; readonly attributes: readonly Attr[] }
  | { readonly kind: 'Attribute'; readonly name: string; readonly value: string }
  | { readonly kind: 'Subgraph'; readonly name: string; readonly statements: readonly Statement[] };
type Attr = readonly [name: string, value: string];

const n = (name: string, ...attributes: Attr[]): Statement => ({ kind: 'NodeStatement', name, attributes });
const a = (name: string, value: string): Attr => [name, value];
const stmtAttr = (name: string, value: string): Statement => ({ kind: 'Attribute', name, value });
const sub = (name: string, ...statements: Statement[]): Statement => ({ kind: 'Subgraph', name, statements });
const repeat = (unit: string, times: number): string => unit.repeat(times);
const quoted = (text: string): string => `"${text}"`;
/** `B.attrs(prefix, count, value)`: attributes `<prefix>NN = value(NN)`. */
const attrs = (prefix: string, count: number, value: (i: number) => string): Attr[] =>
  Array.from({ length: count }, (_, i) => a(`${prefix}${String(i).padStart(2, '0')}`, value(i)));

/** A stand-in EObject that knows its DOT class (`kind`); `children` is filled in containment order while building. */
class Dot extends ToyObject {
  constructor(readonly kind: string) {
    super(kind);
  }
}

/** Builds the region access of `digraph G { statements }` with the token ownership of the DOT grammar. */
function buildDigraph(statements: readonly Statement[]) {
  const model = new Dot('GraphvizModel');
  const graph = new Dot('Graph');
  const builder = new TextRegionAccessBuilder(model, 'GraphvizModel');
  const keyword = (text: string, owner: EObject): void =>
    builder.token({ kind: 'keyword', grammarElement: `kw.${text}`, assignment: null, text, owner });
  const value = (text: string, owner: EObject, feature: string): void =>
    builder.token({
      kind: 'assignment',
      grammarElement: 'rc.DotID',
      assignment: `as.${feature}`,
      text,
      owner,
      feature,
    });
  const enter = (obj: Dot): void => builder.enterObject(`rc.${obj.kind}`, obj);

  const statement = (s: Statement, container: Dot): void => {
    const owner = new Dot(s.kind);
    container.children.push(owner);
    enter(owner);
    if (s.kind === 'NodeStatement') {
      const node = new Dot('Node');
      owner.children.push(node);
      enter(node);
      value(s.name, node, 'name');
      builder.leaveObject();
      if (s.attributes.length > 0) {
        keyword('[', owner);
        s.attributes.forEach(([name, val], index) => {
          if (index > 0) keyword(',', owner); // emit_NodeStatement_CommaKeyword_1_1_1_0_q
          const attribute = new Dot('Attribute');
          owner.children.push(attribute);
          enter(attribute);
          value(name, attribute, 'name');
          keyword('=', attribute);
          value(val, attribute, 'value');
          builder.leaveObject();
        });
        keyword(']', owner);
      }
    } else if (s.kind === 'Attribute') {
      value(s.name, owner, 'name');
      keyword('=', owner);
      value(s.value, owner, 'value');
    } else {
      keyword('subgraph', owner);
      value(s.name, owner, 'name');
      keyword('{', owner);
      s.statements.forEach((child) => statement(child, owner));
      keyword('}', owner);
    }
    keyword(';', owner); // emit_Statement_SemicolonKeyword_1_q
    builder.leaveObject();
  };

  model.children.push(graph);
  enter(graph);
  value('digraph', graph, 'type');
  value('G', graph, 'name');
  keyword('{', graph);
  statements.forEach((child) => statement(child, graph));
  keyword('}', graph);
  builder.leaveObject();
  return { model, access: builder.build() };
}

// ---- GraphvizDotFormatter.java, the dispatch arms these models reach ----

const autowrap: HiddenRegionFormatterInit = (it) => it.autowrap();
const oneSpace: HiddenRegionFormatterInit = (it) => it.oneSpace();
const noSpace: HiddenRegionFormatterInit = (it) => it.noSpace();
const newLine: HiddenRegionFormatterInit = (it) => it.newLine();
const indent: HiddenRegionFormatterInit = (it) => it.indent();
const GRAPH__TYPE: FeatureRef = {
  name: 'type',
  isContainment: false,
  isInstance: (obj) => obj instanceof Dot && obj.kind === 'Graph',
};

type Ext = ITextRegionExtensions;
type Doc = IFormattableDocument;

function formatModel(model: Dot, document: Doc, ext: Ext): void {
  let region: IHiddenRegion | null = ext.previousHiddenRegion(model);
  while (region !== null) {
    document.set(region, autowrap);
    region = region.getNextHiddenRegion();
  }
  for (const graph of model.children) {
    document.append(graph, newLine);
    document.format(graph);
  }
}

function formatBlock(owner: Dot, document: Doc, ext: Ext): void {
  document.interior(
    document.append(document.prepend(ext.regionFor(owner).keyword('{'), oneSpace), newLine),
    ext.regionFor(owner).keyword('}'),
    indent,
  );
  for (const statement of owner.children) {
    document.append(statement, newLine);
    document.format(statement);
  }
}

function formatGraph(graph: Dot, document: Doc, ext: Ext): void {
  document.surround(ext.regionFor(graph).feature(GRAPH__TYPE), oneSpace);
  formatBlock(graph, document, ext);
}

function formatAttribute(attribute: Dot, document: Doc, ext: Ext): void {
  document.prepend(ext.regionFor(attribute).keyword(';'), noSpace);
  document.surround(ext.regionFor(attribute).keyword('='), oneSpace);
}

function formatNodeStatement(statement: Dot, document: Doc, ext: Ext): void {
  document.prepend(ext.regionFor(statement).keyword(';'), noSpace);
  document.append(document.prepend(ext.regionFor(statement).keyword('['), oneSpace), noSpace);
  document.prepend(ext.regionFor(statement).keyword(']'), noSpace);
  ext
    .regionFor(statement)
    .keywords(',')
    .forEach((it) => document.append(document.prepend(it, noSpace), oneSpace));
  for (const child of statement.children) document.format(child); // the node, then the attributes
}

function formatNode(node: Dot, document: Doc, ext: Ext): void {
  document.surround(ext.regionFor(node).keyword(':'), noSpace);
}

function formatSubgraph(subgraph: Dot, document: Doc, ext: Ext): void {
  document.prepend(ext.regionFor(subgraph).keyword(';'), noSpace);
  document.append(ext.regionFor(subgraph).keyword('subgraph'), oneSpace);
  formatBlock(subgraph, document, ext);
}

const DISPATCH: Readonly<Record<string, (obj: Dot, document: Doc, ext: Ext) => void>> = {
  GraphvizModel: formatModel,
  Graph: formatGraph,
  Attribute: formatAttribute,
  NodeStatement: formatNodeStatement,
  Node: formatNode,
  Subgraph: formatSubgraph,
};

/** GraphvizDotSerializer.serialize: a fresh request with maxLineWidth 255, then the formatter, then the render. */
function serialize(statements: readonly Statement[], formatting = true): string {
  const { access } = buildDigraph(statements);
  const formatter = new FunctionFormatter((obj, document, ext) =>
    DISPATCH[(obj as Dot).kind]!(obj as Dot, document, ext),
  );
  const errors: Error[] = [];
  const text = formatToString(formatter, access, (request) => {
    const preferences = new MapBasedPreferenceValues(null, new Map());
    preferences.putTyped(FormatterPreferenceKeys.maxLineWidth, MAX_LINE_LENGTH);
    request.setPreferences(preferences);
    request.setFormatUndefinedHiddenRegionsOnly(!formatting);
    request.setExceptionHandler((e) => errors.push(e));
  });
  expect(errors).toEqual([]);
  return text;
}

const WIDTHS = Array.from({ length: 250 - 228 + 1 }, (_, i) => 228 + i);
const spaced = (k: number): string => Array.from({ length: k }, (_, i) => (i % 2 === 0 ? 'x' : ' ')).join('');

describe('autowrap replay of graphviz-dot-write.json, width sweeps (k = 228..250)', () => {
  const shapes: ReadonlyArray<readonly [string, (k: number) => Statement[]]> = [
    ['node-label', (k) => [n('n', a('label', quoted(repeat('x', k))))]],
    ['statement-value', (k) => [stmtAttr('label', quoted(repeat('x', k)))]],
    ['nested3', (k) => [sub('s1', sub('s2', n('n', a('label', quoted(repeat('x', k))))))]],
    ['spaced', (k) => [n('n', a('label', quoted(spaced(k))))]],
    ['two-attributes', (k) => [n('n', a('a', repeat('x', k - 120)), a('b', repeat('y', 110)))]],
  ];
  for (const [shape, build] of shapes) {
    it.each(WIDTHS)(`${shape}/%i formats like the JVM, formatted and unformatted`, (k) => {
      const id = `built/width/${shape}/${String(k).padStart(3, '0')}`;
      expect(serialize(build(k), true)).toBe(expectedText(id));
      expect(serialize(build(k), false)).toBe(expectedText(id));
    });
  }
});

describe('autowrap replay of graphviz-dot-write.json, autowrap rows of node and attribute statements', () => {
  const rows: ReadonlyArray<readonly [string, () => Statement[]]> = [
    ['long-quoted-value-no-break', () => [n('a', a('label', quoted(repeat('x', 300))))]],
    ['long-quoted-value-with-spaces', () => [n('a', a('label', quoted(repeat('word ', 80).trim())))]],
    ['long-bare-value', () => [n('a', a('label', repeat('y', 300)))]],
    ['many-attributes', () => [n('a', ...attrs('attr', 40, (i) => `value${i}`))]],
    ['many-quoted-attributes', () => [n('a', ...attrs('k', 30, (i) => quoted(`quoted value ${i}`)))]],
    ['two-long-tokens', () => [n(repeat('p', 200), a('label', quoted(repeat('q', 200))))]],
    ['long-token-after-short', () => [n('a', a('w', '1'), a('label', quoted(repeat('z', 260))), a('h', '2'))]],
    ['statement-attribute', () => [stmtAttr('label', quoted(repeat('w', 280)))]],
    ['three-wraps', () => [n('a', ...attrs('long_attribute_', 60, (i) => `v${i}`))]],
  ];
  it.each(rows)('%s formats like the JVM', (name, build) => {
    expect(serialize(build())).toBe(expectedText(`built/autowrap/${name}`));
  });
});

// ---- createReplacements / needsAutowrap on hand-built token sequences ----
// Expected strings are hand-traced through FormattableDocument.java 124-170 (createReplacements) and 248-264
// (needsAutowrap): a wrap is due when the line before the next replacer is longer than maxLineWidth; the
// candidate is the last context that could autowrap; a line break in the text since the previous replacer, or
// inside the region of the current one, drops the candidate; a later candidate replaces it only when its
// region plus trigger ends later.

const autowrapAndOneSpace: HiddenRegionFormatterInit = (it) => (it.autowrap(), it.oneSpace());

function withMaxLineWidth(width: number) {
  return (request: FormatterRequest): void => {
    const preferences = new MapBasedPreferenceValues();
    preferences.putTyped(FormatterPreferenceKeys.maxLineWidth, width);
    request.setPreferences(preferences);
    request.setExceptionHandler((e) => {
      throw e;
    });
  };
}

/** A root with one token per text; returns the access and the hidden regions h0..hn in order. */
function tokens(...texts: string[]) {
  const root = new ToyObject('root');
  const builder = new TextRegionAccessBuilder(root, 'R');
  for (const text of texts)
    builder.token({ kind: 'keyword', grammarElement: 'kw', assignment: null, text, owner: root });
  const access = builder.build();
  const hidden: IHiddenRegion[] = [];
  let h: IHiddenRegion | null = access.regionForRootEObject().getPreviousHiddenRegion();
  while (h !== null) {
    hidden.push(h);
    h = h.getNextHiddenRegion();
  }
  return { root, access, hidden };
}

describe('FormattableDocument.createReplacements with autowrap', () => {
  it('wraps the last autowrap region before each overflow of maxLineWidth', () => {
    const { access } = buildToyBlock([
      ['a', '1'],
      ['b', '2'],
    ]);
    const formatter = new FunctionFormatter((obj, document, ext) => {
      for (let h = ext.previousHiddenRegion(obj as EObject); h !== null; h = h.getNextHiddenRegion()) {
        document.set(h, autowrapAndOneSpace);
      }
    });
    // " block {" is 8 columns; " block { a" (10) overflows, so the gap after '{' wraps; "a : 1 , b" (9) again
    expect(formatToString(formatter, access, withMaxLineWidth(8))).toBe(' block {\na : 1 ,\nb : 2 } ');
    expect(formatToString(formatter, access, withMaxLineWidth(255))).toBe(' block { a : 1 , b : 2 } ');
  });

  it('drops the candidate when the text since the previous replacer has a line break', () => {
    const { root, access, hidden } = tokens('p', 'x\nyyyyyyyyyyyy', 'q');
    const formatter = new FunctionFormatter((obj, document) => {
      if (obj === root) for (const h of hidden) document.set(h, autowrapAndOneSpace);
    });
    // without the drop the gap after 'p' would wrap at the second replacer; it wraps the gap before 'q' instead
    expect(formatToString(formatter, access, withMaxLineWidth(8))).toBe(' p x\nyyyyyyyyyyyy\nq ');
  });

  it('keeps a candidate whose region plus trigger ends later than the next candidate', () => {
    const { root, access, hidden } = tokens('aa', 'bb', 'cc');
    const formatter = new FunctionFormatter((obj, document) => {
      if (obj !== root) return;
      const [h0, h1, h2, h3] = hidden as [IHiddenRegion, IHiddenRegion, IHiddenRegion, IHiddenRegion];
      document.set(h0, (it) => it.oneSpace());
      const trigger = document.getFormatter().createHiddenRegionFormatting();
      trigger.setSpace(' ');
      trigger.setAutowrap(10);
      document.addReplacer(document.getFormatter().createHiddenRegionReplacer(h1, trigger));
      document.set(h2, autowrapAndOneSpace);
      document.set(h3, (it) => it.oneSpace());
    });
    // h1 ends at 2 + 10, h2 at 4 + 0: h1 stays the candidate, so " aa bb cc" (9 > 6) wraps after "aa"
    expect(formatToString(formatter, access, withMaxLineWidth(6))).toBe(' aa\nbb cc ');
  });
});

describe('FormattableDocument.needsAutowrap', () => {
  class ProbeDocument extends RootDocument {
    probe(wrappable: ITextReplacerContext, context: ITextReplacerContext, maxLineWidth: number): boolean {
      return this.needsAutowrap(wrappable, context, maxLineWidth);
    }
  }
  const stub = (region: IHiddenRegion): ITextReplacer => ({
    getRegion: () => region,
    createReplacements: (context: ITextReplacerContext) => context,
  });

  it('is true only when the line before the replacer is longer than maxLineWidth', () => {
    const { access, root, entries } = buildToyBlock([['a', '1']]);
    const results: boolean[] = [];
    const formatter = new FunctionFormatter((obj, document, ext) => {
      if (obj !== root) return;
      const probe = new ProbeDocument(document.getFormatter());
      const start = document.getFormatter().createTextReplacerContext(probe);
      const wrappable = start.withReplacer(stub(ext.previousHiddenRegion(entries[0]!)!)); // offset 6
      const context = wrappable.withReplacer(stub(ext.regionFor(entries[0]!).keyword(':')!.getNextHiddenRegion()!));
      // the line before the second replacer (offset 8) is "block{a:", 8 columns
      for (const canAutowrap of [0, 100]) {
        wrappable.setCanAutowrap(canAutowrap);
        results.push(probe.probe(wrappable, context, 7), probe.probe(wrappable, context, 8));
      }
    });
    formatToString(formatter, access);
    expect(results).toEqual([true, false, true, false]);
  });
});
