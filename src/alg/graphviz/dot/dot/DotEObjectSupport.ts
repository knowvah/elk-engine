// SPDX-License-Identifier: EPL-2.0
import { BasicEList } from '../../../../emf/common/util/BasicEList.js';
import type { EList } from '../../../../emf/common/util/EList.js';
import type { EClass } from '../../../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';

/**
 * The parts of EMF's `MinimalEObjectImpl.Container` that the six root classes of the DOT model
 * (`GraphvizModelImpl`, `GraphImpl`, `StatementImpl`, `NodeImpl`, `EdgeTargetImpl`, `PortImpl`) share and
 * `src/emf`'s `BasicEObjectImpl` does not supply. Port-local helpers, not a Java class.
 */

/** The package of the generated implementation classes, for `getClass().getName()`. */
const DOT_IMPL_PACKAGE = 'org.eclipse.elk.alg.graphviz.dot.dot.impl.';

/** The suffix EMF's generator gives an implementation class. */
const IMPL_SUFFIX = 'Impl';

/**
 * Java `getClass().getName()` of a DOT object: the generated impl class of its `EClass`.
 *
 * @internal
 */
export function implClassName(eClass: EClass): string {
  return `${DOT_IMPL_PACKAGE}${eClass.getName()}${IMPL_SUFFIX}`;
}

/**
 * What a feature id outside the generated `switch` reaches: EMF's `BasicEObjectImpl` goes to the dynamic
 * feature path (`eGet`, `eIsSet`) or the metamodel (`eBasicRemoveFromContainerFeature`), neither ported, so
 * the port throws, as `BasicEObjectImpl.eInverseAdd` does for the same case.
 *
 * @internal
 */
export function noGeneratedCase(method: string, featureID: number): UnsupportedOperationException {
  return new UnsupportedOperationException(`${method}: no generated case for feature ${featureID}`);
}

/**
 * A single-valued containment reference as one entry of `eContainmentFeatures()`: EMF's `eContents()` lists
 * a set single-valued containment and skips an unset one.
 *
 * @internal
 */
export function singleContainment(value: InternalEObject | null): EList<InternalEObject> {
  const list = new BasicEList<InternalEObject>();
  if (value !== null) list.add(value);
  return list;
}
