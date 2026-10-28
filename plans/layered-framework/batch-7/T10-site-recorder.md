<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Oracle recorder `LayeredSiteVectors`

> **Superseded under X5** by [T10-site-recorder-x5.md](T10-site-recorder-x5.md); kept for the record.

**Agent:** java-architect (sonnet) · **Commit:** `test(T10): record layered site vectors from the oracle`

## Context

Mission 7a (README), L4. T9 listed the 7a branches the replays leave unreached and one scenario per branch group.
This recorder runs each scenario on the oracle and records the values the anchored tests (T11) will assert. It
follows the 6c `NodespacingSiteVectors` pattern exactly.

- **Patterns, read first:** `tools/vectors/{NodespacingSiteVectors.java,nodespacing-site-vectors.sh}` (row
  `{ id, site, input, steps, expected }`, `steps` vocabulary, round trip, stability, cache) and
  `tools/vectors/LayeredFrameworkVectors.java` (T1; classpath with the layered jar, LGraph dump helpers — copy what is
  needed, single-file launchers cannot share code).
- **Never edit** `vector-cache.sh`, `JavaVectors.java`, landed refs (including `layered-framework.json`), or other
  recorders; do not run other recorder scripts.

## Task

1. `tools/vectors/LayeredSiteVectors.java`: one row per `plans/layered-framework/unreached.md` scenario, id as listed.
   `input` = ELK JSON (NS1 flags) or `null`; `steps` = the scenario's calls on the imported LGraph, from a vocabulary
   documented in the header (one op per public Java method used, args as strings/hex); `expected` = the fields the
   scenario names, hex doubles.
2. Round trip: re-import each `input`, replay `steps`, fail on any difference from the directly built scenario.
   Stability: build twice, byte-identical.
3. `tools/vectors/layered-site-vectors.sh`: cache namespace `layered-sites`, writes
   `test/golden/refs/java/layered-sites.json`, `shellcheck -x` clean; run twice (second a cache hit).

## Write-set

`tools/vectors/{LayeredSiteVectors.java,layered-site-vectors.sh}`, `test/golden/refs/java/layered-sites.json`.

## Read-set

`plans/layered-framework/unreached.md`; the two pattern recorders above; the Java classes named in the table.

## Interface contract (consumed by T11)

```json
{ "jdk": "...", "oracle": "<commit>", "rowCounts": { "<class>": n },
  "rows": [ { "id": "site/Tarjan/two-cycles", "site": "Tarjan", "input": { }, "steps": [ { "op": "...", "args": [] } ],
              "expected": { } } ] }
```

## Acceptance criteria

- Given two consecutive runs, then the JSON is byte-identical and the second is a cache hit.
- Given every row with a graph, when re-imported and replayed, then it equals the directly built scenario.
- Given `unreached.md`, when compared with the rows, then every scenario id has exactly one row.
- Given `git status`, then no landed file under `test/golden/refs/` changed.

## Observability / Rollback

N/A — test tooling. Reversible: revert the commit.
