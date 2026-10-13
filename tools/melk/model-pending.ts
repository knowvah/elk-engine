// SPDX-License-Identifier: EPL-2.0
import type { Expr, TypeRef } from './ast.js';
import { qualifiedClassName, type ImportScope } from './expr.js';

/** Where a name is written: what the pending-type check resolves class names against. */
export interface PendingContext {
  readonly scope: ImportScope;
  /** The package of the generated class, in which unimported simple names resolve. */
  readonly defaultPackage: string;
  readonly pendingTypes: ReadonlySet<string>;
}

function classOf(path: readonly string[], context: PendingContext): string {
  return qualifiedClassName(path, context.scope, context.defaultPackage);
}

/** The fully qualified classes an expression names (receivers, constructed types, constant and class references). */
export function referencedClasses(expr: Expr, context: PendingContext): string[] {
  switch (expr.kind) {
    case 'literal':
    case 'null':
      return [];
    case 'unary':
      return referencedClasses(expr.operand, context);
    case 'ref':
      return [classOf(expr.segments.length > 1 ? expr.segments.slice(0, -1) : expr.segments, context)];
    case 'new':
      return [classOf(expr.type.name.split('.'), context), ...expr.args.flatMap((a) => referencedClasses(a, context))];
    case 'call':
      return [
        ...(expr.receiver.length > 0 ? [classOf(expr.receiver, context)] : []),
        ...expr.args.flatMap((a) => referencedClasses(a, context)),
      ];
    case 'list':
      return expr.elements.flatMap((element) => referencedClasses(element, context));
  }
}

/** The reason an expression is held back (it names a pending type), or null when it is not. */
export function pendingReason(expr: Expr | null, context: PendingContext): string | null {
  if (expr === null) {
    return null;
  }
  const pending = referencedClasses(expr, context).find((name) => context.pendingTypes.has(name));
  return pending === undefined ? null : `expression references pending type ${pending}`;
}

/** The reason a type reference (an algorithm's provider or validator) is held back, or null. */
export function pendingTypeReason(type: TypeRef | null, what: string, context: PendingContext): string | null {
  if (type === null) {
    return null;
  }
  const name = classOf(type.name.split('.'), context);
  return context.pendingTypes.has(name) ? `${what} is pending type ${name}` : null;
}

/** The first reason among several optional ones. */
export function firstReason(reasons: readonly (string | null)[]): string | null {
  return reasons.find((reason) => reason !== null) ?? null;
}
