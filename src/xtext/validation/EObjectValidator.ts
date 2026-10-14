// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import { BasicDiagnostic } from './emf/BasicDiagnostic.js';
import { DiagnosticSeverity } from './emf/Diagnostic.js';
import type { DiagnosticChain } from './emf/DiagnosticChain.js';
import type { EValidator, ValidationContext } from './emf/EValidator.js';
import type { EStructuralFeature } from './EStructuralFeature.js';

/** The source of every diagnostic of EMF's `EObjectValidator`. */
export const DIAGNOSTIC_SOURCE = 'org.eclipse.emf.ecore';

/** The diagnostic code of a map entry whose key collides with an earlier one. */
export const EOBJECT__EVERY_MAP_ENTRY_UNIQUE = 14;

/** `MessageFormat` renders an `int` argument with the locale's grouping (`1,000`). */
const MESSAGE_FORMAT_LOCALE = 'en-US';

/**
 * One map-typed containment feature of an object (EMF finds these through the metamodel: features
 * whose type has the instance class `java.util.Map$Entry`). The port has no metamodel (D3), so the
 * language supplies them.
 */
export interface MapEntryFeature {
  readonly feature: EStructuralFeature;
  size(): number;
  entryAt(index: number): unknown;
  keyAt(index: number): unknown;
  /** `EMap.indexOfKey`: the index of the first entry whose key equals `key`. */
  indexOfKey(key: unknown): number;
}

/** The map-typed features of an object, in feature order (empty for classes without any). */
export type MapEntryFeatureProvider = (eObject: EObject) => readonly MapEntryFeature[];

/**
 * The subset of EMF's `EObjectValidator` that can report something for an ElkGraph model. Xtext's
 * composite always runs it, and EMF runs `validate_EveryDefaultConstraint` once per object.
 * Decided per constraint against `elkgraph.ecore` and the objects the parser and `ElkGraphUtil`
 * build:
 *
 * - `validate_EveryMapEntryUnique` can fire (duplicate keys in `properties`, code 14) and is ported.
 * - `validate_EveryMultiplicityConforms` cannot: `lowerBound=1` occurs only on primitive doubles,
 *   whose `eGet` is never null, and no many-valued feature has a lower or a finite upper bound.
 * - `validate_EveryProxyResolves` cannot: the port has no proxies and failed references stay unset.
 * - `validate_NoCircularContainment` cannot: containment is a tree by construction (parser and
 *   `ElkGraphUtil` attach each object once), and Xtext's composite disables it anyway.
 * - `validate_EveryReferenceIsContained` cannot: every cross-reference target is resolved inside
 *   the one resource, so its `eResource()` is never null.
 * - `validate_EveryBidirectionalReferenceIsPaired` cannot: every opposite pair is maintained by
 *   the generated `eInverseAdd`/`eInverseRemove`, so both ends always agree.
 * - `validate_EveryDataValueConforms` cannot: the attribute types are `EString`, `EDouble`,
 *   `EBoolean`, `IProperty` and `Object` without facets, and the parser stores matching values.
 * - `validate_UniqueID` and `validate_EveryKeyUnique` cannot: the ecore has no ID attribute and
 *   no `eKeys`.
 * - the delegated invariants and constraints of `DynamicEClassValidator` cannot: the ecore declares
 *   no validation delegate.
 *
 * @see org.eclipse.emf.ecore/src/org/eclipse/emf/ecore/util/EObjectValidator.java
 */
export class EObjectValidator implements EValidator {
  readonly #mapEntryFeatures: MapEntryFeatureProvider;

  constructor(mapEntryFeatures: MapEntryFeatureProvider) {
    this.#mapEntryFeatures = mapEntryFeatures;
  }

  /** `validate(EClass, ...)` through `DynamicEClassValidator`: the super type chain ends at the default constraints. */
  validate(_eClass: EClass, eObject: EObject, diagnostics: DiagnosticChain, context: ValidationContext): boolean {
    return this.validate_EveryDefaultConstraint(eObject, diagnostics, context);
  }

  validate_EveryDefaultConstraint(eObject: EObject, diagnostics: DiagnosticChain, context: ValidationContext): boolean {
    return this.validate_EveryMapEntryUnique(eObject, diagnostics, context);
  }

  validate_EveryMapEntryUnique(eObject: EObject, diagnostics: DiagnosticChain, context: ValidationContext): boolean {
    let result = true;
    for (const mapFeature of this.#mapEntryFeatures(eObject)) {
      const unique = this.validate_MapEntryUnique(eObject, mapFeature, diagnostics, context);
      result = result && unique;
    }
    return result;
  }

  protected validate_MapEntryUnique(
    eObject: EObject,
    mapFeature: MapEntryFeature,
    diagnostics: DiagnosticChain,
    _context: ValidationContext,
  ): boolean {
    let result = true;
    for (let i = 0, size = mapFeature.size(); i < size; ++i) {
      const index = mapFeature.indexOfKey(mapFeature.keyAt(i));
      if (index !== i) {
        result = false;
        diagnostics.add(this.#duplicateEntryDiagnostic(eObject, mapFeature, i, index));
      }
    }
    return result;
  }

  #duplicateEntryDiagnostic(eObject: EObject, mapFeature: MapEntryFeature, i: number, index: number): BasicDiagnostic {
    // _UI_DuplicateMapEntry_diagnostic of EMF's plugin.properties
    const message =
      `The feature '${mapFeature.feature.getName()}' has a map entry at index ${i.toLocaleString(MESSAGE_FORMAT_LOCALE)}` +
      ` with a key that collides with that of the map entry at index ${index.toLocaleString(MESSAGE_FORMAT_LOCALE)}`;
    return new BasicDiagnostic(DiagnosticSeverity.ERROR, DIAGNOSTIC_SOURCE, EOBJECT__EVERY_MAP_ENTRY_UNIQUE, message, [
      eObject,
      mapFeature.feature,
      mapFeature.entryAt(i),
      mapFeature.entryAt(index),
    ]);
  }
}
