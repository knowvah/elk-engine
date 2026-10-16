// SPDX-License-Identifier: EPL-2.0

/**
 * Token types of the ELK graph JSON text language, spelled as `InternalElkGraphJsonParser.tokenNames` prints them:
 * terminals by rule name, keywords as their quoted literal and `<invalid>` for the hidden token that Xtext's lexer
 * emits over the text of a failed lexer rule. A keyword literal is wrapped in single quotes, so the literal
 * `'children'` is printed `'\'children\''`.
 *
 * `RULE_INT` is a lexer fragment and is never emitted; the entry exists because the grammar declares `INT`.
 * Keys of keyword tokens follow the generated vocabulary (`T__13` ... `T__63`).
 *
 * @see org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/parser/antlr/internal/InternalElkGraphJson.tokens
 */
export const ElkGraphJsonTokenType = {
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
  T__13: "'{'",
  T__14: "','",
  T__15: "'}'",
  T__16: "':'",
  T__17: "'['",
  T__18: "']'",
  T__19: "'true'",
  T__20: "'false'",
  T__21: "'null'",
  T__22: '\'"children"\'',
  T__23: "'\\'children\\''",
  T__24: "'children'",
  T__25: '\'"ports"\'',
  T__26: "'\\'ports\\''",
  T__27: "'ports'",
  T__28: '\'"labels"\'',
  T__29: "'\\'labels\\''",
  T__30: "'labels'",
  T__31: '\'"edges"\'',
  T__32: "'\\'edges\\''",
  T__33: "'edges'",
  T__34: '\'"layoutOptions"\'',
  T__35: "'\\'layoutOptions\\''",
  T__36: "'layoutOptions'",
  T__37: '\'"properties"\'',
  T__38: "'\\'properties\\''",
  T__39: "'properties'",
  T__40: '\'"id"\'',
  T__41: "'\\'id\\''",
  T__42: "'id'",
  T__43: '\'"x"\'',
  T__44: "'\\'x\\''",
  T__45: "'x'",
  T__46: '\'"y"\'',
  T__47: "'\\'y\\''",
  T__48: "'y'",
  T__49: '\'"width"\'',
  T__50: "'\\'width\\''",
  T__51: "'width'",
  T__52: '\'"height"\'',
  T__53: "'\\'height\\''",
  T__54: "'height'",
  T__55: '\'"sources"\'',
  T__56: "'\\'sources\\''",
  T__57: "'sources'",
  T__58: '\'"targets"\'',
  T__59: "'\\'targets\\''",
  T__60: "'targets'",
  T__61: '\'"text"\'',
  T__62: "'\\'text\\''",
  T__63: "'text'",
} as const;

export type ElkGraphJsonTokenTypeName = (typeof ElkGraphJsonTokenType)[keyof typeof ElkGraphJsonTokenType];

/**
 * The 14 member keys of the grammar (`KeyChildren` ... `KeyText`, `KeyLayoutOptions` counting `layoutOptions` and
 * `properties` as two), each spelled bare, in double quotes and in single quotes as a keyword.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/ElkGraphJson.xtext
 */
export const ELK_GRAPH_JSON_KEYS: readonly string[] = [
  'children',
  'ports',
  'labels',
  'edges',
  'layoutOptions',
  'properties',
  'id',
  'x',
  'y',
  'width',
  'height',
  'sources',
  'targets',
  'text',
];

const PUNCTUATION_KEYWORDS: readonly string[] = ['{', ',', '}', ':', '[', ']'];
const VALUE_KEYWORDS: readonly string[] = ['true', 'false', 'null'];

/** Keyword literals as written in the source (quotes included), in token-number order (`T__13` ... `T__63`). */
export const ELK_GRAPH_JSON_KEYWORDS: ReadonlySet<string> = new Set([
  ...PUNCTUATION_KEYWORDS,
  ...VALUE_KEYWORDS,
  ...ELK_GRAPH_JSON_KEYS.flatMap((key) => [`"${key}"`, `'${key}'`, key]),
]);

/**
 * Terminals on the hidden channel (`hidden(WS, ML_COMMENT, SL_COMMENT)` of the Terminals grammar).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/common/Terminals.xtext
 */
export const HIDDEN_TOKEN_TYPES: ReadonlySet<string> = new Set([
  ElkGraphJsonTokenType.RULE_WS,
  ElkGraphJsonTokenType.RULE_ML_COMMENT,
  ElkGraphJsonTokenType.RULE_SL_COMMENT,
]);
