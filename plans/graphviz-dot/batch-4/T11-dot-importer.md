<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11: `DotImporter`

**Owner:** subagent (`claude`, opus). **Budget:** 75 min. **Commit:** `feat(graphviz-dot): port dotimporter`.

## Context

`DotImporter.java` (699 lines) turns a `GraphvizModel` into an ElkGraph with `DotSwitch`-based statement handling, attribute
mapping (`width`, `height`, `fixedsize`, `nodesep`, `pack`, `pos`, and so on: the 20 `Attributes` constants it names), and a
`transferLayout` that writes positions back into the DOT model. It uses `Maps.newHashMap` twice; one map is keyed by
`Pair<ElkNode, String>` (D10, AD-10). It reads `Float.parseFloat` and `Float.valueOf` values.

## Write-set

`src/alg/graphviz/dot/transform/DotImporter.ts` (split if required) and colocated tests.

## Read-set

`transform/DotImporter.java`; T4's `DotSwitch` and model; T10's `IDotTransformationData`/`DotTransformationData` (the
orchestrator's early copy) and `Attributes`; `src/core/util/Pair.ts`;
`src/java/lang/Float32.ts`; `graphviz-dot-import.json`; T7's parser (to read scenario inputs).

## Steps

1. Replay tests first: for every import row, parse the scenario with T7's parser, run `transform`, and compare the ElkGraph
   dump (properties included). For `transferLayout` rows, compare the DOT model dump after transfer, or the exception.
2. Port every method and the anonymous `DotSwitch` subclasses as classes or closures, keeping their method names. For each map,
   decide per AD-10 (`Pair` equality is by value in the Java: use `JavaHashMap` with the `Pair` hash, or prove that lookup is
   all that happens and journal it).

## Acceptance criteria

- Given every `transform` row of `graphviz-dot-import.json`, when replayed, then the ElkGraph dump matches (AD-4 for
  numbers, exact otherwise).
- Given every `transferLayout` row, when replayed, then the DOT model dump matches, or the same exception is thrown.
- Given a malformed number in a scenario, when imported, then the behaviour equals the recorded row (exception or ignored).

**Observability:** N/A. **Rollback:** reversible (new files).
