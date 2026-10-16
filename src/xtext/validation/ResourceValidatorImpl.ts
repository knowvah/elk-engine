// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import { Severity } from '../diagnostics/Severity.js';
import { LazyLinkingResource } from '../linking/lazy/LazyLinkingResource.js';
import { CheckMode } from './CheckMode.js';
import { CheckType } from './CheckType.js';
import type { ErrorLog } from './CompositeEValidator.js';
import type { Diagnostician } from './Diagnostician.js';
import type { DiagnosticConverterImpl } from './DiagnosticConverterImpl.js';
import type { Issue, ResourceDiagnostic, ResourceDiagnostics } from './Issue.js';
import type { IssueLocator } from './IssueLocator.js';

/**
 * Validates a loaded resource: its load diagnostics first (errors, then warnings), then the
 * validator diagnostics of each content root. A failure while validating one root is logged and
 * dropped together with all issues of that root, as in Java. Reduced: `resolveProxies` resolves only a
 * `LazyLinkingResource` (`EcoreUtil2.resolveLazyCrossReferences`; any other resource is already linked eagerly) and
 * is passed no cancel indicator, otherwise cancellation is dropped, the Xtext language name and the concrete-syntax
 * validator option are not needed (concrete-syntax validation is not ported), and Java's
 * `Resource` is the pair of its contents and its load diagnostics.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/ResourceValidatorImpl.java
 */
export class ResourceValidatorImpl {
  readonly #diagnostician: Diagnostician;
  readonly #converter: DiagnosticConverterImpl;
  readonly #logError: ErrorLog;

  /**
   * @param diagnostician the EMF traversal
   * @param converter turns diagnostics into issues
   * @param logError receives a swallowed failure (Java: `log.error`)
   */
  constructor(diagnostician: Diagnostician, converter: DiagnosticConverterImpl, logError: ErrorLog) {
    this.#diagnostician = diagnostician;
    this.#converter = converter;
    this.#logError = logError;
  }

  /**
   * @param contents the content roots of the resource (`Resource.getContents()`)
   * @param resourceDiagnostics the load diagnostics (`getErrors()`, `getWarnings()`)
   * @param mode which check types to run
   * @param locator the node-model lookups behind the issue lines
   * @param resource the resource whose lazy cross references are resolved first (`resolveProxies`); when it is a
   *   `LazyLinkingResource`, `resourceDiagnostics` must read its live error and warning lists, as Java does
   * @returns the issues in emission order
   */
  validate(
    contents: readonly EObject[],
    resourceDiagnostics: ResourceDiagnostics,
    mode: CheckMode,
    locator: IssueLocator,
    resource: object | null = null,
  ): Issue[] {
    const result: Issue[] = [];
    const acceptor = (issue: Issue): void => {
      result.push(issue);
    };
    this.resolveProxies(resource);
    try {
      if (mode.shouldCheck(CheckType.FAST)) {
        this.collectResourceDiagnostics(resourceDiagnostics, acceptor);
      }
      for (const element of contents) {
        this.validateElement(element, mode, locator, acceptor);
      }
    } catch (e) {
      this.#logError('Error validating resource', e);
    }
    return result;
  }

  /** @see org.eclipse.xtext/src/org/eclipse/xtext/validation/ResourceValidatorImpl.java#resolveProxies(Resource) */
  protected resolveProxies(resource: object | null): void {
    if (resource instanceof LazyLinkingResource) {
      resource.resolveLazyCrossReferences(null);
    }
  }

  protected collectResourceDiagnostics(
    resourceDiagnostics: ResourceDiagnostics,
    acceptor: (issue: Issue) => void,
  ): void {
    const batches: ReadonlyArray<readonly [readonly ResourceDiagnostic[], Severity]> = [
      [resourceDiagnostics.errors, Severity.ERROR],
      [resourceDiagnostics.warnings, Severity.WARNING],
    ];
    for (const [diagnostics, severity] of batches) {
      for (const diagnostic of diagnostics) {
        this.#converter.convertResourceDiagnostic(diagnostic, severity, acceptor);
      }
    }
  }

  protected validateElement(
    element: EObject,
    mode: CheckMode,
    locator: IssueLocator,
    acceptor: (issue: Issue) => void,
  ): void {
    try {
      const diagnostic = this.#diagnostician.validate(element, new Map<unknown, unknown>([[CheckMode.KEY, mode]]));
      const children = diagnostic.getChildren();
      for (const reported of children.length > 0 ? children : [diagnostic]) {
        this.#converter.convertValidatorDiagnostic(reported, locator, acceptor);
      }
    } catch (e) {
      this.#logError('Error validating element', e);
    }
  }
}
