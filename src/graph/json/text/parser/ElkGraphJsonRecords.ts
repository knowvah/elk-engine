// SPDX-License-Identifier: EPL-2.0
import type { INodeModel } from '../../../../xtext/nodemodel/INodeModel.js';
import type { ParseDiagnostic } from '../../../../xtext/parser/ParseDiagnostic.js';
import type { ReferenceNode } from '../../../../xtext/parser/ReferenceNode.js';
import type { SessionVocabulary } from '../../../../xtext/parser/SessionVocabulary.js';
import { EOF_TOKEN_TYPE } from '../../../../xtext/parser/TokenCursor.js';
import type { IssueLocator } from '../../../../xtext/validation/IssueLocator.js';
import type { ElkNode } from '../../../ElkNode.js';
import { ELK_GRAPH_JSON_KEYS, ElkGraphJsonTokenType as T } from './ElkGraphJsonTokenType.js';

/** Token types of the grammar under the names of their keyword literals (the key spellings are in {@link KEY_OF_TOKEN}). */
export const Tok = {
  ID: T.RULE_ID,
  STRING: T.RULE_STRING,
  SIGNED_INT: T.RULE_SIGNED_INT,
  FLOAT: T.RULE_FLOAT,
  EOF: EOF_TOKEN_TYPE,
  LBRACE: T.T__13,
  COMMA: T.T__14,
  RBRACE: T.T__15,
  COLON: T.T__16,
  LBRACKET: T.T__17,
  RBRACKET: T.T__18,
  TRUE: T.T__19,
  FALSE: T.T__20,
  NULL: T.T__21,
} as const;

/** Rule names passed to the value converter service (the datatype and terminal rules the parser assigns from). */
export const RuleName = {
  ID: 'ID',
  STRING: 'STRING',
  NUMBER: 'Number',
  PROPERTY_KEY: 'PropertyKey',
  STRING_VALUE: 'StringValue',
  NUMBER_VALUE: 'NumberValue',
  BOOLEAN_VALUE: 'BooleanValue',
} as const;

/** The token types and converter rules the shared `ParseSession.number` helper uses for this grammar. */
export const ELK_GRAPH_JSON_VOCABULARY: SessionVocabulary = {
  idToken: Tok.ID,
  signedIntToken: Tok.SIGNED_INT,
  floatToken: Tok.FLOAT,
  idRule: RuleName.ID,
  numberRule: RuleName.NUMBER,
};

/** The key datatype rules (`KeyChildren` ... `KeyText`), `layoutOptions` and `properties` being one rule. */
export const JsonKey = {
  CHILDREN: 'KeyChildren',
  PORTS: 'KeyPorts',
  LABELS: 'KeyLabels',
  EDGES: 'KeyEdges',
  LAYOUT_OPTIONS: 'KeyLayoutOptions',
  ID: 'KeyId',
  X: 'KeyX',
  Y: 'KeyY',
  WIDTH: 'KeyWidth',
  HEIGHT: 'KeyHeight',
  SOURCES: 'KeySources',
  TARGETS: 'KeyTargets',
  TEXT: 'KeyText',
} as const;

export type JsonKeyRule = (typeof JsonKey)[keyof typeof JsonKey];

/** The key rules in the order of {@link ELK_GRAPH_JSON_KEYS}: `layoutOptions` and `properties` both map to one. */
const KEY_RULES: readonly JsonKeyRule[] = [
  JsonKey.CHILDREN,
  JsonKey.PORTS,
  JsonKey.LABELS,
  JsonKey.EDGES,
  JsonKey.LAYOUT_OPTIONS,
  JsonKey.LAYOUT_OPTIONS,
  JsonKey.ID,
  JsonKey.X,
  JsonKey.Y,
  JsonKey.WIDTH,
  JsonKey.HEIGHT,
  JsonKey.SOURCES,
  JsonKey.TARGETS,
  JsonKey.TEXT,
];

/** Type number of the first key keyword (`'"children"'`, `T__22`); each key has three consecutive spellings. */
const FIRST_KEY_TOKEN = 22;
const SPELLINGS_PER_KEY = 3;
const TOKEN_TYPES: Readonly<Record<string, string>> = T;

function buildKeyTable(): ReadonlyMap<string, JsonKeyRule> {
  const table = new Map<string, JsonKeyRule>();
  ELK_GRAPH_JSON_KEYS.forEach((_key, i) => {
    for (let spelling = 0; spelling < SPELLINGS_PER_KEY; spelling++) {
      const type = TOKEN_TYPES[`T__${FIRST_KEY_TOKEN + i * SPELLINGS_PER_KEY + spelling}`];
      table.set(type as string, KEY_RULES[i] as JsonKeyRule);
    }
  });
  return table;
}

/** The key rule a keyword token starts (all three spellings of every key). */
export const KEY_OF_TOKEN: ReadonlyMap<string, JsonKeyRule> = buildKeyTable();

/** The result of parsing a `.elkj` document without linking (same shape as the `.elkt` parse result). */
export interface ParseResult {
  root: ElkNode | null;
  diagnostics: ParseDiagnostic[];
  references: ReferenceNode[];
  nodeModel: INodeModel;
  positions: IssueLocator;
}
