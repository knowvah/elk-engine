// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { MapEntryFeature, MapEntryFeatureProvider } from '../../../../xtext/validation/EObjectValidator.js';
import type { EStructuralFeature } from '../../../../xtext/validation/EStructuralFeature.js';
import { isEMapPropertyHolder } from '../../../EMapPropertyHolder.js';
import type { IProperty } from '../../../properties/IProperty.js';

const PROPERTIES_FEATURE: EStructuralFeature = { getName: () => 'properties' };

/**
 * The map-typed features of an ElkGraph object for EMF's map-entry uniqueness constraint (`EObjectValidator.14`): the
 * `properties` of every property holder (EMF finds them through the metamodel, which the port does not have). Keys
 * are equal when their ids are (`IProperty` equality).
 */
export const elkGraphJsonMapEntryFeatures: MapEntryFeatureProvider = (eObject: EObject): readonly MapEntryFeature[] => {
  if (!isEMapPropertyHolder(eObject)) {
    return [];
  }
  const entries = eObject.getProperties().entryList();
  const idAt = (index: number): string | undefined => entries.get(index).getKey()?.getId();
  return [
    {
      feature: PROPERTIES_FEATURE,
      size: () => entries.size(),
      entryAt: (index) => entries.get(index),
      keyAt: (index) => entries.get(index).getKey(),
      indexOfKey: (key) => {
        const id = (key as IProperty<unknown>).getId();
        for (let i = 0, size = entries.size(); i < size; ++i) {
          if (idAt(i) === id) {
            return i;
          }
        }
        return -1;
      },
    },
  ];
};
