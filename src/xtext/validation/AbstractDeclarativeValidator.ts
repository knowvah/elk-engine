// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { Severity } from '../diagnostics/Severity.js';
import { DEFAULT_CHECK_TYPE } from './Check.js';
import { CheckMode } from './CheckMode.js';
import type { CheckType } from './CheckType.js';
import { DiagnosticSeverity } from './emf/Diagnostic.js';
import type { DiagnosticChain } from './emf/DiagnosticChain.js';
import type { EValidator, ValidationContext } from './emf/EValidator.js';
import { FeatureBasedDiagnostic } from './FeatureBasedDiagnostic.js';
import { GuardException } from './GuardException.js';
import { type MessageArgs, resolveMessageArgs } from './MessageArguments.js';
import type { IssueDetails, IssueTarget, ValidationMessageAcceptor } from './ValidationMessageAcceptor.js';

/** Java's static `guardException`: one instance, thrown by every `guard`/`checkDone`. */
const GUARD_EXCEPTION = new GuardException();

/** One registered check: the type guard standing for the Java parameter type, the method, its type. */
interface RegisteredCheck {
  readonly guard: (object: EObject) => boolean;
  readonly check: (object: never) => void;
  readonly checkType: CheckType;
}

/**
 * The per-run validation state (Java keeps it in a `ThreadLocal`; the port is single-threaded).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/AbstractDeclarativeValidator.java
 */
export class State {
  chain: DiagnosticChain | null = null;
  currentObject: EObject | null = null;
  checkMode: CheckMode | null = null;
  currentCheckType: CheckType | null = null;
  hasErrors = false;
  context: ValidationContext | null = null;
}

/** The root of the containment tree: Java compares `eResource()`, which is the root here (T8 rule). */
function rootOf(object: EObject): EObject {
  let root = object;
  for (let next = root.eContainer(); next !== null; next = root.eContainer()) {
    root = next;
  }
  return root;
}

/**
 * A validator whose checks are registered explicitly. Java discovers `@Check` methods by
 * reflection (`collectMethods`, `MethodWrapper`, `methodsForType`); here a subclass calls
 * {@link addCheck} in its constructor, passing a type guard for the declared parameter type
 * (`isMatching`). Per object the checks run in registration order; Java's `getDeclaredMethods`
 * order is unspecified, and the recorded vectors sort issues by (line, severity, code, message), so
 * they do not pin it. `AbstractInjectableValidator` is merged in: the language-name responsibility
 * test is always true (one language, `.elkt`), and `register`/`getEPackages` are replaced by
 * `EValidatorRegistrar`. Not ported (never reached by the ELK validator): the `info`, `addIssue*`
 * and offset/length (`RangeBasedDiagnostic`) families, `ComposedChecks`, `StateAccess`, the
 * `getCurrentObject`-style protected getters and the cancel indicator.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/AbstractDeclarativeValidator.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/AbstractInjectableValidator.java
 */
export abstract class AbstractDeclarativeValidator implements EValidator, ValidationMessageAcceptor {
  readonly #checks: RegisteredCheck[] = [];
  #state: State | null = null;

  /**
   * Registers a check for objects accepted by `guard`.
   *
   * @param guard the type guard standing for the Java parameter type
   * @param check the check, bound to this validator by the caller
   * @param type the check type, `FAST` by default (the `@Check` default)
   */
  protected addCheck<T extends EObject>(
    guard: (object: EObject) => object is T,
    check: (object: T) => void,
    type: CheckType = DEFAULT_CHECK_TYPE,
  ): void {
    this.#checks.push({ guard, check: check as (object: never) => void, checkType: type });
  }

  /**
   * Runs every registered check whose guard accepts the object, then reports whether none
   * reported an error.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/AbstractInjectableValidator.java
   */
  validate(_eClass: EClass, eObject: EObject, diagnostics: DiagnosticChain, context: ValidationContext): boolean {
    const state = new State();
    state.chain = diagnostics;
    state.currentObject = eObject;
    state.checkMode = CheckMode.getCheckMode(context);
    state.context = context;
    for (const registered of this.#checks) {
      if (registered.guard(eObject)) {
        this.#invoke(registered, state);
      }
    }
    return !state.hasErrors;
  }

  /** `MethodWrapper.invoke`. @throws IllegalStateException if another run's state is active */
  #invoke(registered: RegisteredCheck, state: State): void {
    const instanceState = this.#state;
    if (instanceState !== null && instanceState !== state) {
      throw new IllegalStateException('State is already assigned.');
    }
    const wasNull = instanceState === null;
    if (wasNull) {
      this.#state = state;
    }
    try {
      if (!(state.checkMode as CheckMode).shouldCheck(registered.checkType)) {
        return;
      }
      state.currentCheckType = registered.checkType;
      try {
        registered.check(state.currentObject as never);
      } catch (targetException) {
        this.handleExceptionDuringValidation(targetException);
      }
    } finally {
      if (wasNull) {
        this.#state = null;
      }
    }
  }

  protected warning(message: string, ...args: MessageArgs): void {
    const { target, details } = resolveMessageArgs(this.#requireState().currentObject as EObject, args);
    this.getMessageAcceptor().acceptWarning(message, target, details);
  }

  protected error(message: string, ...args: MessageArgs): void {
    const { target, details } = resolveMessageArgs(this.#requireState().currentObject as EObject, args);
    this.getMessageAcceptor().acceptError(message, target, details);
  }

  /** Ends the current check silently unless the expression holds. */
  protected guard(guardExpression: boolean): void {
    if (!guardExpression) {
      throw GUARD_EXCEPTION;
    }
  }

  /** Ends the current check silently. */
  protected checkDone(): never {
    throw GUARD_EXCEPTION;
  }

  acceptError(message: string, target: IssueTarget, details: IssueDetails): void {
    this.checkIsFromCurrentlyCheckedResource(target.object);
    this.#requireState().hasErrors = true;
    this.#add(Severity.ERROR, message, target, details);
  }

  acceptWarning(message: string, target: IssueTarget, details: IssueDetails): void {
    this.checkIsFromCurrentlyCheckedResource(target.object);
    this.#add(Severity.WARNING, message, target, details);
  }

  acceptInfo(message: string, target: IssueTarget, details: IssueDetails): void {
    this.checkIsFromCurrentlyCheckedResource(target.object);
    this.#add(Severity.INFO, message, target, details);
  }

  /**
   * Only objects of the resource under validation may carry issues; the resource of an object is
   * its root container (the T8 resource rule). The Java message names both resource URIs, which
   * the port does not have; the roots stand in.
   *
   * @throws IllegalArgumentException if the object belongs to another containment tree
   */
  protected checkIsFromCurrentlyCheckedResource(object: EObject | null): void {
    const current = this.#state?.currentObject ?? null;
    if (object !== null && current !== null && rootOf(object) !== rootOf(current)) {
      throw new IllegalArgumentException(
        `You can only add issues for EObjects contained in the currently validated resource '${String(rootOf(current))}'. ` +
          `But the given EObject was contained in '${String(rootOf(object))}'`,
      );
    }
  }

  getMessageAcceptor(): ValidationMessageAcceptor {
    return this;
  }

  /**
   * Swallows `GuardException`s and null dereferences (Java `NullPointerException`, a `TypeError`
   * here: D10) as ELK relies on (`ElkGraphValidator.checkAlgorithmSupport` dereferences a null
   * algorithm); rethrows everything else.
   */
  protected handleExceptionDuringValidation(targetException: unknown): void {
    if (!(targetException instanceof GuardException) && !(targetException instanceof TypeError)) {
      throw targetException;
    }
  }

  #add(severity: Severity, message: string, target: IssueTarget, details: IssueDetails): void {
    const state = this.#requireState();
    const diagnostic = new FeatureBasedDiagnostic(
      this.#toDiagnosticSeverity(severity),
      message,
      target,
      state.currentCheckType,
      details,
    );
    (state.chain as DiagnosticChain).add(diagnostic);
  }

  #toDiagnosticSeverity(severity: Severity): number {
    switch (severity) {
      case Severity.ERROR:
        return DiagnosticSeverity.ERROR;
      case Severity.WARNING:
        return DiagnosticSeverity.WARNING;
      case Severity.INFO:
        return DiagnosticSeverity.INFO;
      default:
        throw new IllegalArgumentException(`Unknow severity ${severity.toString()}`);
    }
  }

  /** Java `state.get()`: outside a validation run the dereference fails (`TypeError`, D10). */
  #requireState(): State {
    if (this.#state === null) {
      throw new TypeError('no validation run in progress');
    }
    return this.#state;
  }
}
