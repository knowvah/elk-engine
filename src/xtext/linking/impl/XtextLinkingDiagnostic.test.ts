// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LINKING_DIAGNOSTIC, type Diagnostic, type IRegionNode } from '../../diagnostics/Diagnostic.js';
import { DiagnosticMessage } from '../../diagnostics/DiagnosticMessage.js';
import type { IDiagnosticConsumer } from '../../diagnostics/IDiagnosticConsumer.js';
import { Severity } from '../../diagnostics/Severity.js';
import type { INode } from '../../nodemodel/INode.js';
import { LinkingDiagnosticProducer } from './LinkingDiagnosticProducer.js';
import { XtextLinkingDiagnostic } from './XtextLinkingDiagnostic.js';

const plain: INode = { getStartLine: () => 12, getText: () => 't', getSemanticElement: () => null };
const region: IRegionNode = { ...plain, getOffset: () => 40, getLength: () => 3 };

describe('XtextLinkingDiagnostic', () => {
  it('exposes message, code, data and the start line of its node', () => {
    const d = new XtextLinkingDiagnostic(plain, 'm', 'c', ['d1']);
    expect([d.getMessage(), d.getCode(), d.getData(), d.getLine()]).toEqual(['m', 'c', ['d1'], 12]);
  });

  it('reads offset and length from a region node and defaults for a plain node', () => {
    const located = new XtextLinkingDiagnostic(region, 'm', null);
    const unlocated = new XtextLinkingDiagnostic(plain, 'm', null);
    expect([located.getOffset(), located.getLength()]).toEqual([40, 3]);
    expect([unlocated.getOffset(), unlocated.getLength()]).toEqual([0, 1]);
    expect(located.getData()).toEqual([]);
  });

  it('rejects a null node and null data (Java NullPointerException)', () => {
    expect(() => new XtextLinkingDiagnostic(null, 'm', null)).toThrow('node may not be null');
    expect(() => new XtextLinkingDiagnostic(plain, 'm', null, [null as unknown as string])).toThrow(
      'data may not contain null',
    );
  });

  it('compares message and node', () => {
    const d = new XtextLinkingDiagnostic(plain, 'm', 'c');
    expect(d.equals(d)).toBe(true);
    expect(d.equals(new XtextLinkingDiagnostic(plain, 'm', 'other'))).toBe(true);
    expect(d.equals(new XtextLinkingDiagnostic(plain, 'n', 'c'))).toBe(false);
    expect(d.equals(new XtextLinkingDiagnostic(region, 'm', 'c'))).toBe(false);
    expect(d.equals(null)).toBe(false);
    expect(d.equals('m')).toBe(false);
  });

  it('prints class, line and message', () => {
    expect(new XtextLinkingDiagnostic(plain, 'm', null).toString()).toBe('XtextLinkingDiagnostic: null:12 m');
  });
});

describe('LinkingDiagnosticProducer', () => {
  it('creates diagnostics at the current node with the message, code and data', () => {
    const consumed: [Diagnostic, Severity][] = [];
    const consumer: IDiagnosticConsumer = {
      consume: (d, s) => void consumed.push([d, s]),
      hasConsumedDiagnostics: () => false,
    };
    const producer = new LinkingDiagnosticProducer(consumer);
    producer.setNode(plain);

    producer.addDiagnostic(new DiagnosticMessage('boom', Severity.WARNING, LINKING_DIAGNOSTIC, ['x']));

    const [[diagnostic, severity]] = consumed as [[XtextLinkingDiagnostic, Severity]];
    expect([
      diagnostic.getMessage(),
      diagnostic.getCode(),
      diagnostic.getData(),
      diagnostic.getLine(),
      severity,
    ]).toEqual(['boom', LINKING_DIAGNOSTIC, ['x'], 12, Severity.WARNING]);
  });

  it('fails without a current node (Java NullPointerException)', () => {
    const producer = new LinkingDiagnosticProducer({ consume: () => undefined, hasConsumedDiagnostics: () => false });
    expect(() => producer.addDiagnostic(new DiagnosticMessage('m', Severity.ERROR, null))).toThrow(TypeError);
  });
});
