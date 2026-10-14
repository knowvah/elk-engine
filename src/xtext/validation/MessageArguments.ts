// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { EStructuralFeature } from './EStructuralFeature.js';
import { INSIGNIFICANT_INDEX, type IssueDetails, type IssueTarget } from './ValidationMessageAcceptor.js';

/**
 * The arguments after the message of `error`/`warning`: Java's overloads (with or without a
 * `source` object, an `index`, a `code` and varargs `issueData`) as one tuple union. The runtime types
 * tell them apart: translation rules 6.5.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/AbstractDeclarativeValidator.java
 */
export type MessageArgs =
  | readonly [feature: EStructuralFeature | null, index?: number]
  | readonly [feature: EStructuralFeature | null, code: string | null, ...issueData: string[]]
  | readonly [feature: EStructuralFeature | null, index: number, code: string | null, ...issueData: string[]]
  | readonly [source: EObject, feature: EStructuralFeature | null, index?: number]
  | readonly [source: EObject, feature: EStructuralFeature | null, code: string | null, ...issueData: string[]]
  | readonly [
      source: EObject,
      feature: EStructuralFeature | null,
      index: number,
      code: string | null,
      ...issueData: string[],
    ];

function isEObject(value: unknown): value is EObject {
  return typeof value === 'object' && value !== null && typeof (value as { eClass?: unknown }).eClass === 'function';
}

/** The resolved arguments of one message. */
export interface ResolvedMessage {
  readonly target: IssueTarget;
  readonly details: IssueDetails;
}

/**
 * Fills in the defaults the Java overloads delegate with: the source is the object being checked,
 * the index is {@link INSIGNIFICANT_INDEX}, the code is `null`, the issue data is empty.
 *
 * @param currentObject the object under check
 * @param args the arguments after the message
 * @returns the resolved arguments
 */
export function resolveMessageArgs(currentObject: EObject, args: MessageArgs): ResolvedMessage {
  const explicitSource = isEObject(args[0]);
  const object = explicitSource ? (args[0] as EObject) : currentObject;
  const rest: readonly unknown[] = explicitSource ? args.slice(1) : args;
  const feature = (rest[0] ?? null) as EStructuralFeature | null;
  const hasIndex = typeof rest[1] === 'number';
  const index = hasIndex ? (rest[1] as number) : INSIGNIFICANT_INDEX;
  const tail = rest.slice(hasIndex ? 2 : 1);
  const code = (tail[0] ?? null) as string | null;
  return { target: { object, feature, index }, details: { code, issueData: tail.slice(1) as string[] } };
}
