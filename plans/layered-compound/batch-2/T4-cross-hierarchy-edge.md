<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — `CrossHierarchyEdge`, `CrossHierarchyEdgeComparator`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): port cross-hierarchy edges and their comparator`
Scratch: `$TMPDIR/7h/T4/`.

## Context

Mission 7h, H1, H3, H7, H11. `J/compound/CrossHierarchyEdge.java` (115 lines) is staged at
`src/alg/layered/compound/CrossHierarchyEdge.ts` (marker on line 2, row in `test/architecture/staged-classes.json`).
`CrossHierarchyEdgeComparator.java` (84) has no TS file. Both processors store segments under
`InternalProperties.CROSS_HIERARCHY_MAP` (`J/options/InternalProperties.java:342`, a Guava `Multimap<LEdge, CrossHierarchyEdge>`
built as a `HashMultimap`, `J/compound/CompoundGraphPreprocessor.java:107`). The TS property is already declared as
`IProperty<Multimap<LEdge, CrossHierarchyEdge>>` (`src/alg/layered/options/InternalProperties.ts:269`, `src/guava/Multimap.ts`).
The landed precedent for an identity-keyed `HashMultimap` is `LinkedHashMultimap.create(identity<LEdge>(), identity<…>())`
(`src/alg/layered/intermediate/compaction/NetworkSimplexCompaction.ts:189-191`, W6).

## Task

1. Port `CrossHierarchyEdge` whole at its path. Keep the `// @staged 7h` marker and the JSON row (T8 removes them). Rewrite
   `CrossHierarchyEdge.test.ts` as a test of the class (H7), with structure and accessor round trips from the Java only.
2. Port `CrossHierarchyEdgeComparator` as a new file with its `/** @see … */`, keeping the Java's compare order and tie
   behaviour (it returns 0 on ties, so T6/T7's insertion order decides; H3).
3. Confirm the `CROSS_HIERARCHY_MAP` construction T6 will use: `LinkedHashMultimap.create(identity<LEdge>(),
   identity<CrossHierarchyEdge>())`, which gives insertion order for keys and values (H3). `CrossHierarchyEdge` does not override
   `equals`/`hashCode` at the pin, so the pairs are identity pairs. Write a journal row (`ad10`) for the map. No new helper.
4. Tests: comparator orderings taken from the `CROSS_HIERARCHY_MAP` lists of T1's `models` rows, where segments are
   reconstructed from the dumped tree (L4).

## Write-set

`src/alg/layered/compound/{CrossHierarchyEdge,CrossHierarchyEdgeComparator}{,.test}.ts`.

## Read-set

`J/compound/{CrossHierarchyEdge,CrossHierarchyEdgeComparator}.java`, `J/options/InternalProperties.java:330-350`,
`J/compound/CompoundGraphPreprocessor.java:100-120,249-315`, `J/compound/CompoundGraphPostprocessor.java:75-120`,
`src/alg/layered/compound/*`, T2's helpers, `decisions.md` H3, H7, H11, F11, F16.

## Interface contract (consumed by T6, T7, T8)

`new CrossHierarchyEdge(edge: LEdge, graph: LGraph, type: PortType)` with the Java accessors; `new CrossHierarchyEdgeComparator(graph)`
with `compare(a, b): number`; the map is the landed `LinkedHashMultimap` with identity strategies.

## Acceptance criteria

- Given the recorded segment lists, when sorted with the comparator, then the recorded order results.
- Given `doCompoundLayout` on a compound graph, when run after this task, then it still throws the staged preprocessor message.
- Given the entry-point fitness test, then it is clean (new classes added per F10).

## Observability / Rollback

N/A — no new observable operations. Reversible.
