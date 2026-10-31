<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `p3order.counting` and `intermediate.preserveorder`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port the crossing counters and the model-order comparators`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7c (README), C6–C8. The counters (`CrossingsCounter` 632, `HyperedgeCrossingsCounter` 384,
`AllCrossingsCounter` 129, `BinaryIndexedTree` 120, `CrossMinUtil` 56, `IInitializable` 129) and the comparators
(`ModelOrderNodeComparator` 534, `ModelOrderPortComparator` 445, `CMGroupModelOrderCalculator` 53) depend on the LGraph
model and options only, so they land before the heuristics that use them (T6, T7). They are not processors: the rows
that prove them are P3 rows whose options route through them (`LAYER_SWEEP` with and without greedy switch and model
order; hierarchical levels for the hyperedge counter), replayed in T7/T8 — here they are proven by unit tests whose
expectations are the Java's constants and the counts the rows record where a count is observable (`changed`
properties, node orders) plus the ported interface contracts.

## Task

1. Port the nine classes to `src/alg/layered/p3order/counting/` and `src/alg/layered/intermediate/preserveorder/`
   with `@see`, Java boundaries, section files where needed. `CrossingsCounter.java:337,354`: `Sets.newTreeSet(elements,
   comparator)` (C8); journal the two sites.
2. AD-10: `HashMap<LNode, HashSet<LNode>>` in the comparators and `Maps.newHashMap`/`Sets.newLinkedHashSet` in the
   hyperedge counter are identity-hashed → insertion-ordered `Map`/`Set`, each site journaled; `BinaryIndexedTree` is
   a plain port of its arithmetic (`Int32` ops).
3. C6: every boxed `==`/`!=` per E2a (the comparators compare model orders read from properties).
4. Tests: `BinaryIndexedTree` against the Java test's constants (`JT/p3order/counting/BinaryIndexedTreeTest.java`,
   3 cases, no graph needed — the only hand-built JUnit ported here because it is graph-free); the counters on
   step-built graphs only where a `scenarios/*` row records the resulting order or a count-bearing property;
   comparator contract cases from the Java (reflexivity, the `biggerThan`/`smallerThan` bookkeeping) with the row
   data. No hand-derived crossing counts (L4): the graph-creator suites that assert counts are 7c-tests (C1).

## Write-set

`src/alg/layered/p3order/counting/*.ts`, `src/alg/layered/intermediate/preserveorder/*.ts` and their `.test.ts`.

## Read-set

`J/p3order/counting/*.java`, `J/intermediate/preserveorder/*.java`, `JT/p3order/counting/BinaryIndexedTreeTest.java`,
`src/guava/Sets.ts` (`newTreeSet`), `src/alg/layered/graph/*.ts`, `decisions.md` C6–C8, the P3 rows of
`layered-order.json` with model-order or hierarchical options.

## Interface contract (consumed by T6, T7)

Java signatures, class names and member names exactly (`CrossingsCounter(int[] portPositions)`, `countAllCrossings`,
`countCrossingsBetweenLayers`, `countInLayerCrossingsOnSide`, `switchNodes`, `switchPorts`, `initForCountingBetween`,
…; `AllCrossingsCounter(LGraph)`; `IInitializable.init(Iterable, LNode[][])`; `ModelOrderNodeComparator(LNode[]/Layer,
OrderingStrategy, LongEdgeOrderingStrategy, boolean)`, `ModelOrderPortComparator(...)`, `clearTransitiveOrderingData`).

## Acceptance criteria

- Given the three `BinaryIndexedTreeTest` cases, when ported, then they pass with the Java's values.
- Given every `scenarios/*` and `models/*` P3 row that T7 replays, when the counters and comparators are used through
  the heuristics, then no diff (verified in T7; this task's own tests cover construction, contracts and the two
  `TreeSet` sites).
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
