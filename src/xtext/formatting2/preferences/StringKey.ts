// SPDX-License-Identifier: EPL-2.0
import { TypedPreferenceKey } from './TypedPreferenceKey.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/preferences/StringKey.java */
export class StringKey extends TypedPreferenceKey<string> {
  valueToString(value: string): string | null {
    return value;
  }

  toValue(string: string | null): string | null {
    return string;
  }
}
