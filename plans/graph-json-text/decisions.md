<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — graph-json-text (locked 2026-10-15)

All approved by the user during planning (D2 as A′, D11 as B). They amend, never rewrite, AD-1…AD-16
(`plans/elk-engine-skeleton/decisions.md`), D0–D10 of `plans/conformance-corpus/decisions.md` (D8 governs the
parser), the standing rules and amendments (`plans/core-metadata/decisions.md`), and G1–G8
(`plans/graph-text/decisions.md`), which D3–D9 carry over.

| ID | Decision |
|----|----------|
| D1 | The grammar-agnostic parse runtime moves from `src/graph/text/parser/ParseRecords.ts` to `src/xtext/parser/` (A) |
| D2 | Inputs and exit: three parse tiers (ELK-native `.elkj`, ELK JSON as `.elkj`, lenient scenarios) + writer tier (A′) |
| D3 | Writer = grammar-specific sequencer + `ElkGraphJsonFormatter` line by line; oracle `serialize(format())` (G1/G2) |
| D4 | All refs and vectors use the CoreOptions-only registry (`ORACLE_REGISTRY=core`) (G3) |
| D5 | Internal entry point `ElkGraphJsonText`: `load`, `validate`, `serialize`; not exported (AD-14, G4) |
| D6 | Syntax errors presence-only (D8 #1); linking, conversion and validator issues exact (G5) |
| D7 | Hand-written lexer reproduces the generated ANTLR lexer, incl. quoted keywords vs `STRING` (G6) |
| D8 | Committed: JVM vectors + ~30 curated refs with vendored inputs (CI); full sweep local only (G7) |
| D9 | One mission, 18 tasks, 9 batches; unsigned task commits; user signs by rebase; merge commit (G8) |
| D10 | AD-16 applies: Java error conditions and exception chains; no new Java-named shims for uncaught JVM errors |
| D11 | Linking: eager resolution at load with lazy-equivalent observable results, proven by vectors (B) |
| D12 | Oracle seam patch `0002` makes `GraphIdentifierGenerator`'s id-collision `Random` seedable (proposed in Phase 7; approved by the user 2026-10-15) |

## D1 — Shared parse runtime

Fact: `src/graph/json/text` may import only `src/core`, `src/graph` and (once listed in `XTEXT_CLIENT_BUNDLES`)
`src/xtext` — `test/architecture/bundle-deps.json` mirrors Java's `Require-Bundle`, and `graph.json.text` does not
require `graph.text`. `ParseRecords.ts` mixes grammar-specific parts (`Tok`, `RuleName`, the `ElkGraphToken` type)
with generic ones (`TokenCursor`, `ParseSession`, `ParseRecords` node model and `IssueLocator`, `ReferenceNode`,
`SyntaxFailure`, `Assignment`, `Span`, `GroupMember`).
Decision: move the generic parts to `src/xtext/parser/`, generic over the token type; `src/graph/text` keeps its
grammar tables and changes imports and generic parameters only. Every 4b test, vector and ref stays byte-identical
(stop 5). Rejected: copying (~350 duplicated lines) and a `graph.json.text → graph.text` edge (contradicts AD-8).

## D2 — Inputs and exit bar (A′)

Fact: the pinned elk-models has no `.elkj` (checked by absolute path, at `ac5af2b` and in its history), and the
eclipse-elk GitHub org holds none (extension search over its 5 repositories). ELK produces `.elkj` with
`ConvertGraphHandler` (`graph.json.text.ui`): `EcoreUtil.copy`, `GraphIdentifierGenerator.forGraph(g).assertValid
.assertExists.assertUnique.execute()`, then `resource.save(Collections.EMPTY_MAP)` — the serializer **without** the
formatter. The grammar accepts plain ELK JSON (unknown members fall to `JsonMember`).
Decision, three parse tiers + the writer tier:
1. **ELK-native `.elkj`:** the oracle applies those steps to 898 `.elkt` + 550 `.json` and writes 1,448 `.elkj` into
   the sweep dir (never the repo, AD-5); the port parses and validates each equal to the oracle.
2. **ELK JSON as `.elkj`:** 550 realworld `.json` + the repo's ELK JSON (`tools/vectors/graph-json-scenarios/`,
   `tools/vectors/transfer-scenarios/`, `test/corpus/generated/*.json`) read by the `.elkj` language.
3. **Lenient scenarios** (vectors): bare keys, `'…'` strings, trailing commas, the three keyword spellings,
   `properties` vs `layoutOptions`, unknown members, unresolved references.
Writer: 1,448 graphs (loaded from `.elkt` and `.json`) written with `serialize(format())` byte-exact, then reparsed.
A curated subset per tier is vendored (`test/corpus/elkj-curated/`) so it runs in CI. T18 appends a roadmap revision
restating the 4c exit this way.

## D3 — Writer

Carry G1/G2: one sequencer method per grammar rule following the generated semantic sequencer's constraint
comments, `ElkGraphJsonTransientValueService`, and `ElkGraphJsonFormatter` ported line by line on the existing
`src/xtext/formatting2` subset. Input: any ElkGraph without a node model. Oracle: `EcoreUtil.copy` +
`serialize(format())` with the core registry. A graph the grammar cannot express (edge sections, bend points) gets
whatever the oracle does; oracle failures match by presence. Never port Xtext's generic NFA sequencer (stop 10).

## D11 — Linking

Fact: `ElkGraphJsonRuntimeModule.xtend` binds no `ILinker`, so Xtext's `DefaultRuntimeModule.java:174-175` binding
`LazyLinker` applies: `sources`/`targets` are proxies after load and resolve when read (the exporter, or validation's
lazy cross-reference resolution); unresolved-reference diagnostics appear then. (`.elkt` binds the eager
`ElkGraphLinker`.)
Decision (B): resolve eagerly at load with `src/xtext/linking` (flat names, D-scoping as upstream) and surface each
diagnostic where the oracle surfaces it: load errors vs `validate` issues, order and text as recorded. T3/T4 record
the observable timing and the export of unresolved references. If a vector shows behaviour that needs real proxies,
stop 9: option A (port `LazyLinker`, `LazyLinkingResource`, `LazyURIEncoder` and EMF proxy support) is the user's call.

## D12 — Seedable identifier generator (proposed in Phase 7, approved 2026-10-15)

Fact: `GraphIdentifierGenerator.java:352-363` renames a duplicate identifier to `<id>_g` + a four-digit number from
an unseeded `new Random()` (`assertUnique`). Measured with the TS loaders: 48 of the 898 `.elkt` models (0 of the 550
`.json`) carry duplicate identifiers, so D2's tier-1 conversion would differ between runs for them (stop 7). 340 graphs
miss identifiers; `assertExists` fills those deterministically.
Decision: patch `tools/oracle/patches/0002-graph-seedable-GraphIdentifierGenerator-random.patch`, the same seam as
`0001` (conformance-corpus D5b): a system property (`org.eclipse.elk.graph.util.identifierSeed`) seeds the `Random`
when set and changes nothing otherwise; only the harness `convert` mode sets it (seed 1). The TS never consumes the
sequence (it only parses the converted files), so no shim is needed. Every existing ref stays byte-identical after the
rebuild. If the user rejects D12: tier 1 excludes those 48 models and the journal lists them.
