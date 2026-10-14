// SPDX-License-Identifier: EPL-2.0

/**
 * The only `EStructuralFeature` member the validation layer reads (decision D4 style): the feature
 * name. The port has no metamodel (D3), so a feature is identified by its name; the node model looks
 * features up by it. Features are compared by reference where Java compares them.
 *
 * @see org.eclipse.emf.ecore.EStructuralFeature
 */
export interface EStructuralFeature {
  getName(): string;
}

/**
 * Whether a value is a feature rather than an `EObject` (the two are told apart at run time where
 * Java overloads on the static type).
 *
 * @param value any value
 * @returns whether `value` has a feature name and no `eClass`
 */
export function isEStructuralFeature(value: unknown): value is EStructuralFeature {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { getName?: unknown }).getName === 'function' &&
    typeof (value as { eClass?: unknown }).eClass !== 'function'
  );
}
