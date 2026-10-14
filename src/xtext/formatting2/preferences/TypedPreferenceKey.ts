// SPDX-License-Identifier: EPL-2.0
import { PreferenceKey } from './PreferenceKey.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/preferences/TypedPreferenceKey.java */
export abstract class TypedPreferenceKey<T> extends PreferenceKey {
  /** The Java `toString(T)` overload: renamed because it would clash with `Object.toString()`. */
  abstract valueToString(value: T): string | null;

  abstract toValue(string: string | null): T | null;
}
