// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { IFormattableDocument } from '../../../../xtext/formatting2/IFormattableDocument.js';
import { bareStatement, digraph } from '../../../../../test/helpers/dot-write-builders.js';
import { GraphvizDotFormatter } from './GraphvizDotFormatter.js';

// The fallbacks of the generated dispatch (GraphvizDotFormatter.java, xtend-gen, `format(Object, IFormattableDocument)`):
// an EObject no overload takes goes to AbstractFormatter2._format(EObject), which formats its contents; null and
// other objects are not formatted. The overloads themselves are proven end to end by the write-ref replay.

/** A document that records what it is asked to format. */
function recordingDocument(): { document: IFormattableDocument; formatted: unknown[] } {
  const formatted: unknown[] = [];
  const document = { format: <T>(obj: T): T => (formatted.push(obj), obj) } as unknown as IFormattableDocument;
  return { document, formatted };
}

describe('GraphvizDotFormatter.format dispatch fallbacks', () => {
  it('formats the contents of an EObject of another package', () => {
    const child = digraph();
    const other = { eContents: (): readonly EObject[] => [child], eClass: () => ({ getName: () => 'Other' }) };
    const { document, formatted } = recordingDocument();
    new GraphvizDotFormatter().format(other, document);
    expect(formatted).toEqual([child]);
  });

  it('formats the (empty) contents of a bare Statement, which no overload takes', () => {
    const { document, formatted } = recordingDocument();
    new GraphvizDotFormatter().format(bareStatement(), document);
    expect(formatted).toEqual([]);
  });

  it('does not format null or a non-EObject', () => {
    const { document, formatted } = recordingDocument();
    new GraphvizDotFormatter().format(null, document);
    new GraphvizDotFormatter().format('text', document);
    expect(formatted).toEqual([]);
  });

  it('formats the first content of a resource', () => {
    const model = digraph();
    const { document, formatted } = recordingDocument();
    new GraphvizDotFormatter().format({ getContents: () => [model] }, document);
    expect(formatted).toEqual([model]);
  });
});
