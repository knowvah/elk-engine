// SPDX-License-Identifier: EPL-2.0

/**
 * One lexer token as the parse runtime sees it; `offset` is the UTF-16 index of its first code unit, `line` the
 * 1-based line there.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export interface Token {
  readonly type: string;
  readonly text: string;
  readonly offset: number;
  readonly line: number;
  readonly hidden: boolean;
}
