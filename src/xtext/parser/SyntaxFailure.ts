// SPDX-License-Identifier: EPL-2.0

/**
 * The first syntax error: parsing stops (G5, presence only).
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export class SyntaxFailure extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(message);
    this.name = 'SyntaxFailure';
    this.line = line;
  }
}
