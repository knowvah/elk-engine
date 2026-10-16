// SPDX-License-Identifier: EPL-2.0

/**
 * One member of an unordered group: the token that starts it and the parse of the rest.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export interface GroupMember {
  readonly start: string;
  /** `follow` = token types that may legitimately follow the member (for a missing trailing number). */
  parse(follow: ReadonlySet<string>): void;
}
