// SPDX-License-Identifier: EPL-2.0
import type { QualifiedName } from './QualifiedName.js';

/**
 * Converts {@link QualifiedName}s to strings and back. The Java `DefaultImpl` (delimiter `.`) is
 * not ported: `ElkGraphRuntimeModule.xtend` binds `ElkGraphQualifiedNameConverter`, and the default
 * is only the field initialiser of the name provider that Guice overrides.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/naming/IQualifiedNameConverter.java
 */
export interface IQualifiedNameConverter {
  toString(name: QualifiedName): string;
  toQualifiedName(qualifiedNameAsText: string): QualifiedName;
}
