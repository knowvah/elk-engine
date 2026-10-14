// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { valueOf } from '../../../java/lang/JavaInteger.js';
import { NumberFormatException } from '../../../java/lang/NumberFormatException.js';
import { TypedPreferenceKey } from './TypedPreferenceKey.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/preferences/IntegerKey.java */
export class IntegerKey extends TypedPreferenceKey<number> {
  constructor(id: string, defaultValue: number | null) {
    super(id, defaultValue !== null ? String(defaultValue) : null);
  }

  valueToString(value: number): string | null {
    return String(value);
  }

  toValue(string: string | null): number | null {
    try {
      if (string !== null) {
        return valueOf(string);
      }
      return null;
    } catch (e) {
      if (e instanceof NumberFormatException) {
        const failure = new IllegalArgumentException(`${string} is not a valid integer preference value`);
        failure.cause = e;
        throw failure;
      }
      throw e;
    }
  }
}
