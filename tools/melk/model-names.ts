// SPDX-License-Identifier: EPL-2.0
import type { MdAlgorithm, MdBundle, MelkFile } from './ast.js';
import { ModelError } from './model-errors.js';

const SEPARATOR = '.';
const DEFAULT_BUNDLE_CLASS = 'Metadata';
const ALGORITHM_CLASS_SUFFIX = 'Metadata';
const SPACE = ' ';

/** `Character.isWhitespace`: Unicode space separators except the non-breaking ones, and the ASCII separators. */
const JAVA_WHITESPACE = /^[\t\n\v\f\r\x1C-\x1F \u1680\u2000-\u2006\u2008-\u200A\u2028\u2029\u205F\u3000]$/u;

function isWhitespace(c: string): boolean {
  return JAVA_WHITESPACE.test(c);
}

function toFirstUpper(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Collapses every run of whitespace to one space and drops leading and trailing whitespace; `null` stays `null`.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend (shrinkWhiteSpace)
 */
export function shrinkWhiteSpace(s: string | null): string | null {
  if (s === null) {
    return null;
  }
  let result = '';
  let shrink = true;
  for (const c of s) {
    if (isWhitespace(c)) {
      if (!shrink) {
        result += SPACE;
      }
      shrink = true;
    } else {
      result += c;
      shrink = false;
    }
  }
  return result.length > 0 && isWhitespace(result.charAt(result.length - 1)) ? result.slice(0, -1) : result;
}

/**
 * `fooBar` to `FOO_BAR`: an underscore before every upper-case character after the first.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend (toUpperCaseWithUnderscores)
 */
export function toUpperCaseWithUnderscores(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i);
    if (i > 0 && c !== c.toLowerCase() && c === c.toUpperCase()) {
      result += '_';
    }
    result += c.toUpperCase();
  }
  return result;
}

/**
 * The id of a bundle member: the id prefix (the package when absent) without its last segment when that equals the
 * member name, then the group path, then the name.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend (getQualifiedName)
 */
export function memberId(file: MelkFile, groups: readonly string[], name: string): string {
  const packageName = requirePackage(file);
  let prefix = file.bundle?.idPrefix ?? packageName;
  const lastDot = prefix.lastIndexOf(SEPARATOR);
  if (name === prefix.slice(lastDot + 1)) {
    if (lastDot < 0) {
      throw new ModelError(
        `${file.fileName}: member '${name}' equals the id prefix '${prefix}', which has no segment to drop`,
      );
    }
    prefix = prefix.slice(0, lastDot);
  }
  return [prefix, ...groups, name].join(SEPARATOR);
}

/** The package-based qualified name `melk` cross-references resolve against (the Xtext default naming). */
export function scopedName(file: MelkFile, groups: readonly string[], name: string): string {
  return [requirePackage(file), ...groups, name].join(SEPARATOR);
}

/**
 * `GROUP_NAME` of a member: the groups and the name in upper case with underscores, joined by `_`.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend (getConstantName)
 */
export function constantName(groups: readonly string[], name: string): string {
  return [...groups, name].map(toUpperCaseWithUnderscores).join('_');
}

/** The name of the constant holding an option default. */
export function defaultConstantName(constant: string): string {
  return `${constant}_DEFAULT`;
}

/** The name of the constant holding an option lower bound. */
export function lowerBoundConstantName(constant: string): string {
  return `${constant}_LOWER_BOUND`;
}

/** The name of the constant holding an option upper bound. */
export function upperBoundConstantName(constant: string): string {
  return `${constant}_UPPER_BOUND`;
}

/** The name of the constant holding the required value of the `index`-th dependency of an option. */
export function dependencyConstantName(constant: string, targetConstant: string, index: number): string {
  return `${constant}_DEP_${targetConstant}_${String(index)}`;
}

/** The fully qualified name of the bundle class: the package and the `metadataClass` (default `Metadata`). */
export function bundleClassName(file: MelkFile): string {
  const bundle: MdBundle | null = file.bundle;
  return `${requirePackage(file)}${SEPARATOR}${bundle?.targetClass ?? DEFAULT_BUNDLE_CLASS}`;
}

/** The fully qualified name of an algorithm's metadata class: the `metadataClass`, else `<Name>Metadata`. */
export function algorithmClassName(file: MelkFile, algorithm: MdAlgorithm): string {
  const className = algorithm.targetClass ?? `${toFirstUpper(algorithm.name)}${ALGORITHM_CLASS_SUFFIX}`;
  return `${requirePackage(file)}${SEPARATOR}${className}`;
}

function requirePackage(file: MelkFile): string {
  if (file.packageName === null) {
    throw new ModelError(`${file.fileName}: the file has no package declaration, so it defines no bundle`);
  }
  return file.packageName;
}
