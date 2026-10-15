<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — `ElkGraphJsonParser`: one method per rule on the `src/xtext/parser` runtime

**Agent:** typescript-pro · **Commit:** `feat(T11): add the elkj recursive-descent parser`

## Context
4b precedent: `src/graph/text/parser/{ElkGraphParser,ElkGraphParserEdges}.ts` — one method per `.xtext` rule with
Xtext's LL decisions (D8), objects created through the ElkGraph factory and appended in source order
(`DefaultEcoreElementFactory`), cross references recorded as `ReferenceNode`s and left unset, value conversion
through the service with the entry as semantic element. Grammar: `ElkGraphJson.xtext` (171 lines). Notable:
fragments (`NodeElement`, `PortElement`, …) are alternatives keyed by the first token (a key keyword, `STRING`/`ID`
for `JsonMember`); `JsonMember`/`JsonObject`/`JsonArray`/`JsonValue` build nothing (values are discarded but must
parse); `ElkNode` allows an empty object and a trailing comma, `ElkPort`/`ElkLabel`/`ElkEdge` need one element;
`Property` value alternatives `StringValue | NumberValue | BooleanValue` (no `null`: a syntax error);
`PropertyKey hidden()` is `STRING | ID` as one token.

## Task
1. `ElkGraphJsonParser.ts` (entry `parse(text, services) → ParseResult`) and as many method-boundary splits as the
   complexity gate needs (`ElkGraphJsonParserElements.ts` for the element fragments, `ElkGraphJsonRecords.ts` for the
   rule-name and token tables consumed by the T7 runtime). One method per rule or fragment; cite `ElkGraphJson.xtext`
   line ranges.
2. Record per object: start lines, feature lines, containment slots and reference records (`sources`/`targets` with
   rule `STRING`, linked later by T12), exactly as 4b's `ParseRecords` usage.
3. Syntax errors: the first stops parsing (D6, presence only); conversion diagnostics as the oracle reports them.
4. Tests: replay the `graph`, `properties` and syntax-diagnostic parts of every T3 row with linking off (references
   checked as recorded texts only), plus parser unit tests for each rule's decision.

## Write-set
`src/graph/json/text/parser/{ElkGraphJsonParser,ElkGraphJsonParserElements,ElkGraphJsonRecords}.ts` (+ tests).

## Read-set
`ElkGraphJson.xtext`, `src/graph/text/parser/{ElkGraphParser,ElkGraphParserEdges}.ts`, `src/xtext/parser/**` (T7),
`src-gen/.../parser/antlr/internal/InternalElkGraphJsonParser.java` (decision edge cases only), T3/T8/T9 contracts.

## Interface contracts (outputs)
`parse(text, services): ParseResult` with `root`, `diagnostics`, `references` (`ReferenceNode[]` in source order),
`nodeModel`, `positions` — the 4b `ParseResult` shape. Consumed by T12 and T13.

## Acceptance criteria
- Given every T3 row, when parsed without linking, then the graph, properties and the presence of a syntax error
  match.
- Given each lenient-syntax scenario, when parsed, then no syntax diagnostic is reported.
- Given `layoutOptions: { "k": null }`, when parsed, then a syntax error is reported (as recorded).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
