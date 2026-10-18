<!-- SPDX-License-Identifier: EPL-2.0 -->

# Follow-ups — graph-json-text (mission 4c)

Written 2026-10-18 at the user's request so the open items survive the session. Consolidates the README "Open flags",
the decision journal and the T16b results. Status column: `open` until a commit closes it (record the task id and
date here when one does; never delete a row).

## Before landing (this branch)

| # | Item | Owner | Status |
|---|------|-------|--------|
| B1 | Finish the final gate: `elkj-vectors.sh` full replay incl. `ElkjRoundTripVectors` (the 712 KB model alone takes hours) — all six refs `cmp`-identical; close the brief | orchestrator | open |
| B2 | Docs predate T16b: add the round-trip vectors (281 rows, 244 byte-equal, 37 errors, 27 endpoint drops), the `ElkGraphCopy` bidirectional-copy fix and the lone-surrogate transport note to `docs/architecture/elk-json-text.md` (evidence table, runbook: recorder cost), `docs/conformance.md` §8 and the README mission summary | orchestrator / documentation-engineer | open |
| B3 | Landing (stop 16): user signs by rebase (YubiKey), pushes, opens the PR (size justification), merges with "Create a merge commit" — commands in README "Branch and landing (D9)" | user | open |

## After landing — port fidelity

| # | Item | Evidence / mechanism | Status |
|---|------|----------------------|--------|
| F1 | Port Xtext's `DefaultTerminalConverter` (`registerEFactoryConverters`, `EInt`/`EDouble` EFactory conversions) to replay the 45 SIGNED_INT/FLOAT converter rows; 3 type-erasure rows (`Number.toString(int:1)`, `StringValue.toString(float:2.0)`, `INT.toString(double:1.5)`) stay unreproducible (TS `number`) | journal T9; same gap as 4b T13 | open |
| F2 | `.elkt` bare-CR diagnostic lines: record a 4b JVM vector with a lone-CR input first (AD-13), then give the `.elkt` parser the node-model `LineSource` as `.elkj` has | journal fix(T11); 4b uses `TOKEN_LINE_SOURCE` | open |
| F3 | `.elkt` writer: 4b's `copyGraph` (`src/graph/text/ElkGraphText.ts:279-298`) lacks EMF `Copier.copyReference`'s bidirectional `indexOf`/`move` branch, so a repeated endpoint (`a, a`) likely serializes where the JVM throws `IndexOutOfBoundsException` — record a 4b vector, then port the branch (see `ElkGraphCopy.copyBidirectionalMany`) | journal T16b1/T16b2 | open |
| F4 | `ElkNodeImpl.toString` proxy arm (Java prints a proxy via `super.toString()`); only observable through `edge.toString()` over a proxy endpoint | journal T12e | open |
| F5 | Fuller `.elkj` sweep: sample 6 larger graphs instead of ~40 (D2 amendment); `tools/oracle/elkj-sweep.sh --sample N --sample-max BYTES` as an overnight job | journal T17 | open |
| F6 | Optional: make `ElkjRoundTripVectors` reload from the `String` (not `getBytes(UTF_8)`) so lone surrogates are not turned into `?`, re-record, drop the test-side transport | journal T16b2 | open |

## After landing — cleanups and tooling

| # | Item | Evidence | Status |
|---|------|----------|--------|
| C1 | The `.elkj` serializer duplicates the scope wiring of `createElkGraphJsonLinking` (expose the scope provider from the linking services) | journal T15 | open |
| C2 | `ElkGraphCopy` (`.elkj`) and 4b's `copyGraph` are two EcoreUtil.copy ports (AD-8 forbids sharing across text bundles); a single home in `src/graph/util` would serve both (fixes F3 at the same time) | journal T16 | open |
| C3 | Move `ExceptionDiagnostic` and the cancellation stand-ins (`CancelIndicator`, `OperationCanceledException`, `OperationCanceledError`) from `src/xtext/linking/lazy/` to their Xtext packages (`diagnostics`, `util`/`service`) | journal T12d | open |
| C4 | `elkj-vectors.sh` now takes hours (the round-trip recorder's 712 KB model); decide: keep, give the recorder a cache/skip-large option for gates, or move that row to the sweep | journal T16b1 | open |
| C5 | Pre-existing timing flake `src/xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.test.ts` (300 ms budget fails at load ≳ 25); needs a user decision on a load-tolerant budget (AD-13) | journal batch 3, 5b | open |
| C6 | `docs/architecture/port-map.md` has no `graph.json.text` section; `docs/architecture/inventory.md`'s `graph.json.text` row predates the port | README final gates | open |

## Out of this mission, still pending from earlier ones

See the memory index (`MEMORY.md`) entries for missions 3–4b; nothing here supersedes them.
