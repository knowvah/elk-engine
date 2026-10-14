// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import { Severity } from '../diagnostics/Severity.js';
import { AbstractValidationDiagnostic } from './AbstractValidationDiagnostic.js';
import { type Diagnostic, DiagnosticSeverity } from './emf/Diagnostic.js';
import { type EStructuralFeature, isEStructuralFeature } from './EStructuralFeature.js';
import { FeatureBasedDiagnostic } from './FeatureBasedDiagnostic.js';
import type { Issue, ResourceDiagnostic } from './Issue.js';
import type { IssueLocator } from './IssueLocator.js';

/** The line of an issue with no location: Java's empty `IssueLocation`. */
const NO_LINE = 0;

/** Receives each converted issue. */
export type IssueAcceptor = (issue: Issue) => void;

/**
 * Converts resource and validator diagnostics into issues. Reduced to what the ELK validator
 * reaches: `FeatureBasedDiagnostic`s and EMF's own diagnostics (the `RangeBasedDiagnostic` variant is
 * not ported). Locations shrink to the start line. The issue data of a foreign diagnostic keeps its
 * strings only: Java also adds the URIs of referenced `EObject`s (`EcoreUtil.getURI`), which the port
 * has no resource to compute, and no recorded vector pins them.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/DiagnosticConverterImpl.java
 */
export class DiagnosticConverterImpl {
  convertResourceDiagnostic(diagnostic: ResourceDiagnostic, severity: Severity, acceptor: IssueAcceptor): void {
    acceptor({
      severity,
      message: diagnostic.message,
      code: diagnostic.code ?? null,
      data: diagnostic.data ?? [],
      lineNumber: diagnostic.line,
      syntaxError: diagnostic.syntax,
    });
  }

  convertValidatorDiagnostic(diagnostic: Diagnostic, locator: IssueLocator, acceptor: IssueAcceptor): void {
    const severity = this.getSeverity(diagnostic);
    if (severity === null) {
      return;
    }
    acceptor({
      severity,
      message: diagnostic.getMessage(),
      code: this.getIssueCode(diagnostic),
      data: this.getIssueData(diagnostic),
      lineNumber: this.getLineNumber(diagnostic, locator),
      syntaxError: false,
    });
  }

  protected getIssueCode(diagnostic: Diagnostic): string | null {
    if (diagnostic instanceof AbstractValidationDiagnostic) {
      return diagnostic.getIssueCode();
    }
    return `${diagnostic.getSource()}.${String(diagnostic.getCode())}`;
  }

  protected getIssueData(diagnostic: Diagnostic): readonly string[] {
    if (diagnostic instanceof AbstractValidationDiagnostic) {
      return diagnostic.getIssueData();
    }
    return diagnostic.getData().filter((datum): datum is string => typeof datum === 'string');
  }

  /** `null` for an `OK` diagnostic; anything above `INFO` and `WARNING` is an error. */
  protected getSeverity(diagnostic: Diagnostic): Severity | null {
    switch (diagnostic.getSeverity()) {
      case DiagnosticSeverity.OK:
        return null;
      case DiagnosticSeverity.WARNING:
        return Severity.WARNING;
      case DiagnosticSeverity.INFO:
        return Severity.INFO;
      default:
        return Severity.ERROR;
    }
  }

  /** The causer is the first data element (see `Diagnostician.getData`). */
  protected getCauser(diagnostic: Diagnostic): EObject | null {
    const causer = diagnostic.getData()[0];
    return isEObject(causer) ? causer : null;
  }

  protected getLineNumber(diagnostic: Diagnostic, locator: IssueLocator): number {
    const causer = this.getCauser(diagnostic);
    if (causer === null) {
      return NO_LINE;
    }
    if (diagnostic instanceof FeatureBasedDiagnostic) {
      return this.getLocationData(causer, diagnostic.getFeature(), diagnostic.getIndex(), locator);
    }
    // the feature is the second data element
    const feature = diagnostic.getData()[1];
    return this.getLocationData(causer, isEStructuralFeature(feature) ? feature : null, 0, locator);
  }

  /**
   * The node of the object, narrowed to the node of the feature value at `index` (an insignificant
   * index counts as 0). An object without a node is located through its container and the feature
   * it sits in; with no container the location is empty.
   */
  protected getLocationData(
    start: EObject,
    startFeature: EStructuralFeature | null,
    startIndex: number,
    locator: IssueLocator,
  ): number {
    let obj = start;
    let feature = startFeature;
    let index = startIndex;
    for (;;) {
      const objectLine = locator.objectStartLine(obj);
      if (objectLine !== null) {
        return this.narrowToFeature(objectLine, obj, feature, index, locator);
      }
      const container = obj.eContainer();
      if (container === null) {
        return NO_LINE;
      }
      const slot = locator.containingSlot(obj);
      obj = container;
      feature = slot.feature;
      index = slot.index;
    }
  }

  private narrowToFeature(
    objectLine: number,
    obj: EObject,
    feature: EStructuralFeature | null,
    index: number,
    locator: IssueLocator,
  ): number {
    if (feature === null) {
      return objectLine;
    }
    const lines = locator.featureStartLines(obj, feature.getName());
    const position = index < 0 ? 0 : index;
    return lines.length > position ? (lines[position] as number) : objectLine;
  }
}

function isEObject(value: unknown): value is EObject {
  return typeof value === 'object' && value !== null && typeof (value as { eClass?: unknown }).eClass === 'function';
}
