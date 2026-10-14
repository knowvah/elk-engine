<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — graph-text (locked 2026-10-14)

All approved by the user during planning. They amend, never rewrite, AD-1…AD-15
(`plans/elk-engine-skeleton/decisions.md`), M1–M8, D0–D10 (`plans/conformance-corpus/decisions.md`;
D3, D8, D10 govern this mission), C1–C10 + the standing rules and their 2026-10-14 amendments
(`plans/core-metadata/decisions.md`), and J1–J10 (`plans/elk-json-adapter/decisions.md`).

| ID | Decision |
|----|----------|
| G1 | Writer = grammar-specific sequencer + minimal `formatting2` subset; `ElkGraphFormatter` line by line |
| G2 | Writer input = any ElkGraph without a node model; oracle = `EcoreUtil.copy` + `serialize(format())` |
| G3 | Parse/validate/write refs use the CoreOptions-only registry (`ORACLE_REGISTRY=core`, C8 service) |
| G4 | Internal entry point `ElkGraphText`: `load`, `validate`, `serialize`; not exported (AD-14) |
| G5 | Syntax errors presence-only (D8 #1); linking, conversion, validator issues exact |
| G6 | Hand-written lexer reproduces the generated ANTLR lexer's token decisions |
| G7 | Committed: JVM vectors + ~30 curated refs (CI). Full 898/1,448-input sweep is local only |
| G8 | One mission, 24 tasks, 9 batches; unsigned task commits, user signs by rebase at the end |

## G1 — Writer architecture

Facts: ELK overrides only `ElkGraphSemanticSequencer.sequence_Property`,
`ElkGraphTransientValueService` and `ElkGraphFormatter`; the generated
`AbstractElkGraphSemanticSequencer` (`src-gen/.../serializer/`, 246 lines) sends 7 of 9 rules to
Xtext's generic backtracking sequencer. Xtext 2.36 `serializer` is ~9.2k non-comment lines and
`formatting2` ~6.9k, both driven by a runtime grammar model.

Decision: do **not** port Xtext's generic serializer. Write one sequencer method per grammar rule,
emitting assignments in the order fixed by the constraint comments of the generated semantic
sequencer and by `ElkGraph.xtext`; the syntactic sequencer's single ambiguity
(`emit_ElkEdge___LeftCurlyBracketKeyword_7_0_RightCurlyBracketKeyword_7_4__q`) is ported as the
generated code resolves it. Port only the `formatting2` pieces `ElkGraphFormatter` uses (region
access, `regionFor.keyword/keywords/assignment`, `append`/`prepend`, `interior` + `indent`,
`noSpace`/`oneSpace`/`newLine`/`setNewLines(1, 1, 2)`, conflict merge, rendering) from Xtext's EPL
source. Cross-reference text comes from the scope (Xtext's `CrossReferenceSerializer` semantics).

Quirk to keep: `ElkGraphSemanticSequencer.isQuotingNecessary` always returns `false`. Its
`split(...).map[idValueConverter.toString(it)]` result is unused, so the Xtend compiler emits the call
commented out and `return false` (`$ELK_ORACLE_DIR/plugins/org.eclipse.elk.graph.text/xtend-gen/org/eclipse/elk/graph/text/serializer/ElkGraphSemanticSequencer.java:80-94`;
the never-injected `idValueConverter` is therefore never dereferenced). Verified while writing the brief;
T5 vectors confirm it. Port the behaviour, cite it in a comment, list it in `docs/conformance.md`.

Stop 8 if a vector can only be met by the generic NFA sequencer or `formatting2` beyond this subset.

## G2 — Writer input and oracle contract

The TS ElkGraph has no node model (AD-11), so the writer serialises semantic state only. The oracle
reference for an input is `EcoreUtil.copy(root)` placed in a fresh `XtextResource`, then
`ISerializer.serialize(copy, SaveOptions.newBuilder().format().getOptions())` (formatted) and
`ISerializer.serialize(copy)` (unformatted, used to test the sequencer alone). Inputs: every
elk-models `.elkt` (parsed, then written) and every realworld `.json` (via `ElkGraphJson`).
Checks: byte-exact text, and `load(serialize(g))` equals `g`. Serialization failures (e.g. a node
without identifier) match by presence only.

## G3 — Option registry for refs

`LayoutMetaDataService` is filled by `ServiceLoader` from the jars on the classpath. The oracle's
default classpath registers every algorithm, so suffix lookups (`PropertyKeyValueConverter`,
`PropertyValueValueConverter`, `ElkGraphValidator`) differ from the CoreOptions-only TS registry for
~177 models. `tools/oracle/run.sh` gains an opt-in `ORACLE_REGISTRY=core` mode; no ELK patch.
All graph.text vectors and refs use it. Default-mode invocations stay byte-identical.

Mechanism (refined while writing the brief; same intent as approved): before anything touches the
registry, call `LayoutMetaDataService.getInstance(new ClassLoader(null) { })`
(`LayoutMetaDataService.java:74-88`): it registers `new CoreOptions()` and its ServiceLoader pass finds
nothing, which is exactly the TS registry (C8) and the pattern `tools/vectors/MetaDataVectors.java:126-130`
already uses. The later no-arg `getInstance()` calls from Xtext/ELK code return that singleton. Filtering
jars off the classpath is the fallback only if this fails. T1 proves parity: the recorded option-id set
equals the TS `LayoutMetaDataService.getInstance()` option-id set (stop 6 otherwise).

Deferrals: the core-only oracle still registers `org.eclipse.elk.fixed`, `box`, `random`, which the
TS registry defers to mission 5 (`MISSION5_PROVIDERS`, `src/graph/json/JsonMetaDataConverter.test.ts:36`).
Validator vectors whose outcome depends on those algorithms are tagged `deferred: "mission5"` and
skipped by a named filter whose test fails once mission 5 registers them. Missions 5 and 7
regenerate these refs as the registry grows (roadmap follow-up, T24).

## G4 — Entry point

`src/graph/text/ElkGraphText.ts`, internal (nothing exported from `src/index.ts`, AD-14), mirroring
the three Xtext services the oracle harness uses:

```ts
load(text: string): { root: ElkNode | null; errors: readonly ElkTextDiagnostic[] } // never throws on bad input
validate(root: ElkNode): readonly ElkTextIssue[]                                    // IResourceValidator
serialize(root: ElkNode): string                                                    // throws like ISerializer
```

`ElkTextDiagnostic = { kind: 'syntax' | 'linking' | 'conversion'; severity; message; line }`;
`ElkTextIssue = { severity: 'error' | 'warning'; message; line; code: string | null }`.
Documented in `docs/architecture/elk-text.md` as a port-local entry point.

## G5 — Diagnostic fidelity

- Syntax errors: only presence must match (D8, known divergence #1).
- Linking diagnostics, value-converter diagnostics and validator issues: `message`, `severity` and
  `line` must match exactly (deterministic Xtext/ELK text, not ANTLR artifacts). Validator `code`
  matches too.
- Validator evidence: `IResourceValidator` vectors (T4) on curated scenarios; the local sweep (T23)
  compares validator output for all 898 models.

## G6 — Lexer

The hand-written `ElkGraphLexer` reproduces the token decisions of the generated
`InternalElkGraphLexer` (`src-gen/.../parser/antlr/internal/`, EPL): keyword vs `RULE_ID`,
`RULE_SIGNED_INT` / `RULE_FLOAT` / `RULE_INT`, signs, exponents, `^`-escaped IDs, `RULE_STRING`
escapes, comments, `RULE_ANY_OTHER`, and `PropertyKey`'s `hidden()` (no whitespace inside keys).
The src-gen lexer is read as the edge-case spec, never ported line by line (D8). Every ambiguous
boundary has a T2 vector.

## G7 — Evidence layout

Committed (CI): `test/golden/refs/java/graph-text-{lexer,parse,validate,write}.json` and
`test/golden/refs/elkt-parse/` (~30 curated elk-models, list in `test/corpus/elkt-curated.json`).
Local only (elk-models is not vendored): `tools/oracle/elkt-sweep.sh` over 898 `.elkt` + 550
realworld `.json`; per-model verdicts under `$ELK_ORACLE_DIR/sweep/` (AD-5); counts journaled and
written to `docs/conformance.md`.

## G8 — Size and landing

24 tasks / 9 batches (batch 2 split into 2a/2b). Landing respects the standing practice "PRs with
signed commits" (user, 2026-10-14); signing needs the user's YubiKey PIN + touch, which the agent
cannot provide.

- The executor commits **unsigned**, one commit per task, on `feature/graph-text`. The journal cites
  task ids, never SHAs (SHAs change when the user signs).
- At mission end the executor **stops** and hands the user, to run in their terminal:
  `git rebase --exec 'git commit --amend --no-edit -n -S' main` (one touch per commit), then
  `git push -u origin feature/graph-text`, `gh pr create`, required checks, merge commit on GitHub.
- The executor never signs, pushes, opens the PR, or merges locally.
- PR size (> 400 lines) is justified in the PR body as a mission branch.

## Operational readiness (Phase 4)

Library port: no runtime telemetry or logging in `src/`. Reversible (revert the merge).

| Indicator (local sweep) | Bar |
|---|---|
| parse-equal | 898/898 minus approved deferrals |
| validate-equal | 898/898 minus G3 deferrals |
| writer byte-exact | 1,448/1,448 (898 `.elkt` + 550 `.json`) |
| reparse-equal after write | 1,448/1,448 |
| D3 realworld `.json` ≡ `.elkt` | 550/550 |

Budgets: parse + link of the largest model (`realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt`,
253 KB) < 1 s; TS side of the sweep < 2 min; `npm test` ≤ ~60 s. Scope lookups cache per link pass
(as Xtext's `IResourceScopeCache`); never simplify the algorithm.

Maintenance failure modes and their runbook go in `docs/architecture/elk-text.md` (T24): elk-models
pin move → diagnose against the oracle; registry growth (missions 5/7) → regenerate core-only refs by
script and journal; ELK/Xtext pin change → regenerate vectors by script (AD-13).

## Brief refinements (made while writing the task specs, 2026-10-14)

Binding like G1–G8; they refine mechanisms or fill gaps the Phase 2 file table missed. None changes
an approved decision's intent.

1. **G3 mechanism.** Core mode = the C8 singleton (`getInstance(new ClassLoader(null) { })`) established
   by the harness before Xtext setup, with `ElkOracle.registerMetaDataProviders()` skipped (it registers
   every algorithm explicitly). `ElkOracle --list-options` prints the registry's option ids as the
   parity evidence (T1).
2. **G1 quirk mechanism** corrected in G1: the compiler drops the unused `map` (verified in `xtend-gen`).
3. **`LayoutOptionValidator`** (`org.eclipse.elk.core.validation`, 122 lines) is injected into
   `ElkGraphValidator` and was not ported: T20 ports it to `src/core/validation/LayoutOptionValidator.ts`
   and exports the existing module-private `findBestEdgeContainment` from `src/graph/util/ElkGraphUtil.ts`
   (Java: `public static`).
4. **Reflection facades.** The TS `EObject` has no metamodel (mission-2 D4). T14 defines
   `EReferenceInfo`/`EClassRef`, T16 defines `ReferenceAccess`, and T17 implements both for ElkGraph's five
   cross-references in `src/graph/text/linking/ElkGraphReferences.ts` (port-local, no Java counterpart).
5. **`src/xtext` support files** beyond the Phase 5 list (push-forward: `src/xtext` internals): T7
   `util/JavaStringConverter`, `common/services/DefaultTerminalConverters`, `parser/antlr/TokenTool`,
   `AbstractRule`, `nodemodel/{INode,ICrossReferenceNode,INodeModel}` (interfaces the parser implements;
   no node model is built); T8 `util/{IResourceScopeCache,ResourceScopeCache}`; T11
   `diagnostics/Severity`; T14 `resource/**`; T16 `diagnostics/**`. T9 adds `ElkGraphTokenType.ts`.
6. **T12 → T19 contract:** each sequencer token also carries `assignment` (id of the enclosing Assignment
   or `null`), which `regionFor.assignment` needs.
7. **T6:** `test/architecture/bundle-deps.json` is generated from the ELK manifests and stays
   byte-identical; only the fitness test and `.prettierignore` change.
8. **T23** adds `tools/oracle/ElktSweep.java` (oracle validate/write over many inputs; the harness has
   only `parse`/`layout`/`generate` modes).
9. **D3 equality rule (T22):** canonical trees after proxy resolution, no excluded properties. A
   mismatch where the core-registry oracle differs the same way is listed in `D3_ORACLE_DIFFERENCES` with
   its mechanism and flagged for the user; a mismatch the oracle does not share is stop 7.
