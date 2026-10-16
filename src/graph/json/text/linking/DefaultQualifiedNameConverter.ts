// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import type { IQualifiedNameConverter } from '../../../../xtext/naming/IQualifiedNameConverter.js';
import { QualifiedName } from '../../../../xtext/naming/QualifiedName.js';
import { split } from '../../../../xtext/util/Strings.js';

const DELIMITER = '.';

/**
 * Xtext's `IQualifiedNameConverter.DefaultImpl`, which `ElkGraphJsonRuntimeModule` leaves bound (the `.elkt` module
 * binds its own converter): segments are separated by `.`, with no escaping. Port-local home: `src/xtext/naming`
 * has only the interface, and this bundle is its first consumer. `getDelimiter()` and its empty-delimiter arm are
 * not ported (the delimiter is never overridden).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/naming/IQualifiedNameConverter.java
 */
export class DefaultQualifiedNameConverter implements IQualifiedNameConverter {
  /** @throws IllegalArgumentException when the qualified name is `null` */
  toString(name: QualifiedName | null): string {
    if (name === null) {
      throw new IllegalArgumentException('Qualified name cannot be null');
    }
    return name.toString(DELIMITER);
  }

  /** @throws IllegalArgumentException if the input is empty or `null` */
  toQualifiedName(qualifiedNameAsText: string | null): QualifiedName {
    if (qualifiedNameAsText === null) {
      throw new IllegalArgumentException('Qualified name cannot be null');
    }
    if (qualifiedNameAsText.length === 0) {
      throw new IllegalArgumentException('Qualified name cannot be empty');
    }
    return QualifiedName.createFromList(split(qualifiedNameAsText, DELIMITER));
  }
}
