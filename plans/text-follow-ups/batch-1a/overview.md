<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1a: vectors first (F6, F2, F4)

Each task records JVM evidence before any TS change (AD-13). Runs in parallel with batch 1b (disjoint write-sets).
T1 is the orchestrator's (a long JVM job); T2 and T3 are agents. Only the orchestrator commits, one commit per task.
JVM recorders share CPU with the F5 sweep: run them with `nice -n 5` and expect slower runs.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T1](T1-f6-recorder.md) | F6: round-trip recorder reloads from the `String`; launch the full re-record | orchestrator | `tools/vectors/ElkjRoundTripVectors.java` | — | [ ] |
| [T2](T2-f2-elkt-lone-cr.md) | F2: lone-CR `.elkt` vector, then the node-model line source in the `.elkt` parser | typescript-pro | `tools/vectors/elkt-parse-scenarios/*` (new), `graph-text-parse.json`, `src/graph/text/parser/ElkGraphParser.ts`, PF1 count literals | — | [ ] |
| [T3](T3-f4-proxy-tostring.md) | F4: proxy `toString` vector rows, then the EMF suffix and the 9 proxy arms | typescript-pro | `GraphVectors.java`, `graph-scenarios.txt`, `graph.json`, `BasicEObjectImpl.ts`, 9 `src/graph/impl/Elk*Impl.ts` | — | [ ] |

Batch gate: README "Quality gates". Stop 9 applies to every re-recorded ref: only added rows.
