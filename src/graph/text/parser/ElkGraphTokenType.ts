// SPDX-License-Identifier: EPL-2.0

/**
 * Token types of the ELK graph text language, spelled as the ANTLR vocabulary: terminals by rule name,
 * keywords as their quoted literal (`'graph'`, `'->'`, ...), and `<invalid>` for the hidden token that Xtext's
 * lexer emits over the text of a failed lexer rule.
 *
 * `RULE_INT` is a lexer fragment and is never emitted; the entry exists because the grammar declares `INT`.
 * Keys of keyword tokens follow the generated vocabulary (`T__13` ... `T__38`).
 *
 * @see org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/parser/antlr/internal/InternalElkGraph.tokens
 */
export const ElkGraphTokenType = {
  RULE_ID: 'RULE_ID',
  RULE_STRING: 'RULE_STRING',
  RULE_SIGNED_INT: 'RULE_SIGNED_INT',
  RULE_FLOAT: 'RULE_FLOAT',
  RULE_INT: 'RULE_INT',
  RULE_ML_COMMENT: 'RULE_ML_COMMENT',
  RULE_SL_COMMENT: 'RULE_SL_COMMENT',
  RULE_WS: 'RULE_WS',
  RULE_ANY_OTHER: 'RULE_ANY_OTHER',
  INVALID: '<invalid>',
  T__13: "'graph'",
  T__14: "'node'",
  T__15: "'{'",
  T__16: "'}'",
  T__17: "'label'",
  T__18: "':'",
  T__19: "'port'",
  T__20: "'layout'",
  T__21: "'['",
  T__22: "'position'",
  T__23: "','",
  T__24: "'size'",
  T__25: "']'",
  T__26: "'edge'",
  T__27: "'->'",
  T__28: "'incoming'",
  T__29: "'outgoing'",
  T__30: "'start'",
  T__31: "'end'",
  T__32: "'bends'",
  T__33: "'|'",
  T__34: "'section'",
  T__35: "'.'",
  T__36: "'null'",
  T__37: "'true'",
  T__38: "'false'",
} as const;

export type ElkGraphTokenTypeName = (typeof ElkGraphTokenType)[keyof typeof ElkGraphTokenType];

/** The 26 keyword literals of the grammar, unquoted, in token-number order (`GrammarUtil.getAllKeywords`). */
export const ELK_GRAPH_KEYWORDS: ReadonlySet<string> = new Set([
  'graph',
  'node',
  '{',
  '}',
  'label',
  ':',
  'port',
  'layout',
  '[',
  'position',
  ',',
  'size',
  ']',
  'edge',
  '->',
  'incoming',
  'outgoing',
  'start',
  'end',
  'bends',
  '|',
  'section',
  '.',
  'null',
  'true',
  'false',
]);

/**
 * Terminals on the hidden channel (`hidden(WS, ML_COMMENT, SL_COMMENT)` of the Terminals grammar).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/common/Terminals.xtext
 */
export const HIDDEN_TOKEN_TYPES: ReadonlySet<string> = new Set([
  ElkGraphTokenType.RULE_WS,
  ElkGraphTokenType.RULE_ML_COMMENT,
  ElkGraphTokenType.RULE_SL_COMMENT,
]);
