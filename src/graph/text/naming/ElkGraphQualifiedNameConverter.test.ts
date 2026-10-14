// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ValueConverterException } from '../../../xtext/conversion/ValueConverterException.js';
import { QualifiedName } from '../../../xtext/naming/QualifiedName.js';
import { tokenize } from '../parser/ElkGraphLexer.js';
import { ELK_GRAPH_KEYWORDS } from '../parser/ElkGraphTokenType.js';
import { ElkGraphQualifiedNameConverter } from './ElkGraphQualifiedNameConverter.js';

const LEXER_REF = new URL('../../../../test/golden/refs/java/graph-text-lexer.json', import.meta.url);
const CLASS_IAE = 'java.lang.IllegalArgumentException';
const CLASS_VCE = 'org.eclipse.xtext.conversion.ValueConverterException';
const SEGMENT_SEPARATOR = '|';
const QN_PREFIX = 'qn:';

interface Row {
  readonly converter: string;
  readonly op: string;
  readonly input: string | null;
  readonly output?: { readonly segments: readonly string[]; readonly text: string };
  readonly error?: { readonly cls: string; readonly msg: string };
}

const rows = (JSON.parse(readFileSync(LEXER_REF, 'utf8')) as { converters: readonly Row[] }).converters.filter(
  (row) => row.converter === 'QualifiedName',
);

const converter = new ElkGraphQualifiedNameConverter(tokenize, ELK_GRAPH_KEYWORDS);

/** Mirrors `ElktLexerVectors.Converters.segments`. */
function nameOf(input: string | null): QualifiedName | null {
  if (input === null) return null;
  const payload = input.substring(QN_PREFIX.length);
  return QualifiedName.create(...(payload.length === 0 ? [] : payload.split(SEGMENT_SEPARATOR)));
}

function errorClass(e: unknown): string {
  if (e instanceof IllegalArgumentException) return CLASS_IAE;
  if (e instanceof ValueConverterException) return CLASS_VCE;
  return (e as Error).name;
}

function run(row: Row): unknown {
  return row.op === 'toQualifiedName' ? converter.toQualifiedName(row.input) : converter.toString(nameOf(row.input));
}

describe('ElkGraphQualifiedNameConverter vectors', () => {
  it('replays every QualifiedName row', () => {
    expect(rows.length).toBe(39);
    for (const row of rows) {
      const label = `${row.op}(${JSON.stringify(row.input)})`;
      if (row.error !== undefined) {
        let thrown: unknown = null;
        try {
          run(row);
        } catch (e) {
          thrown = e;
        }
        expect(errorClass(thrown), label).toBe(row.error.cls);
        expect((thrown as Error).message, label).toBe(row.error.msg);
      } else if (row.op === 'toQualifiedName') {
        const name = run(row) as QualifiedName;
        expect({ segments: name.getSegments(), text: name.toString() }, label).toEqual(row.output);
      } else {
        expect(run(row), label).toBe(row.output);
      }
    }
  });
});

describe('ElkGraphQualifiedNameConverter', () => {
  it('uses a dot as delimiter', () => {
    expect(ElkGraphQualifiedNameConverter.DELIMITER).toBe('.');
  });

  it('maps an empty segment list to the empty name', () => {
    expect(converter.toQualifiedName('.')).toBe(QualifiedName.EMPTY);
    expect(converter.toString(QualifiedName.EMPTY)).toBe('');
  });

  it('round-trips escaped keywords', () => {
    const name = converter.toQualifiedName('a.^node');
    expect(name.getSegments()).toEqual(['a', 'node']);
    expect(converter.toString(name)).toBe('a.^node');
  });
});
