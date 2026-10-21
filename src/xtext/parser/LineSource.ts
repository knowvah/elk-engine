// SPDX-License-Identifier: EPL-2.0
import { InternalNodeModelUtils } from '../nodemodel/impl/InternalNodeModelUtils.js';
import type { Token } from './Token.js';

/**
 * How the parse runtime derives the line of a token for diagnostics and records: the line of its first character
 * and the line just after its last character.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export interface LineSource {
  startLine(token: Token): number;
  endLine(token: Token): number;
}

/**
 * The lines of Xtext's node model (`AbstractNode.getStartLine`): derived from the token offset over the full
 * text, where `\r`, `\n` and `\r\n` each end a line.
 */
export function nodeModelLineSource(text: string): LineSource {
  const breaks = InternalNodeModelUtils.computeLineBreaks(text);
  const at = (offset: number): number => InternalNodeModelUtils.getLine(text, breaks, offset);
  return { startLine: (token) => at(token.offset), endLine: (token) => at(token.offset + token.text.length) };
}
