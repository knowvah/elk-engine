// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import type { INode } from '../nodemodel/INode.js';
import type { EReferenceInfo } from '../scoping/EReferenceInfo.js';
import { AbstractDiagnostic } from './AbstractDiagnostic.js';
import { AbstractDiagnosticProducer } from './AbstractDiagnosticProducer.js';
import {
  isRegionNode,
  LINKING_DIAGNOSTIC,
  SYNTAX_DIAGNOSTIC,
  SYNTAX_DIAGNOSTIC_WITH_RANGE,
  type Diagnostic,
} from './Diagnostic.js';
import { DiagnosticMessage } from './DiagnosticMessage.js';
import type { IDiagnosticConsumer } from './IDiagnosticConsumer.js';
import { Severity } from './Severity.js';

class NodelessDiagnostic extends AbstractDiagnostic {
  protected override getNode(): INode | null {
    return null;
  }
  override getCode(): string | null {
    return null;
  }
  override getData(): readonly string[] {
    return [];
  }
  override getMessage(): string | null {
    return null;
  }
}

class RecordingProducer extends AbstractDiagnosticProducer {
  constructor(consumer: IDiagnosticConsumer) {
    super(consumer);
  }
  protected override createDiagnostic(message: DiagnosticMessage): Diagnostic {
    return { getMessage: () => message.getMessage(), getLine: () => 0, getOffset: () => 0, getLength: () => 0 };
  }
}

describe('diagnostic constants', () => {
  it('carry the Xtext issue codes', () => {
    expect([SYNTAX_DIAGNOSTIC, SYNTAX_DIAGNOSTIC_WITH_RANGE, LINKING_DIAGNOSTIC]).toEqual([
      'org.eclipse.xtext.diagnostics.Diagnostic.Syntax',
      'org.eclipse.xtext.diagnostics.Diagnostic.Syntax.Range',
      'org.eclipse.xtext.diagnostics.Diagnostic.Linking',
    ]);
  });

  it('tells region nodes from plain nodes', () => {
    const plain: INode = { getStartLine: () => 1, getText: () => '', getSemanticElement: () => null };
    expect(isRegionNode(plain)).toBe(false);
    const region: INode & { getOffset(): number; getLength(): number } = {
      ...plain,
      getOffset: () => 0,
      getLength: () => 0,
    };
    expect(isRegionNode(region)).toBe(true);
  });
});

describe('DiagnosticMessage', () => {
  it('holds message, severity, code and data', () => {
    const m = new DiagnosticMessage('m', Severity.WARNING, 'code', ['a', 'b']);
    expect([m.getMessage(), m.getSeverity(), m.getIssueCode(), m.getIssueData()]).toEqual([
      'm',
      Severity.WARNING,
      'code',
      ['a', 'b'],
    ]);
    expect(new DiagnosticMessage(null, Severity.ERROR, null).getIssueData()).toEqual([]);
  });

  it('rejects Severity.INFO', () => {
    expect(() => new DiagnosticMessage('m', Severity.INFO, null)).toThrow(IllegalArgumentException);
    expect(() => new DiagnosticMessage('m', Severity.INFO, null)).toThrow(
      'Severity INFO is not supported for diagnostic messages.',
    );
  });
});

describe('AbstractDiagnostic without a node', () => {
  it('reports the no-node defaults', () => {
    const d = new NodelessDiagnostic();
    expect([d.getOffset(), d.getLength(), d.getLine()]).toEqual([0, 1, -1]);
    expect(d.toString()).toBe('NodelessDiagnostic: null:-1 null');
  });
});

describe('AbstractDiagnosticProducer', () => {
  const consumed: [string | null, Severity][] = [];
  const consumer: IDiagnosticConsumer = {
    consume: (d, s) => void consumed.push([d.getMessage(), s]),
    hasConsumedDiagnostics: () => false,
  };

  it('hands created diagnostics and their severity to the consumer', () => {
    const producer = new RecordingProducer(consumer);
    producer.addDiagnostic(new DiagnosticMessage('m', Severity.ERROR, null));
    expect(consumed).toEqual([['m', Severity.ERROR]]);
  });

  it('keeps the current node and ignores targets', () => {
    const producer = new RecordingProducer(consumer);
    const node: INode = { getStartLine: () => 1, getText: () => '', getSemanticElement: () => null };
    expect(producer.getNode()).toBeNull();
    producer.setNode(node);
    producer.setTarget({} as EObject, {} as EReferenceInfo);
    expect(producer.getNode()).toBe(node);
  });

  it('rejects a null consumer', () => {
    expect(() => new RecordingProducer(null as unknown as IDiagnosticConsumer)).toThrow('consumer may not be null');
  });
});
