// SPDX-License-Identifier: EPL-2.0
import { EOF_TOKEN_TYPE } from '../../../../xtext/parser/TokenCursor.js';

/**
 * Token types of the Graphviz DOT language, spelled as the ANTLR vocabulary (`InternalGraphvizDotParser.tokenNames`):
 * terminals by rule name, keywords as their quoted literal (`'graph'`, `'->'`, ...), and `<invalid>` for the hidden
 * token that Xtext's lexer emits over the text of a failed lexer rule. Keys of keyword tokens follow the generated
 * vocabulary (`T__13` ... `T__28`).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/parser/antlr/internal/InternalGraphvizDot.tokens
 */
export const GraphvizDotTokenType = {
  RULE_ID: 'RULE_ID',
  RULE_INT: 'RULE_INT',
  RULE_FLOAT: 'RULE_FLOAT',
  RULE_STRING: 'RULE_STRING',
  RULE_PREC_LINE: 'RULE_PREC_LINE',
  RULE_ML_COMMENT: 'RULE_ML_COMMENT',
  RULE_SL_COMMENT: 'RULE_SL_COMMENT',
  RULE_WS: 'RULE_WS',
  RULE_ANY_OTHER: 'RULE_ANY_OTHER',
  INVALID: '<invalid>',
  T__13: "'strict'",
  T__14: "'{'",
  T__15: "'}'",
  T__16: "';'",
  T__17: "'='",
  T__18: "'['",
  T__19: "','",
  T__20: "']'",
  T__21: "':'",
  T__22: "'subgraph'",
  T__23: "'->'",
  T__24: "'--'",
  T__25: "'graph'",
  T__26: "'digraph'",
  T__27: "'node'",
  T__28: "'edge'",
} as const;

/** The token types under readable names, plus the end of input, for the parser. */
export const Tok = {
  ID: GraphvizDotTokenType.RULE_ID,
  INT: GraphvizDotTokenType.RULE_INT,
  FLOAT: GraphvizDotTokenType.RULE_FLOAT,
  STRING: GraphvizDotTokenType.RULE_STRING,
  STRICT: GraphvizDotTokenType.T__13,
  LBRACE: GraphvizDotTokenType.T__14,
  RBRACE: GraphvizDotTokenType.T__15,
  SEMICOLON: GraphvizDotTokenType.T__16,
  EQUALS: GraphvizDotTokenType.T__17,
  LBRACKET: GraphvizDotTokenType.T__18,
  COMMA: GraphvizDotTokenType.T__19,
  RBRACKET: GraphvizDotTokenType.T__20,
  COLON: GraphvizDotTokenType.T__21,
  SUBGRAPH: GraphvizDotTokenType.T__22,
  DIRECTED: GraphvizDotTokenType.T__23,
  UNDIRECTED: GraphvizDotTokenType.T__24,
  GRAPH: GraphvizDotTokenType.T__25,
  DIGRAPH: GraphvizDotTokenType.T__26,
  NODE: GraphvizDotTokenType.T__27,
  EDGE: GraphvizDotTokenType.T__28,
  EOF: EOF_TOKEN_TYPE,
} as const;

/** The 16 keyword literals of the grammar, unquoted, in token-number order (`GrammarUtil.getAllKeywords`). */
export const GRAPHVIZ_DOT_KEYWORDS: ReadonlySet<string> = new Set(
  Object.entries(GraphvizDotTokenType)
    .filter(([key]) => key.startsWith('T__'))
    .map(([, type]) => type.slice(1, -1)),
);

/**
 * Terminals on the hidden channel: `hidden(WS, ML_COMMENT, SL_COMMENT, PREC_LINE)` of the grammar.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/GraphvizDot.xtext
 */
export const HIDDEN_TOKEN_TYPES: ReadonlySet<string> = new Set([
  GraphvizDotTokenType.RULE_WS,
  GraphvizDotTokenType.RULE_ML_COMMENT,
  GraphvizDotTokenType.RULE_SL_COMMENT,
  GraphvizDotTokenType.RULE_PREC_LINE,
]);
