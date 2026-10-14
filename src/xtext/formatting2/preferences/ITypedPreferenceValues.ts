// SPDX-License-Identifier: EPL-2.0
import type { IPreferenceValues } from './IPreferenceValues.js';
import type { TypedPreferenceKey } from './TypedPreferenceKey.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/preferences/ITypedPreferenceValues.java */
export interface ITypedPreferenceValues extends IPreferenceValues {
  getTypedPreference<T>(key: TypedPreferenceKey<T>): T | null;
}
