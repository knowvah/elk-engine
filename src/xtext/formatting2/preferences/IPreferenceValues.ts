// SPDX-License-Identifier: EPL-2.0
import type { PreferenceKey } from './PreferenceKey.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/preferences/IPreferenceValues.java */
export interface IPreferenceValues {
  getPreference(key: PreferenceKey): string | null;
}
