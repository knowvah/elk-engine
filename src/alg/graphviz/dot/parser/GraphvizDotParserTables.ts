// SPDX-License-Identifier: EPL-2.0
import { EOR, type FollowSet } from './GraphvizDotRecognizer.js';
import { Tok } from './GraphvizDotTokenType.js';

/** The tokens that start a `DotID` (`(LA>=RULE_ID && LA<=RULE_STRING)`). */
export const DOT_ID_START: ReadonlySet<string> = new Set([Tok.ID, Tok.INT, Tok.FLOAT, Tok.STRING]);

/** The tokens that start a `Graph` (loop1 of `ruleGraphvizModel`). */
export const GRAPH_START: ReadonlySet<string> = new Set([Tok.STRICT, Tok.GRAPH, Tok.DIGRAPH]);

/** The tokens that start a `Statement` (loop4 of `ruleGraph`, loop23 of `ruleSubgraph`). */
export const STATEMENT_START: ReadonlySet<string> = new Set([
  ...DOT_ID_START,
  Tok.LBRACE,
  Tok.SUBGRAPH,
  Tok.GRAPH,
  Tok.NODE,
  Tok.EDGE,
]);

/** The edge operators (`(LA>=23 && LA<=24)`). */
export const EDGE_OPERATOR: ReadonlySet<string> = new Set([Tok.DIRECTED, Tok.UNDIRECTED]);

function follow(...types: string[]): FollowSet {
  return new Set(types);
}

/*
 * The generated follow sets, `FOLLOW_n` of InternalGraphvizDotParser (lines 3057-3077), decoded from their bit masks.
 */
export const FOLLOW_1 = follow();
export const FOLLOW_2 = follow(EOR);
export const FOLLOW_3 = follow(EOR, Tok.STRICT, Tok.GRAPH, Tok.DIGRAPH);
export const FOLLOW_4 = follow(...DOT_ID_START, Tok.STRICT, Tok.LBRACE, Tok.GRAPH, Tok.DIGRAPH);
export const FOLLOW_5 = follow(...DOT_ID_START, Tok.LBRACE);
export const FOLLOW_6 = follow(Tok.LBRACE);
export const FOLLOW_7 = follow(...STATEMENT_START, Tok.RBRACE);
export const FOLLOW_8 = follow(EOR, Tok.SEMICOLON);
export const FOLLOW_9 = follow(Tok.EQUALS);
export const FOLLOW_10 = follow(...DOT_ID_START);
export const FOLLOW_11 = follow(EOR, Tok.LBRACKET);
export const FOLLOW_12 = follow(...DOT_ID_START, Tok.RBRACKET);
export const FOLLOW_13 = follow(...DOT_ID_START, Tok.COMMA, Tok.RBRACKET);
export const FOLLOW_14 = follow(EOR, Tok.COLON);
export const FOLLOW_15 = follow(...EDGE_OPERATOR);
export const FOLLOW_16 = follow(EOR, Tok.LBRACKET, ...EDGE_OPERATOR);
export const FOLLOW_17 = follow(...STATEMENT_START);
export const FOLLOW_18 = follow(Tok.LBRACKET);
export const FOLLOW_19 = follow(Tok.ID, Tok.LBRACE);
export const FOLLOW_20 = follow(EOR, Tok.EQUALS);
export const FOLLOW_21 = follow(Tok.ID);

/** The alternatives of `Statement`, numbered as in the generated decision. */
export const StatementAlt = {
  NODE_STATEMENT: 1,
  EDGE_STATEMENT: 2,
  ATTRIBUTE_STATEMENT: 3,
  ATTRIBUTE: 4,
  SUBGRAPH: 5,
} as const;

export type StatementAltNumber = (typeof StatementAlt)[keyof typeof StatementAlt];

/** A DFA edge: to another state, or a predicted alternative. */
type Target = { readonly state: number } | { readonly alt: StatementAltNumber };

/** What may follow a `Node` of a `NodeStatement` (predicts alternative 1), with the end of input (`eof` 10). */
const AFTER_NODE: readonly string[] = [...STATEMENT_START, Tok.RBRACE, Tok.SEMICOLON, Tok.LBRACKET, Tok.EOF];

function edges(entries: ReadonlyArray<readonly [readonly string[], Target]>): ReadonlyMap<string, Target> {
  return new Map(entries.flatMap(([types, target]) => types.map((type) => [type, target] as const)));
}

const NODE: Target = { alt: StatementAlt.NODE_STATEMENT };
const EDGE: Target = { alt: StatementAlt.EDGE_STATEMENT };

/**
 * DFA5 of InternalGraphvizDotParser, the decision of `Statement`, decoded from its tables (`dfa_1s`...`dfa_7s`; the
 * accept states are folded into their edges). A token without an edge is a `NoViableAltException` at that token.
 */
export const STATEMENT_DFA: ReadonlyArray<ReadonlyMap<string, Target>> = [
  // 0: start
  edges([
    [[...DOT_ID_START], { state: 1 }],
    [[Tok.LBRACE, Tok.SUBGRAPH], { alt: StatementAlt.SUBGRAPH }],
    [[Tok.GRAPH, Tok.NODE, Tok.EDGE], { alt: StatementAlt.ATTRIBUTE_STATEMENT }],
  ]),
  // 1: DotID (DFA states 1-4)
  edges([
    [AFTER_NODE, NODE],
    [[Tok.EQUALS], { alt: StatementAlt.ATTRIBUTE }],
    [[Tok.COLON], { state: 2 }],
    [[...EDGE_OPERATOR], EDGE],
  ]),
  // 2: DotID ':' (DFA state 8)
  edges([[[...DOT_ID_START], { state: 3 }]]),
  // 3: DotID ':' DotID (DFA states 11-14)
  edges([
    [AFTER_NODE, NODE],
    [[Tok.COLON], { state: 4 }],
    [[...EDGE_OPERATOR], EDGE],
  ]),
  // 4: DotID ':' DotID ':' (DFA state 15)
  edges([[[Tok.ID], { state: 5 }]]),
  // 5: DotID ':' DotID ':' ID (DFA state 16)
  edges([
    [AFTER_NODE, NODE],
    [[...EDGE_OPERATOR], EDGE],
  ]),
];
