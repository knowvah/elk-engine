<!-- SPDX-License-Identifier: EPL-2.0 -->

# T22 — `validate`, `serialize` and the round trip

**Agent:** typescript-pro · **Commit:** `feat(T22): add elkgraphtext validate and serialize with round trip`

## Context
Finishes the G4 entry point and proves the mission's central claims: ElkGraph -> `.elkt` is byte-exact against
the oracle (D10), `load(serialize(g))` reproduces `g`, and a realworld model's `.json` and `.elkt` yield the same
ElkGraph (D3, `plans/conformance-corpus/decisions.md#d3--model-id-and-source`: "Mission 4b gets a test that a
realworld model's `.json` and `.elkt` parse to the same ElkGraph"). T23 repeats this at full scale.

## Task
1. `src/graph/text/ElkGraphText.ts` (extends T18's file; keep `load` untouched):
   - `validate(root: ElkNode): readonly ElkTextIssue[]` = the harness-equivalent of `IResourceValidator.validate`
     (T11's driver over every object of the tree in `eAllContents` order, T20's `ElkGraphValidator`);
     issue = `{severity: 'error'|'warning', message, line, code: string|null}`; `line` comes from the
     node/position info of the loaded resource, so `validate` needs the positions `load` produced:
     accept the `root` returned by `load` and keep positions in a module `WeakMap<ElkNode, Positions>`
     (immutable once set, not a mutable `let`) — graphs not from `load` get line `0`... unless the T4 rows
     show otherwise; follow T4 (`graph-text-validate.json`), and document the line rule for non-loaded graphs
     in the doc comment.
   - `serialize(root: ElkNode): string` = `ISerializer.serialize(copy, SaveOptions.newBuilder().format())`
     (G2): `EcoreUtil.copy` equivalent (copy the tree first — T19's `sequence_Property` mutates proxy values and
     must not touch the caller's graph; reuse an existing ElkGraph deep-copy helper in `src/graph/util` or `src/emf`
     if present, else add a private `copyGraph` here, `@see` EcoreUtil.copy semantics: containment copied,
     cross-references remapped inside the copy, `eOpposite` maintained by the model), then T19 sequencer + T21
     formatter + T12 render. Throws `Error` subclass `SerializationException` for serialization errors (G2 presence).
2. `test/golden/elkt-roundtrip.test.ts`, three groups:
   a. **T5 rows through the entry point**: every row with `formatted` -> `serialize(source graph)` byte-exact
      (source `elkt` via `load`, `json` via `ElkGraphJson`); rows with `error` throw. (T19/T21 tests already cover
      the parts; this is the integration check.)
   b. **Round trip**: for each T5 success row and each curated model (`test/corpus/elkt-curated.json`, loaded from
      `$ELK_MODELS_DIR` when present): `load(serialize(g))` has no errors and `canonNode(load(...).root)` equals
      `canonNode(g)` (`test/helpers/graph-json-canon.ts:98`, structural: identifiers, geometry, properties as
      `{id,text}`, labels, ports, edges with sections/bend points, section links).
   c. **D3**: `describe.skipIf(models skipped)` — reuse `resolveModelsDir()` (`test/corpus/corpus.ts:122`) as
      `test/corpus/json-sweep.test.ts:30-42` does, with the `it.skip(...)` message form; for every realworld id
      (the 550 with both `<id>.json` and `<id>.elkt`) compare `ElkGraphJson.forGraph(json).toElk()` with
      `load(elkt).root`. **Equality rule (record it in the test header and later in `docs/conformance.md`):**
      `canonNode` trees equal — identifiers, containment structure, edge endpoints and section topology,
      geometry (doubles as `DoubleToString` text, exact), labels' text, and every property as `{id, text}`
      **after proxy resolution** against the CoreOptions-only registry. No property is excluded. A model that
      fails is checked against the oracle's own core-registry parses of the same `.json` and `.elkt` (`ORACLE_REGISTRY=core` parse mode
      from T1 on the two files; T23 runs later): if the oracle differs the same way (TS matches the oracle on both sides), list the id in a named
      constant `D3_ORACLE_DIFFERENCES` with its mechanism (e.g. key spelled differently in the two files and
      unknown to the core registry, G3) and flag the list for the user at mission end; if TS differs where the
      oracle does not, that is stop 7. Never loosen the rule. Time budget for the group < 60 s (test timeout set).
3. Record the chosen equality rule in the journal (`plans/graph-text/decision-journal.md`, append) in 3-5 lines.

## Write-set
`src/graph/text/ElkGraphText.ts`, `test/golden/elkt-roundtrip.test.ts`.
(Colocated `ElkGraphText.test.ts` implicit; extend `test/helpers/*` only by adding a new file, declared in the journal.)

## Read-set
- `ElkGraphText.ts` (T18), `src/graph/text/{serializer,formatting2,validation}/**`, `src/xtext/{validation,formatting2}/**`
- `test/helpers/{graph-json-canon,graph-json-oracle}.ts`, `test/corpus/{corpus,json-sweep.test}.ts`, `test/golden/json-roundtrip.test.ts`
- `plans/conformance-corpus/decisions.md:50-55` (D3), `test/golden/refs/java/graph-text-write.json`, `graph-text-validate.json`
- `tools/oracle/harness/ElkModelReader.java` (how oracle reads both formats)

## Decisions
- [G2](../decisions.md#g2--writer-input-and-oracle-contract), [G4](../decisions.md#g4--entry-point), [G5](../decisions.md#g5--diagnostic-fidelity),
  D3, D10, AD-14 (still not exported).

## Interface contract
Final G4: `load`, `validate(root): readonly ElkTextIssue[]`, `serialize(root): string`. Consumed by T23's sweep
test and T24's documentation. `serialize` never mutates its argument.

## Acceptance criteria
- Given each T5 row, then `serialize` equals the `formatted` text byte for byte, or throws for `error` rows.
- Given any serialized graph, then `load(serialize(g))` has no errors and equals `g` structurally.
- Given a realworld model (local), then its `.json` and `.elkt` produce equal ElkGraphs under the recorded rule (550/550 minus `D3_ORACLE_DIFFERENCES`, each with its oracle evidence).
- Given a graph with proxy property values, then `serialize` leaves the original graph's values untouched.

## Quality bar
README gates; TDD; `npm run complexity` clean; the D3 group needs elk-models and is skipped with a message otherwise (never silently green); no flaky time assertions beyond the stated timeout.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not change `load`'s behaviour or any T5/T3/T4 expectation (STOP 4). Do not widen the equality rule to hide a
difference. Do not commit.
