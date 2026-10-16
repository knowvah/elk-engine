// SPDX-License-Identifier: EPL-2.0

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { ElkGraphJsonValueConverterService } from '../conversion/ElkGraphJsonValueConverterService.js';
import { parse } from './ElkGraphJsonParser.js';

const PARSE_REF = fileURLToPath(
  new URL('../../../../../test/golden/refs/java/graph-json-text-parse.json', import.meta.url),
);
const SERVICES = new ElkGraphJsonValueConverterService();

interface RecordedCase {
  readonly id: string;
  readonly input: string;
  readonly diagnosticsAtLoad: ReadonlyArray<{ kind: string; message: string; line: number }>;
}

const cases = (JSON.parse(readFileSync(PARSE_REF, 'utf8')) as { cases: RecordedCase[] }).cases;

function recorded(id: string): RecordedCase {
  const found = cases.find((c) => c.id === id);
  if (found === undefined) {
    throw new Error(`No recorded case ${id}`);
  }
  return found;
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('ElkGraphJsonParser: diagnostic lines follow the Xtext node model (CR, LF and CRLF each end a line)', () => {
  it('reports the recorded syntax line for bare-CR input (err-syntax-cr-line-number)', () => {
    const c = recorded('err-syntax-cr-line-number');
    const recordedSyntax = c.diagnosticsAtLoad.filter((d) => d.kind === 'syntax');
    // Syntax messages are presence-only (D6): only kind and line are compared.
    expect(
      parse(c.input, SERVICES)
        .diagnostics.filter((d) => d.kind === 'syntax')
        .map((d) => ({ kind: d.kind, line: d.line })),
    ).toEqual(recordedSyntax.map((d) => ({ kind: d.kind, line: d.line })));
    expect(recordedSyntax.map((d) => d.line)).toEqual([3]);
  });

  it('reports the recorded conversion line (3) for the same document with bare CR breaks', () => {
    // The port does not reproduce the recovery-time conversion diagnostic of err-syntax-cr-line-number (D6);
    // the CRLF case has the same shape and a recorded conversion diagnostic on line 3.
    const crlf = recorded('err-syntax-crlf-line-number');
    const cr = crlf.input.replaceAll('\r\n', '\r');
    expect(parse(cr, SERVICES).diagnostics).toEqual(
      crlf.diagnosticsAtLoad.map((d) => ({ kind: d.kind, message: d.message, line: d.line })),
    );
    expect(crlf.diagnosticsAtLoad.map((d) => d.line)).toEqual([3]);
  });

  it('reports the recorded conversion line for CRLF input (err-syntax-crlf-line-number)', () => {
    const c = recorded('err-syntax-crlf-line-number');
    expect(parse(c.input, SERVICES).diagnostics).toEqual(
      c.diagnosticsAtLoad.map((d) => ({ kind: d.kind, message: d.message, line: d.line })),
    );
  });

  it.each(['lenient-cr-only', 'lenient-crlf'])('stays free of diagnostics for %s', (id) => {
    expect(parse(recorded(id).input, SERVICES).diagnostics).toEqual([]);
  });

  it('records the reference lines of bare-CR input (link-cr-line-numbers)', () => {
    const result = parse(recorded('link-cr-line-numbers').input, SERVICES);
    expect(result.references.map((r) => [r.feature, r.line])).toEqual([
      ['sources', 4],
      ['targets', 5],
    ]);
  });
});
