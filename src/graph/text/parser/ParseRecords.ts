// SPDX-License-Identifier: EPL-2.0
import type { INodeModel } from '../../../xtext/nodemodel/INodeModel.js';
import type { ParseDiagnostic } from '../../../xtext/parser/ParseDiagnostic.js';
import type { ReferenceNode } from '../../../xtext/parser/ReferenceNode.js';
import type { SessionVocabulary } from '../../../xtext/parser/SessionVocabulary.js';
import { EOF_TOKEN_TYPE } from '../../../xtext/parser/TokenCursor.js';
import type { IssueLocator } from '../../../xtext/validation/IssueLocator.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphTokenType as T } from './ElkGraphTokenType.js';

/** Token types of the grammar under the names of their keyword literals. */
export const Tok = {
  ID: T.RULE_ID,
  STRING: T.RULE_STRING,
  SIGNED_INT: T.RULE_SIGNED_INT,
  FLOAT: T.RULE_FLOAT,
  INVALID: T.INVALID,
  EOF: EOF_TOKEN_TYPE,
  GRAPH: T.T__13,
  NODE: T.T__14,
  LBRACE: T.T__15,
  RBRACE: T.T__16,
  LABEL: T.T__17,
  COLON: T.T__18,
  PORT: T.T__19,
  LAYOUT: T.T__20,
  LBRACKET: T.T__21,
  POSITION: T.T__22,
  COMMA: T.T__23,
  SIZE: T.T__24,
  RBRACKET: T.T__25,
  EDGE: T.T__26,
  ARROW: T.T__27,
  INCOMING: T.T__28,
  OUTGOING: T.T__29,
  START: T.T__30,
  END: T.T__31,
  BENDS: T.T__32,
  BAR: T.T__33,
  SECTION: T.T__34,
  DOT: T.T__35,
  NULL: T.T__36,
  TRUE: T.T__37,
  FALSE: T.T__38,
} as const;

/** Rule names passed to the value converter service. */
export const RuleName = {
  ID: 'ID',
  STRING: 'STRING',
  NUMBER: 'Number',
  PROPERTY_KEY: 'PropertyKey',
  STRING_VALUE: 'StringValue',
  QUALIFIED_ID_VALUE: 'QualifiedIdValue',
  NUMBER_VALUE: 'NumberValue',
  BOOLEAN_VALUE: 'BooleanValue',
  QUALIFIED_ID: 'QualifiedId',
} as const;

/** The token types and converter rules the shared `ParseSession` helpers use for this grammar. */
export const ELK_GRAPH_VOCABULARY: SessionVocabulary = {
  idToken: Tok.ID,
  signedIntToken: Tok.SIGNED_INT,
  floatToken: Tok.FLOAT,
  idRule: RuleName.ID,
  numberRule: RuleName.NUMBER,
};

export interface ParseResult {
  root: ElkNode | null;
  diagnostics: ParseDiagnostic[];
  references: ReferenceNode[];
  nodeModel: INodeModel;
  positions: IssueLocator;
}
