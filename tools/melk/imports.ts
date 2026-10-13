// SPDX-License-Identifier: EPL-2.0
import { posix } from 'node:path';
import type { Expr, TypeRef } from './ast.js';
import { qualifiedClassName, type ImportScope } from './expr.js';

const SEPARATOR = '.';
const SOURCE_ROOT = 'src';
const TYPESCRIPT_EXTENSION = /\.ts$/;
const ELK_PACKAGE_PREFIX = ['org', 'eclipse', 'elk'];

/** Where the TypeScript counterpart of a `java.lang` class object lives. */
export const JAVA_CLASS_MODULE = 'src/java/lang/JavaClass.ts';
export const JAVA_INTEGER_MODULE = 'src/java/lang/JavaInteger.ts';
export const BOXED_COMPARABLE_MODULE = 'src/java/lang/BoxedComparable.ts';

/** TypeScript types of the `java.lang` types an option may have. */
const JAVA_LANG_TYPES: ReadonlyMap<string, string> = new Map([
  ['boolean', 'boolean'],
  ['Boolean', 'boolean'],
  ['int', 'number'],
  ['Integer', 'number'],
  ['double', 'number'],
  ['Double', 'number'],
  ['float', 'number'],
  ['Float', 'number'],
  ['String', 'string'],
  ['Object', 'unknown'],
]);

function isClassSegment(segment: string): boolean {
  return /^[A-Z]/.test(segment);
}

/**
 * The repository-relative TypeScript module of a Java class (AD-7): `org.eclipse.elk.<rest>.<Class>` becomes
 * `src/<rest>/<Class>.ts` and `java.util.EnumSet` becomes `src/java/util/EnumSet.ts`. A nested class (C3) lives in a
 * file named after the nested class, next to its outer class: `...BoxLayoutProvider.PackingMode` is
 * `src/core/util/PackingMode.ts`.
 */
export function moduleOfClass(fqn: string): string {
  const segments = fqn.split(SEPARATOR);
  const firstClass = segments.findIndex(isClassSegment);
  const name = segments[segments.length - 1];
  if (firstClass < 1 || name === undefined) {
    throw new Error(`'${fqn}' is not a qualified class name`);
  }
  const packageSegments = segments.slice(0, firstClass);
  const isElk = ELK_PACKAGE_PREFIX.every((segment, i) => packageSegments[i] === segment);
  const directories = isElk ? packageSegments.slice(ELK_PACKAGE_PREFIX.length) : packageSegments;
  return [SOURCE_ROOT, ...directories, `${name}.ts`].join('/');
}

/** The Java package of a fully qualified class name: the leading lower-case segments. */
export function packageOfClass(fqn: string): string {
  const segments = fqn.split(SEPARATOR);
  const firstClass = segments.findIndex(isClassSegment);
  return segments.slice(0, firstClass < 0 ? segments.length : firstClass).join(SEPARATOR);
}

/**
 * The nested classes among a list of imports (C3), mapped from the nested class's simple name to its `Outer.Inner`
 * path: `...BoxLayoutProvider.PackingMode` gives `PackingMode` to `BoxLayoutProvider.PackingMode`.
 */
export function nestedClassPaths(imports: Iterable<string>): Map<string, string> {
  const nested = new Map<string, string>();
  for (const raw of imports) {
    const segments = raw.replaceAll('^', '').split(SEPARATOR);
    const classes = segments.slice(Math.max(segments.findIndex(isClassSegment), 0));
    const inner = classes[classes.length - 1];
    if (classes.length > 1 && inner !== undefined) {
      nested.set(inner, classes.join(SEPARATOR));
    }
  }
  return nested;
}

/** The simple name TypeScript code uses for a class: the last segment (the nested class for nested types). */
export function localName(fqn: string): string {
  return fqn.slice(fqn.lastIndexOf(SEPARATOR) + 1);
}

/** A relative `.js` import specifier from the file `fromFile` to the module `toModule` (both repository-relative). */
export function relativeSpecifier(fromFile: string, toModule: string): string {
  const target = toModule.replace(TYPESCRIPT_EXTENSION, '.js');
  const relative = posix.relative(posix.dirname(fromFile), target);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

type Usage = 'type' | 'value';

interface NamedImport {
  readonly module: string;
  usage: Usage;
}

/** Collects the imports of one generated file and renders them as sorted import declarations. */
export class ImportCollector {
  private readonly named = new Map<string, NamedImport>();
  private readonly namespaces = new Map<string, string>();
  private readonly outputFile: string;
  private readonly overrides: ReadonlyMap<string, string>;

  /**
   * @param outputFile repository-relative path of the file the imports are for
   * @param overrides module path per Java class name that replaces the AD-7 mapping (tests only)
   */
  constructor(outputFile: string, overrides: ReadonlyMap<string, string> = new Map()) {
    this.outputFile = outputFile;
    this.overrides = overrides;
  }

  /** Records the use of a Java class and returns the name it has in the file. */
  useClass(fqn: string, usage: Usage): string {
    return this.useNamed(localName(fqn), this.overrides.get(fqn) ?? moduleOfClass(fqn), usage);
  }

  /** Records the use of a named export of a module and returns its name. */
  useNamed(name: string, module: string, usage: Usage): string {
    const existing = this.named.get(name);
    if (existing !== undefined && existing.module !== module) {
      throw new Error(`'${name}' is imported from both ${existing.module} and ${module} in ${this.outputFile}`);
    }
    if (existing === undefined) {
      this.named.set(name, { module, usage });
    } else if (usage === 'value') {
      existing.usage = 'value';
    }
    return name;
  }

  /** Records `import * as name from module` and returns the name. */
  useNamespace(name: string, module: string): string {
    this.namespaces.set(name, module);
    return name;
  }

  /** The import declarations, sorted by module specifier. */
  render(): string[] {
    const byModule = new Map<string, string[]>();
    for (const [name, { module, usage }] of [...this.named].sort(([a], [b]) => a.localeCompare(b))) {
      byModule.set(module, [...(byModule.get(module) ?? []), usage === 'type' ? `type ${name}` : name]);
    }
    const lines = [...byModule].map(([module, names]) => this.declaration(names, module));
    const namespaceLines = [...this.namespaces].map(
      ([name, module]) => `import * as ${name} from '${relativeSpecifier(this.outputFile, module)}';`,
    );
    return [...lines, ...namespaceLines].sort((a, b) => specifierOf(a).localeCompare(specifierOf(b)));
  }

  private declaration(names: readonly string[], module: string): string {
    const specifier = relativeSpecifier(this.outputFile, module);
    const allTypes = names.every((name) => name.startsWith('type '));
    const list = allTypes ? names.map((name) => name.slice('type '.length)) : names;
    return `import ${allTypes ? 'type ' : ''}{ ${list.join(', ')} } from '${specifier}';`;
  }
}

function specifierOf(line: string): string {
  return line.slice(line.indexOf(' from ') + ' from '.length);
}

/** What type names resolve against in one file. */
export interface TypeContext {
  readonly scope: ImportScope;
  /** The package unimported simple names belong to. */
  readonly defaultPackage: string;
  readonly imports: ImportCollector;
}

/** The fully qualified name of a class written in a file. */
export function resolveClass(path: readonly string[], context: TypeContext): string {
  return qualifiedClassName(path, context.scope, context.defaultPackage);
}

const ARRAY_TYPE = 'List';
const ENUM_SET_TYPE = 'EnumSet';
const ENUM_SET_FQN = 'java.util.EnumSet';

/**
 * The TypeScript type of a Java type reference: primitives and their boxes become `boolean`, `number` and `string`,
 * `Object` is `unknown`, `List<T>` is `T[]`, `EnumSet<E>` stays and everything else is its imported class.
 */
export function tsTypeOf(type: TypeRef | null, context: TypeContext): string {
  if (type === null) {
    return 'unknown';
  }
  const simple = type.name.slice(type.name.lastIndexOf(SEPARATOR) + 1);
  const mapped = JAVA_LANG_TYPES.get(type.name);
  if (mapped !== undefined) {
    return mapped;
  }
  if (simple === ARRAY_TYPE) {
    return `${type.args.length === 0 ? 'unknown' : tsTypeOf(type.args[0] ?? null, context)}[]`;
  }
  const args = type.args.map((arg) => tsTypeOf(arg, context));
  const name =
    simple === ENUM_SET_TYPE
      ? context.imports.useClass(ENUM_SET_FQN, 'type')
      : context.imports.useClass(resolveClass(type.name.split(SEPARATOR), context), 'type');
  return args.length === 0 ? name : `${name}<${args.join(', ')}>`;
}

// ---- expression translation ----
//
// Kept next to the import collector because translating an expression is what decides which imports a file needs.

const ENUM_CONSTANT = /^[A-Z][A-Z0-9_]*$/;
const INTEGER_CLASS = 'Integer';
const INTEGER_NAMESPACE = 'JavaInteger';
const JAVA_CLASS_NAME = 'JavaClass';
const FLOAT_SUFFIX = 'f';
const INTEGER_CONSTANTS: ReadonlySet<string> = new Set(['Integer.MAX_VALUE', 'Integer.MIN_VALUE']);
const LANG_CLASS_OPTION_CLASSES: ReadonlySet<string> = new Set(['Boolean', 'Integer', 'Double', 'String', 'Object']);

function literalText(literal: Extract<Expr, { kind: 'literal' }>): string {
  if (literal.type === 'string') {
    return JSON.stringify(literal.raw);
  }
  const raw = literal.raw.replaceAll('_', '');
  return literal.suffix === FLOAT_SUFFIX ? `Math.fround(${raw})` : raw;
}

function refText(segments: readonly string[], context: TypeContext): string {
  const member = segments[segments.length - 1] ?? '';
  const typePath = segments.slice(0, -1);
  if (typePath.length === 0) {
    return context.imports.useClass(resolveClass([member], context), 'value');
  }
  if (typePath.join(SEPARATOR) === INTEGER_CLASS) {
    return `${context.imports.useNamespace(INTEGER_NAMESPACE, JAVA_INTEGER_MODULE)}.${member}`;
  }
  const owner = context.imports.useClass(resolveClass(typePath, context), 'value');
  return ENUM_CONSTANT.test(member) ? `${owner}.${member}` : `${owner}.${member}()`;
}

/** Translates a `.melk` expression (C5 forms) into TypeScript source, recording the imports it needs. */
export function emitExpression(expr: Expr, context: TypeContext): string {
  switch (expr.kind) {
    case 'literal':
      return literalText(expr);
    case 'null':
      return 'null';
    case 'unary':
      return `-${emitExpression(expr.operand, context)}`;
    case 'ref':
      return refText(expr.segments, context);
    case 'new': {
      const owner = context.imports.useClass(resolveClass(expr.type.name.split(SEPARATOR), context), 'value');
      return `new ${owner}(${expr.args.map((arg) => emitExpression(arg, context)).join(', ')})`;
    }
    case 'call': {
      const owner = context.imports.useClass(resolveClass(expr.receiver, context), 'value');
      return `${owner}.${expr.name}(${expr.args.map((arg) => emitExpression(arg, context)).join(', ')})`;
    }
    case 'list':
      return `[${expr.elements.map((element) => emitExpression(element, context)).join(', ')}]`;
  }
}

/** True for a number, boolean or string literal (possibly negated) or an `Integer` constant: a bound that Java boxes into a `Comparable`. */
export function isPrimitiveLiteral(expr: Expr): boolean {
  switch (expr.kind) {
    case 'literal':
      return true;
    case 'unary':
      return isPrimitiveLiteral(expr.operand);
    case 'ref':
      return INTEGER_CONSTANTS.has(expr.segments.join(SEPARATOR));
    default:
      return false;
  }
}

/** A bound as the `Comparable` the `Property` constructor takes: primitives are wrapped in a `BoxedComparable`. */
export function emitBound(expr: Expr, context: TypeContext): string {
  const text = emitExpression(expr, context);
  return isPrimitiveLiteral(expr)
    ? `new ${context.imports.useNamed('BoxedComparable', BOXED_COMPARABLE_MODULE, 'value')}(${text})`
    : text;
}

/**
 * `<Class>.class` of an option's `optionClass`: the `JavaClass` constant of a `java.lang` type, a token for `List`,
 * else the class (or interface token) itself.
 */
export function emitOptionClass(optionClass: string, declared: TypeRef | null, context: TypeContext): string {
  if (LANG_CLASS_OPTION_CLASSES.has(optionClass)) {
    return `${context.imports.useNamed(JAVA_CLASS_NAME, JAVA_CLASS_MODULE, 'value')}.${optionClass}`;
  }
  if (optionClass === ARRAY_TYPE) {
    return `${context.imports.useNamed('javaInterface', JAVA_CLASS_MODULE, 'value')}('${ARRAY_TYPE}')`;
  }
  const subject = declared?.name.endsWith(ENUM_SET_TYPE) === true ? declared.args[0] : declared;
  if (subject === undefined || subject === null) {
    throw new Error(`option class '${optionClass}' has no class to refer to`);
  }
  return context.imports.useClass(resolveClass(subject.name.split(SEPARATOR), context), 'value');
}

// ---- text helpers ----

export const str = (value: string): string => JSON.stringify(value);

/** A JSDoc block with one line per element. */
export function docComment(lines: readonly string[]): string {
  const body = lines.map((line) => ` * ${line.trim().replaceAll('*/', '*\\/')}`.trimEnd());
  return ['/**', ...body, ' */'].join('\n');
}

/** The lines of a description followed by extra tag lines. */
export function descriptionLines(text: string | null, extra: readonly string[] = []): string[] {
  return [...(text === null ? [] : text.split('\n')), ...extra];
}

/** The `@see` tag naming the Java class a generated class mirrors. */
export function seeTag(definingBundle: string | null, className: string): string {
  const path = className.split('.').join('/');
  return `@see ${definingBundle === null ? '' : `${definingBundle}/`}src-gen/${path}.java`;
}

/** The SPDX line and the GENERATED header of a generated file. */
export function header(sourceFile: string): string {
  return [
    '// SPDX-License-Identifier: EPL-2.0',
    `// GENERATED by tools/melk from tools/melk/sources/${sourceFile} — do not edit`,
  ].join('\n');
}
