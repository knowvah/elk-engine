// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../../core/data/LayoutOptionData.js';
import { LayoutOptionProxy } from '../../../core/util/internal/LayoutOptionProxy.js';
import { toString as doubleToString } from '../../../java/lang/DoubleToString.js';
import { Property } from '../../properties/Property.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphJsonText } from './ElkGraphJsonText.js';

const LEXER_REF = fileURLToPath(
  new URL('../../../../test/golden/refs/java/graph-json-text-lexer.json', import.meta.url),
);
const DOCUMENT = 'Document';
const CLASS_LAYOUT_OPTION_DATA = 'org.eclipse.elk.core.data.LayoutOptionData';
const CLASS_PROPERTY = 'org.eclipse.elk.graph.properties.Property';
const CLASS_PROXY = 'org.eclipse.elk.core.util.internal.LayoutOptionProxy';
const CLASS_DOUBLE = 'java.lang.Double';
const CLASS_INTEGER = 'java.lang.Integer';
const CLASS_STRING = 'java.lang.String';
const CLASS_BOOLEAN = 'java.lang.Boolean';
/** `EnumSet.of`/`noneOf` of a small enum is Java's `RegularEnumSet`; the port has one `EnumSet` class. */
const SIMPLE_REGULAR_ENUM_SET = 'RegularEnumSet';
const PORT_ENUM_SET = 'EnumSet';
/** The document `ElkjLexerVectors.Describe.document` builds around a "<key>: <value>" input. */
const WRAPPER_PREFIX = '{layoutOptions: {';
const WRAPPER_SUFFIX = '}}';

interface Described {
  readonly class: string;
  readonly id?: string;
  readonly text?: string;
}

interface DocumentRow {
  readonly converter: string;
  readonly input: string;
  readonly output: {
    readonly errors: readonly { readonly line: number; readonly msg: string }[];
    readonly entry: { readonly key: Described; readonly value: Described | null } | null;
  };
}

const rows = (JSON.parse(readFileSync(LEXER_REF, 'utf8')) as { converters: DocumentRow[] }).converters.filter(
  (r) => r.converter === DOCUMENT,
);
const clean = rows.filter((r) => r.output.errors.length === 0);
const failing = rows.filter((r) => r.output.errors.length > 0);

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

const simpleName = (javaClass: string): string => javaClass.substring(javaClass.lastIndexOf('.') + 1);

/** A value as the recorder describes it; a `number` takes the Java box type the row records. */
function describeValue(v: unknown, recorded: Described | null): Described | null {
  if (v === null || v === undefined) return null;
  if (v instanceof LayoutOptionData) return { class: CLASS_LAYOUT_OPTION_DATA, id: v.getId() };
  if (v instanceof Property) return { class: CLASS_PROPERTY, id: v.getId() };
  if (v instanceof LayoutOptionProxy) return { class: CLASS_PROXY, text: v.toString() as string };
  if (typeof v === 'string') return { class: CLASS_STRING, text: v };
  if (typeof v === 'boolean') return { class: CLASS_BOOLEAN, text: String(v) };
  if (typeof v === 'number') {
    const javaClass = recorded?.class === CLASS_INTEGER ? CLASS_INTEGER : CLASS_DOUBLE;
    return { class: javaClass, text: javaClass === CLASS_DOUBLE ? doubleToString(v) : String(v) };
  }
  const name =
    (v as object).constructor.name === PORT_ENUM_SET ? SIMPLE_REGULAR_ENUM_SET : (v as object).constructor.name;
  return { class: recorded !== null && simpleName(recorded.class) === name ? recorded.class : name, text: String(v) };
}

/** The first property entry of the loaded document's root, as `ElkjLexerVectors.Describe.entry` reads it. */
function loadDocument(input: string): { key: Described | null; value: unknown; errors: number } {
  const loaded = ElkGraphJsonText.load(`${WRAPPER_PREFIX}${input}${WRAPPER_SUFFIX}`);
  const first = loaded.root === null ? undefined : [...loaded.root.getProperties().entryList()][0];
  return {
    errors: loaded.errors.length,
    key: first === undefined ? null : describeValue(first.getKey(), null),
    value: first?.getValue(),
  };
}

describe('ElkGraphJsonText.load: replay of the recorded Document rows', () => {
  it('records 490 rows, 366 of them without error', () => {
    expect(rows).toHaveLength(490);
    expect(clean).toHaveLength(366);
  });

  it.each(clean.map((r) => [r.input, r] as const))('loads {layoutOptions: {%s}} to the recorded entry', (_in, row) => {
    const { key, value, errors } = loadDocument(row.input);
    expect(errors).toBe(0);
    const recorded = row.output.entry as NonNullable<DocumentRow['output']['entry']>;
    expect(key).toEqual(recorded.key);
    expect(describeValue(value, recorded.value)).toEqual(recorded.value);
  });

  it.each(failing.map((r) => [r.input, r] as const))('reports a syntax error for {layoutOptions: {%s}}', (_in, row) => {
    const loaded = ElkGraphJsonText.load(`${WRAPPER_PREFIX}${row.input}${WRAPPER_SUFFIX}`);
    expect(loaded.errors.some((d) => d.kind === 'syntax')).toBe(true);
  });
});
