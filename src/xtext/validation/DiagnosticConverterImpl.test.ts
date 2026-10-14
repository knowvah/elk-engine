// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import { Severity } from '../diagnostics/Severity.js';
import { DiagnosticConverterImpl } from './DiagnosticConverterImpl.js';
import { BasicDiagnostic } from './emf/BasicDiagnostic.js';
import { DiagnosticSeverity } from './emf/Diagnostic.js';
import { type EStructuralFeature, isEStructuralFeature } from './EStructuralFeature.js';
import { FeatureBasedDiagnostic } from './FeatureBasedDiagnostic.js';
import type { Issue } from './Issue.js';
import type { ContainmentSlot, IssueLocator } from './IssueLocator.js';

class Node implements EObject {
  constructor(
    readonly id: string,
    readonly parent: Node | null = null,
  ) {}
  eClass(): EClass {
    return { getName: () => 'Node' };
  }
  eContainer(): EObject | null {
    return this.parent;
  }
  eContents(): never {
    throw new Error('unused');
  }
  eAllContents(): IterableIterator<EObject> {
    throw new Error('unused');
  }
}

const LIST: EStructuralFeature = { getName: () => 'list' };
const LINES = new Map<string, number>([['top', 3]]);

const locator: IssueLocator = {
  objectStartLine: (obj) => LINES.get((obj as Node).id) ?? null,
  featureStartLines: (obj, name) => (name === 'list' && (obj as Node).id === 'top' ? [10, 11] : []),
  containingSlot: (): ContainmentSlot => ({ feature: LIST, index: 1 }),
};

function fbd(
  object: EObject,
  feature: EStructuralFeature | null,
  index: number,
  code: string | null,
  issueData: readonly string[],
  severity: number = DiagnosticSeverity.ERROR,
): FeatureBasedDiagnostic {
  return new FeatureBasedDiagnostic(severity, 'm', { object, feature, index }, null, { code, issueData });
}

function convert(diagnostic: BasicDiagnostic | FeatureBasedDiagnostic): Issue[] {
  const issues: Issue[] = [];
  new DiagnosticConverterImpl().convertValidatorDiagnostic(diagnostic, locator, (i) => issues.push(i));
  return issues;
}

describe('DiagnosticConverterImpl', () => {
  it('converts an EMF diagnostic: code is source.code, feature is data[1], strings are kept', () => {
    const top = new Node('top');

    const [issue] = convert(
      new BasicDiagnostic(DiagnosticSeverity.ERROR, 'org.eclipse.emf.ecore', 14, 'm', [top, LIST, 'text', 7]),
    );

    expect(issue).toEqual({
      severity: Severity.ERROR,
      message: 'm',
      code: 'org.eclipse.emf.ecore.14',
      data: ['text'],
      lineNumber: 10,
      syntaxError: false,
    });
  });

  it('maps OK to nothing, and INFO, WARNING and CANCEL to their issue severities', () => {
    const severities = [
      DiagnosticSeverity.OK,
      DiagnosticSeverity.INFO,
      DiagnosticSeverity.WARNING,
      DiagnosticSeverity.ERROR,
      DiagnosticSeverity.CANCEL,
    ].flatMap((s) => convert(new BasicDiagnostic(s, 'src', 0, 'm')).map((i) => i.severity));

    expect(severities).toEqual([Severity.INFO, Severity.WARNING, Severity.ERROR, Severity.ERROR]);
  });

  it('has line 0 and no data for a diagnostic without a causer', () => {
    const [issue] = convert(new BasicDiagnostic(DiagnosticSeverity.ERROR, 'src', 3, 'm', [new RangeError('x')]));

    expect(issue).toMatchObject({ lineNumber: 0, code: 'src.3', data: [] });
  });

  it('uses the object line when the data carries no feature', () => {
    const [issue] = convert(new BasicDiagnostic(DiagnosticSeverity.ERROR, 'src', 0, 'm', [new Node('top'), 5]));

    expect(issue?.lineNumber).toBe(3);
  });

  it('locates a node-less object through its container and its slot', () => {
    const top = new Node('top');
    const child = new Node('child', top);
    const grandchild = new Node('grandchild', child);

    const lines = [child, grandchild].map((o) => convert(fbd(o, null, -1, null, []))[0]?.lineNumber);

    expect(lines).toEqual([11, 11]);
  });

  it('has line 0 for a node-less object without a container', () => {
    const lonely = new Node('lonely');

    const [issue] = convert(fbd(lonely, LIST, 0, 'C', ['d']));

    expect(issue).toMatchObject({ lineNumber: 0, code: 'C', data: ['d'] });
  });

  it('takes the feature value at the index and falls back to the object line', () => {
    const top = new Node('top');
    const at = (index: number): number | undefined =>
      convert(fbd(top, LIST, index, null, [], DiagnosticSeverity.WARNING))[0]?.lineNumber;

    expect([at(-1), at(0), at(1), at(2)]).toEqual([10, 10, 11, 3]);
  });

  it('converts resource diagnostics with their flags', () => {
    const issues: Issue[] = [];

    new DiagnosticConverterImpl().convertResourceDiagnostic(
      { message: 'bad', line: 4, syntax: true },
      Severity.ERROR,
      (i) => issues.push(i),
    );

    expect(issues).toEqual([
      { severity: Severity.ERROR, message: 'bad', code: null, data: [], lineNumber: 4, syntaxError: true },
    ]);
  });
});

describe('isEStructuralFeature', () => {
  it('accepts a feature and rejects objects and primitives', () => {
    expect([
      isEStructuralFeature(LIST),
      isEStructuralFeature(new Node('n')),
      isEStructuralFeature(null),
      isEStructuralFeature(4),
    ]).toEqual([true, false, false, false]);
  });
});
