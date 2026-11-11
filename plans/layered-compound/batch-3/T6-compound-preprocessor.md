<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — `CompoundGraphPreprocessor` (sections behind the facade)

**Agent:** typescript-pro (opus, high effort; the largest and most branch-dense class of the mission) · **Commit:**
`feat(T6): port compound graph preprocessor`
Scratch: `$TMPDIR/7h/T6/`.

## Context

Mission 7h, H1, H3, H11. `J/compound/CompoundGraphPreprocessor.java` (1,048 lines) splits every cross-hierarchy edge into
segments, one per hierarchy level. It creates external port dummies (`createExternalPortDummy` `:889`, `createPortForDummy`
`:976`), connects children and siblings (`:474`, `:502`), handles inside self loops (`:616`), moves labels (`:249`), and stores
the segments in `CROSS_HIERARCHY_MAP` (`:107-117`). Its nested `ExternalPort` class is at `:1005`. The facade
`src/alg/layered/compound/CompoundGraphPreprocessor.ts` is staged (line 2), and `ElkLayered` constructs it directly, so its
`process` keeps throwing until T8 (H11). Opus compensation (rules/model-routing.md): implement the Java as written; the class is
an enumerated spec, so port every branch; no extra abstractions.

## Task

1. Port the logic into section modules at Java method boundaries (≤ 500 lines per file, the CCN and NLOC limits respected by
   splitting at helpers the Java has): for example `CompoundGraphPreprocessorSections.ts` (the entry
   `processCompoundGraphPreprocessor(self, graph, monitor)` plus `setSidesOfPortsToSidesOfDummyNodes`,
   `transformHierarchyEdges`), `…Segments.ts` (`moveLabelsAndRemoveOriginalEdges`, `getShallowestEdgeSegment`,
   `processInner/OuterHierarchicalEdgeSegments`, `connectChild`, `connectSiblings`), `…Dummies.ts` (`processInsideSelfLoops`,
   `introduceHierarchicalEdgeSegment`, `createDummyEdge`, `calculateNetFlow`, `createExternalPortDummy`,
   `createExternalPortProperties`, `createPortForDummy`), and `CompoundGraphPreprocessorExternalPort.ts`. The facade keeps its
   fields `crossHierarchyMap` and `dummyNodeMap` (as the Java does) and its throwing `process`.
2. Containers (H3): `crossHierarchyMap` = `LinkedHashMultimap.create(identity, identity)` (T4's contract), `dummyNodeMap` =
   `Map<LPort, LNode>` (insertion order). The section entry takes an optional `order: 'java' | 'reversed'` that reverses the
   iteration at `:129` (`dummyNodeMap.entrySet()`) and `:252` (`crossHierarchyMap.keySet()`, and each key's values before the
   sort). It defaults to Java order. Write one `ad10` journal row per container.
3. Numeric and boxed idioms per F11 (`calculateNetFlow` sums ints: `Int32` ops); audit every `==` on boxed values (C6).
4. Tests: replay every T1 `models` row whose stop is `CompoundGraphPreprocessor`. Import the input as the recorder does (T2),
   call the section entry on the root, and compare `expected.tree`. Run each such row also with `order: 'reversed'` and record
   (do not assert) whether it still matches. The result goes to T9's twin evidence. Structure tests of `ExternalPort` come from
   the Java.

## Write-set

`src/alg/layered/compound/CompoundGraphPreprocessor{Sections,Segments,Dummies,ExternalPort}*.ts` and their tests (names may
differ; journal them). Not the facade `CompoundGraphPreprocessor{,.test}.ts` (T8).

## Read-set

`J/compound/CompoundGraphPreprocessor.java` (whole), `J/compound/CrossHierarchyEdge.java`, `J/options/InternalProperties.java`
(the properties the class sets: grep `setProperty` in the Java), T4's files, T2's helpers, `src/guava/LinkedHashMultimap.ts`,
`decisions.md` H3, H11, F10, F11, F16.

## Interface contract (consumed by T7, T8, T9)

`processCompoundGraphPreprocessor(self: CompoundGraphPreprocessor, graph: LGraph, monitor: IElkProgressMonitor,
order?: 'java' | 'reversed'): void`. It leaves `CROSS_HIERARCHY_MAP` set on `graph` as the Java does (`:116`), then clears the
facade's state (`:117-118`).

## Acceptance criteria

- Given every T1 `models` row stopping after `CompoundGraphPreprocessor`, when the section entry runs, then `expected.tree`
  (including `CROSS_HIERARCHY_MAP` in sorted order) matches at AD-4.
- Given `doCompoundLayout` after this task, then it still throws the staged preprocessor message.
- Given `npm run complexity`, the entry-point fitness test and the mutable-`let` fitness test, then all are clean.

## Observability / Rollback

N/A. Reversible.
