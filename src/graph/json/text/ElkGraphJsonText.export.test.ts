// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { exportLikeOracle } from '../../../../test/helpers/graph-json-oracle.js';
import {
  readParseCases,
  withoutJavaClass,
  type RecordedDiagnostic,
} from '../../../../test/helpers/graph-json-text-linking.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphJsonText, diagnosticsOf } from './ElkGraphJsonText.js';

const SYNTAX = 'syntax';
const NULL_POINTER = 'java.lang.NullPointerException';

interface Thrown {
  readonly throws: { readonly cls: string; readonly msg: string | null };
}

interface ExportCase {
  readonly id: string;
  readonly input: string;
  readonly json: string | Thrown | null;
  readonly diagnosticsAtLoad: readonly { readonly kind: string }[];
  readonly diagnosticsAfterExport: readonly RecordedDiagnostic[];
}

const cases = readParseCases() as unknown as ExportCase[];
const isThrown = (json: ExportCase['json']): json is Thrown => typeof json === 'object' && json !== null;
const hasSyntaxError = (c: ExportCase): boolean => c.diagnosticsAtLoad.some((d) => d.kind === SYNTAX);

/**
 * Known divergence (user decision 2026-10-14, extended to `.elkj` by D13): the exporter hitting an edge endpoint it
 * does not know throws a message-less IllegalArgumentException (Gson 2.8) where the oracle (Gson 2.11) records a
 * message-less NullPointerException. The exporter reads the endpoints through `get`, so resolution adds the one
 * recorded linking diagnostic. The five other NullPointerExceptions carry a message (a null property value after
 * syntax recovery) and are covered by the syntax-row policy below.
 */
const isUnknownEndpoint = (c: ExportCase): boolean =>
  isThrown(c.json) && c.json.throws.cls === NULL_POINTER && c.json.throws.msg === null;

const exportable = cases.filter((c) => !hasSyntaxError(c));
const syntaxCases = cases.filter(hasSyntaxError);

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

/** The export of an export-only fresh load, as `ElkjParseVectors` records resource 3. */
function exportOnly(input: string): { text?: string; error?: Error; diagnostics: unknown[] } {
  const loaded = ElkGraphJsonText.load(input);
  try {
    return { text: exportLikeOracle(loaded.root as ElkNode), diagnostics: diagnosticsOf(loaded.resource) };
  } catch (e) {
    return { error: e as Error, diagnostics: diagnosticsOf(loaded.resource) };
  }
}

describe('ElkGraphJsonText.load: export of the recorded JVM parse cases', () => {
  it('records 439 exports, 36 of them exceptions, 31 of them unknown endpoints', () => {
    expect(cases.filter((c) => isThrown(c.json))).toHaveLength(36);
    expect(cases.filter(isUnknownEndpoint)).toHaveLength(31);
  });

  it.each(exportable.map((c) => [c.id, c] as const))('exports %s to the recorded json and diagnostics', (_id, c) => {
    const got = exportOnly(c.input);
    if (isUnknownEndpoint(c)) {
      expect(got.error?.constructor).toBe(IllegalArgumentException);
      expect(got.error?.message).toBe('');
    } else {
      expect(got.error).toBeUndefined();
      expect(got.text).toBe(c.json);
    }
    expect(got.diagnostics).toEqual(c.diagnosticsAfterExport.map(withoutJavaClass));
  });
});

// presence policy (D6): after a syntax error the port stops at the first error while ANTLR recovers, so the exported
// graph (and the five recorded NullPointerExceptions of null property values it recovers) is not comparable. The
// port must still export what it parsed, failing at most with the unknown-endpoint exception.
describe('ElkGraphJsonText.load: export after a syntax error', () => {
  it.each(syntaxCases.map((c) => [c.id, c] as const))('%s exports the partial model', (_id, c) => {
    const got = exportOnly(c.input);
    expect(got.error === undefined || got.error instanceof IllegalArgumentException).toBe(true);
    expect(typeof got.text === 'string' || got.error !== undefined).toBe(true);
    expect((got.diagnostics as { kind: string }[]).some((d) => d.kind === SYNTAX)).toBe(true);
  });
});
