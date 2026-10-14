// SPDX-License-Identifier: EPL-2.0

/**
 * What Xtext reads from an `EClass` when it filters by reference type
 * (`EcoreUtil2.isAssignableFrom(type, eClass)`). The TS `EObject` has no metamodel (mission-2
 * D4), so the language supplies this facade; classes are named by their `EClass.getName()`.
 * Port-local: there is no Java counterpart.
 */
export interface EClassRef {
  readonly name: string;
  /** Whether an object of the class `eClassName` may be the target of the reference. */
  isAssignableFrom(eClassName: string): boolean;
}

/**
 * What Xtext reads from an `EReference`: its type for the scope filter, and the flags the linking
 * service tests before resolving a reference. Port-local: there is no Java counterpart.
 */
export interface EReferenceInfo {
  readonly name: string;
  readonly referenceType: EClassRef;
  readonly upperBound: number;
  readonly unique: boolean;
  readonly containment: boolean;
  readonly container: boolean;
  readonly derived: boolean;
  readonly changeable: boolean;
  readonly transient: boolean;
}
