// SPDX-License-Identifier: EPL-2.0

/**
 * Terminal token types of the GRandom language (`.elkr`), spelled as `InternalGRandomParser.tokenNames` prints them:
 * terminals by rule name and `<invalid>` for the hidden token that Xtext's lexer emits over the text of a failed
 * lexer rule. A keyword's type is its literal in single quotes (see {@link keywordTokenType}).
 *
 * `RULE_STRING` and `RULE_ID` come from the Terminals grammar; `INT` is the grammar's own `RULE_INT` (digits only).
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/parser/antlr/internal/InternalGRandom.tokens
 */
export const GRandomTokenType = {
  RULE_INT: 'RULE_INT',
  RULE_STRING: 'RULE_STRING',
  RULE_ID: 'RULE_ID',
  RULE_ML_COMMENT: 'RULE_ML_COMMENT',
  RULE_SL_COMMENT: 'RULE_SL_COMMENT',
  RULE_WS: 'RULE_WS',
  RULE_ANY_OTHER: 'RULE_ANY_OTHER',
  INVALID: '<invalid>',
} as const;

export type GRandomTokenTypeName = (typeof GRandomTokenType)[keyof typeof GRandomTokenType];

/**
 * The 51 keyword literals in token-number order (`T__11` ... `T__61` of `InternalGRandom.tokens`). Multi-word
 * keywords (`cross-hierarchy relative edges`, `self loops`, `+/-`, ...) are single tokens.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/GRandom.xtext
 */
export const GRANDOM_KEYWORDS: readonly string[] = [
  'generate',
  '{',
  'maxWidth',
  '=',
  'maxDegree',
  'partitionFraction',
  'seed',
  'format',
  'filename',
  '}',
  'hierarchy',
  'levels',
  'cross-hierarchy edges',
  'compound nodes',
  'cross-hierarchy relative edges',
  'edges',
  'density',
  'total',
  'relative',
  'outgoing',
  'labels',
  'self loops',
  'nodes',
  'remove isolated',
  'size',
  'height',
  'width',
  'ports',
  're-use',
  'constraint',
  'to',
  '+/-',
  '.',
  'elkt',
  'elkg',
  'trees',
  'graphs',
  'bipartite graphs',
  'biconnected graphs',
  'triconnected graphs',
  'acyclic graphs',
  'north',
  'east',
  'south',
  'west',
  'incoming',
  'free',
  'side',
  'position',
  'order',
  'ratio',
];

/** The type name `tokenNames` prints for a keyword literal: the literal in single quotes. */
export function keywordTokenType(literal: string): string {
  return `'${literal}'`;
}

/**
 * Terminals on the hidden channel (`hidden(WS, ML_COMMENT, SL_COMMENT)` of the Terminals grammar).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/common/Terminals.xtext
 */
export const HIDDEN_TOKEN_TYPES: ReadonlySet<string> = new Set([
  GRandomTokenType.RULE_WS,
  GRandomTokenType.RULE_ML_COMMENT,
  GRandomTokenType.RULE_SL_COMMENT,
]);
