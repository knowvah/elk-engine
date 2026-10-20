<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: text-follow-ups (mission 4d)

All approved by the user on 2026-10-20 during `/plan-mission`. Earlier decisions (AD-1…AD-16, standing rules, 4b
G1–G8, 4c D1–D13) still apply.

| # | Decision |
|---|----------|
| D1 | Branch `feature/text-follow-ups` off `origin/main` after PR #13 and the C5 PR merge; unsigned per-task commits; the user signs by rebase, pushes, opens the PR, merges with a merge commit |
| D2 | F5 sweep: `--sample 40`, no `--sample-max`, launched in the background at mission start (`nice -n 10`, `--jobs 6`); ingested in the last batch |
| D3 | F6: full re-record in the background (~4 h); the user's F6 request is the AD-13 approval to drop the test-side transport |
| D4 | F5/F6 divergences: diagnosis artifact in the journal; fixed in-mission only if the cause is in a write-set file and the fix is ≤ 1 task, else a new follow-up row |
| D5 | F4: amend elkgraph-model D10: no identity hash; a proxy appends ` (eProxyURI: <uri>)`; the vector strips `@<hex>` |
| D6 | F1: EMF `EcoreFactoryImpl` EInt/EDouble/EString arms in `src/emf/ecore/impl/EcoreFactoryImpl.ts`, reached through `EDataType → EPackage → EFactory` |
| D7 | C3: Equinox `OperationCanceledException` goes to `src/equinox/core/runtime/`; boundary rule pre-approved (amendment below) |
| D8 | C1: the `.elkj` scope provider is exposed by the `ElkGraphJsonLinking` bundle; the serializer uses it; STOP if the Java wires more than one instance |

## D1: branch and landing

4c's D9 pattern. The C5 commit (`fix/scope-lookup-budget`, signed) must be on `origin/main` first, because both it
and this mission append to `plans/graph-json-text/{decision-journal,follow-ups}.md`.

## D2: F5 sweep

`nohup nice -n 10 tools/oracle/elkj-sweep.sh --sample 40 --jobs 6 >"$ELK_ORACLE_DIR/sweep/elkj-f5.log" 2>&1 &`.
The 4c outputs in `$ELK_ORACLE_DIR/sweep/` stay: the script reuses finished stages and chunks (header of
`tools/oracle/elkj-sweep.sh`). Estimate 5–10 h wall clock (LOW confidence: the serializer cost grows unevenly with
graph size). The TS side and the comparison follow 4c T17 ([T17-sweep.md](../graph-json-text/batch-9/T17-sweep.md)).

## D3: F6 re-record

`tools/vectors/ElkjRoundTripVectors.java` reloads each written text from the `String` (an in-memory
`StringReader`/`URIConverter` path, not `getBytes(UTF_8)`, line ~257), so a lone surrogate survives instead of
becoming `?`. The old cache is gone, so the full re-record runs from scratch (`[<cacheDir> [<idsFile>]]` arguments,
cache under `$ELK_ORACLE_DIR/rerecord/f6/`). Expected diff: `input-lone-surrogate-escape` only.

## D4: divergences

"In-mission" means the root cause is in a file already in some task's write-set and the fix fits one task (T11b).
Anything else: a new row in `plans/graph-json-text/follow-ups.md` with the diagnosis artifact's journal reference.

## D5: proxy `toString` (amends elkgraph-model D10)

EMF `BasicEObjectImpl.toString` is `getClass().getName() + '@' + hex(hashCode())` plus ` (eProxyURI: <uri>)` for a
proxy. The 9 generated ELK arms (`if (eIsProxy()) return super.toString();` in ElkBendPoint, ElkEdge, ElkEdgeSection,
ElkGraphElement, ElkLabel, ElkNode, ElkPort, ElkShape, ElkPropertyToValueMapEntry `Impl`) return it. The TS keeps
D10's hashless class name and adds the suffix; the vector recorder strips `@<hex>` so the rows compare exactly.

## D6: EMF factory

Minimal `EDataType`, `EPackage`, `EFactory` interfaces in `src/emf/ecore/`, an `EcorePackage` holder for the `EInt`,
`EDouble`, `EString` literals, and `EcoreFactoryImpl` with the matching `createFromString`/`convertToString` arms,
reusing `src/java/lang/{JavaInteger,JavaDouble,DoubleToString}`. Only the three datatypes the grammars reach; the
other Ecore datatypes are YAGNI.

## D7: Equinox class and boundary rule

Xtext's `OperationCanceledManager` imports `org.eclipse.core.runtime.OperationCanceledException` (bundle
`org.eclipse.equinox.common`, in Xtext's `Require-Bundle`). It goes to
`src/equinox/core/runtime/OperationCanceledException.ts`.

**Amendment (2026-10-20, user decision, pre-approved AD-13 change):** T5 extends
`test/architecture/module-boundaries.fitness.test.ts`: a `src/equinox` rule (imports only `src/equinox` and
`src/java`), `src/xtext` may import `src/equinox`, the `src/xtext` message at :99 and the matching expectation at
:507 name `src/equinox`, the header comment (:36) no longer says equinox is unreached, and a new `src/equinox`
describe block mirrors the `src/emf` one. Journal it as this amendment. Any other fitness change is stop 4.

## D8: one scope provider

`ElkGraphJsonRuntimeModule.xtend` binds no scope provider of its own; the generated
`AbstractElkGraphJsonRuntimeModule` (`src-gen`) binds `IScopeProvider` and its delegate. T6 first checks whether
Guice gives the linker and the serializer's `CrossReferenceSerializer` the same instance (`@Singleton`, or binding
scope) and whether the TS serializer's duplicated wiring is equivalent. One shared provider: proceed. Separate
instances whose state could differ: stop 3.
