// SPDX-License-Identifier: EPL-2.0
import type { IPreferenceValues } from './IPreferenceValues.js';
import type { ITypedPreferenceValues } from './ITypedPreferenceValues.js';
import type { PreferenceKey } from './PreferenceKey.js';
import type { TypedPreferenceKey } from './TypedPreferenceKey.js';

/**
 * Preference values backed by a map, with an optional delegate. `IPreferenceValuesProvider` and the
 * `getPreferenceValues(Resource)` method are not ported (no resource concept in the formatter flow).
 * The Java overloads `getPreference(PreferenceKey)` / `getPreference(TypedPreferenceKey)` are
 * `getPreference` / `getTypedPreference`; `put(PreferenceKey, Object)` / `put(String, String)` /
 * `put(TypedPreferenceKey, T)` are `putPreference` / `put` / `putTyped`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/preferences/MapBasedPreferenceValues.java
 */
export class MapBasedPreferenceValues implements ITypedPreferenceValues {
  private readonly delegate: IPreferenceValues | null;
  private readonly values: Map<string, string>;

  constructor(delegate: IPreferenceValues | null = null, values: Map<string, string> = new Map()) {
    this.delegate = delegate;
    this.values = values;
  }

  clear(): void {
    this.values.clear();
  }

  getDelegate(): IPreferenceValues | null {
    return this.delegate;
  }

  getPreference(key: PreferenceKey): string | null {
    const value = this.values.get(key.getId());
    if (value !== undefined) return value;
    if (this.delegate !== null) return this.delegate.getPreference(key);
    return key.getDefaultValue();
  }

  getTypedPreference<T>(key: TypedPreferenceKey<T>): T | null {
    return key.toValue(this.getPreference(key));
  }

  getValues(): ReadonlyMap<string, string> {
    return this.values;
  }

  putPreference(key: PreferenceKey, value: unknown): void {
    if (value === null || value === undefined) {
      this.values.delete(key.getId());
    } else {
      this.put(key.getId(), String(value));
    }
  }

  put(key: string, value: string | null): void {
    if (value === null) {
      this.values.delete(key);
    } else {
      this.values.set(key, value);
    }
  }

  putTyped<T>(key: TypedPreferenceKey<T>, value: T): void {
    this.put(key.getId(), key.valueToString(value));
  }
}
