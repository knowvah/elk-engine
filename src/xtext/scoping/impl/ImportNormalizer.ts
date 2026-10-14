// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { add, mul } from '../../../java/lang/Int32.js';
import { QualifiedName } from '../../naming/QualifiedName.js';

const EMPTY_NAMESPACE_MESSAGE = 'Imported namespace must not be null / empty';
const WILDCARD_SUFFIX = '.*';
const HASH_PRIME = 31;
const BOOLEAN_TRUE_HASH = 1231;
const BOOLEAN_FALSE_HASH = 1237;

/**
 * `String.equalsIgnoreCase` for one segment. `JavaString` has no such shim, so a one-segment name
 * (whose `equalsIgnoreCase` is that comparison) stands in.
 */
function equalsIgnoreCase(a: string, b: string): boolean {
  return QualifiedName.create(a).equalsIgnoreCase(QualifiedName.create(b));
}

function booleanHash(value: boolean): number {
  return value ? BOOLEAN_TRUE_HASH : BOOLEAN_FALSE_HASH;
}

/**
 * Turns names relative to an imported namespace into full names and back: a wildcard import makes
 * everything below the namespace visible by its remaining segments, an exact import only the
 * namespace itself under its last segment.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/ImportNormalizer.java
 */
export class ImportNormalizer {
  private readonly importedNamespacePrefix: QualifiedName;
  private readonly wildCard: boolean;
  private readonly ignoreCase: boolean;

  /** @throws IllegalArgumentException if the namespace is null or empty */
  constructor(importedNamespace: QualifiedName, wildCard: boolean, ignoreCase: boolean) {
    this.ignoreCase = ignoreCase;
    if ((importedNamespace as QualifiedName | null) === null || importedNamespace.isEmpty()) {
      throw new IllegalArgumentException(EMPTY_NAMESPACE_MESSAGE);
    }
    this.wildCard = wildCard;
    this.importedNamespacePrefix = importedNamespace;
  }

  /** The name relative to the namespace, `null` when `fullyQualifiedName` is not covered. */
  deresolve(fullyQualifiedName: QualifiedName): QualifiedName | null {
    if (this.wildCard) {
      const startsWithPrefix = this.ignoreCase
        ? fullyQualifiedName.startsWithIgnoreCase(this.importedNamespacePrefix)
        : fullyQualifiedName.startsWith(this.importedNamespacePrefix);
      if (startsWithPrefix && fullyQualifiedName.getSegmentCount() !== this.importedNamespacePrefix.getSegmentCount()) {
        return fullyQualifiedName.skipFirst(this.importedNamespacePrefix.getSegmentCount());
      }
      return null;
    }
    const isNamespace = this.ignoreCase
      ? fullyQualifiedName.equalsIgnoreCase(this.importedNamespacePrefix)
      : fullyQualifiedName.equals(this.importedNamespacePrefix);
    return isNamespace ? QualifiedName.create(fullyQualifiedName.getLastSegment()) : null;
  }

  /** The full name of `relativeName`, `null` when this import does not make it visible. */
  resolve(relativeName: QualifiedName): QualifiedName | null {
    if (relativeName.isEmpty()) {
      return null;
    }
    if (this.wildCard) {
      return this.importedNamespacePrefix.append(relativeName);
    }
    if (relativeName.getSegmentCount() === 1) {
      return this.resolveExact(relativeName.getLastSegment());
    }
    return null;
  }

  private resolveExact(segment: string): QualifiedName | null {
    const lastSegment = this.importedNamespacePrefix.getLastSegment();
    if (!this.ignoreCase) {
      return segment === lastSegment ? this.importedNamespacePrefix : null;
    }
    return equalsIgnoreCase(segment, lastSegment) ? this.importedNamespacePrefix.skipLast(1).append(segment) : null;
  }

  toString(): string {
    return this.importedNamespacePrefix.toString() + (this.wildCard ? WILDCARD_SUFFIX : '');
  }

  hashCode(): number {
    let result = 1;
    result = add(mul(HASH_PRIME, result), booleanHash(this.wildCard));
    result = add(mul(HASH_PRIME, result), booleanHash(this.ignoreCase));
    const prefixHash = this.ignoreCase
      ? this.importedNamespacePrefix.toLowerCase().hashCode()
      : this.importedNamespacePrefix.hashCode();
    return add(mul(HASH_PRIME, result), prefixHash);
  }

  equals(obj: unknown): boolean {
    if (this === obj) {
      return true;
    }
    if (obj instanceof ImportNormalizer) {
      if (obj.wildCard !== this.wildCard || obj.ignoreCase !== this.ignoreCase) {
        return false;
      }
      if (this.ignoreCase) {
        return obj.importedNamespacePrefix.equalsIgnoreCase(this.importedNamespacePrefix);
      }
      return obj.importedNamespacePrefix.equals(this.importedNamespacePrefix);
    }
    return false;
  }

  getImportedNamespacePrefix(): QualifiedName {
    return this.importedNamespacePrefix;
  }

  hasWildCard(): boolean {
    return this.wildCard;
  }

  isIgnoreCase(): boolean {
    return this.ignoreCase;
  }
}
