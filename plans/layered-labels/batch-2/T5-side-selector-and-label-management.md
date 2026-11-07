<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `LabelSideSelector`, `LabelManagementProcessor`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port the label side selector and label management`
`J`, `JT` as README. Scratch: a private subdirectory `<scratchpad>/T5/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line (the
CodeQL collapse rule); everything else stays verbatim. No assertion the Java lacks in a ported suite. L4 applies.

## Context

Mission 7f2, G1, G6, F1, F10, F11. `LabelSideSelector` (463 Java lines) assigns `LabelSide` to edge and end labels per
`EDGE_LABELS_SIDE_SELECTION`; `LabelManagementProcessor` (266) shrinks labels through a user `ILabelManager` and runs only when
`LabelManagementOptions.LABEL_MANAGER` is set (`GraphConfigurator.java:221`, `.agent-notes/layered-labels-planning.md`). ELK
ships no manager, so rows use G6's recorder-defined manager and T2's TS twin. The arms `LABEL_SIDE_SELECTOR` and the two
label-management arms (`CENTER_LABEL_MANAGEMENT_PROCESSOR`, `END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR`,
`IntermediateProcessorStrategyCreate.ts:156,178,180`) throw until T11.

## Task

1. `LabelSideSelector.ts` from `J/intermediate/LabelSideSelector.java:64-463`: `process` (`:67-101`, a switch over the mode),
   `sameSide` (`:103`), `basedOnDirection` (`:121`), `smart` (`:148`), `smartForConsecutiveDummyNodeRun` (`:198`),
   `applyForDummyNodeRunWithSimpleLoops` (`:243`), `getLongEdgeEndNode` (`:277`), `applyLabelSidesToLabelDummyRun` (`:290`),
   `smartForRegularNode` (`:310`) and the end-label queue handling after it (`:343-371`), the three `applyLabelSide` overloads
   (`:373`, `:411`, `:420`) as suffixed names, `doesEdgePointRight` (`:435`, `:451`) likewise. Every `switch` arm in Java order.
2. `LabelManagementProcessor.ts` from `J/intermediate/LabelManagementProcessor.java:54-266`: the `centerLabels` constructor (`:73`),
   `process` (`:78-100`, a no-op without a manager), the end/node/port arm (`:105-148`), comment-box labels (`:150-165`), the
   center arm (`:170-215`), `manageLabels` (`:219-266`). The manager is read from the graph property; a `null` new size leaves the
   label unchanged as in Java (`:233`). `ILabelManager` is `src/core/labels/ILabelManager.ts` (landed).
3. Guava list factories (`Lists.newArrayListWithCapacity`, `:247`) become plain arrays; `Deque` operations (`peek`, `peekLast`,
   `poll`, `clear`) use the landed `src/java/util` shims; no hashing anywhere.
4. Respect the limits (500-line files, 30 NLOC, CCN 10, 5 params): sections behind a facade (P1), Java order kept;
   `npm run complexity` after the first full write of each file.
5. Replay every `scenarios/LabelSideSelector/*`, `scenarios/LabelManagementProcessor/*` row and the `models` rows stopping at
   the three arms, with the class injected through T2's ops (the `labelManager <kind>` op installs the twin). Cover each
   `EdgeLabelSideSelection` value, both results of `doesEdgePointRight`, the manager present and absent.
6. Port nothing of `LabelSideSelectorTest`; that is T13a's.

## Write-set

`src/alg/layered/intermediate/{LabelSideSelector,LabelManagementProcessor}*.ts` and their colocated tests.

## Read-set

`J/intermediate/{LabelSideSelector,LabelManagementProcessor}.java`, `src/core/labels/{ILabelManager,LabelManagementOptions}.ts`,
`src/alg/layered/options/EdgeLabelSideSelection.ts`, `src/alg/layered/graph/**` (accessors only),
`test/helpers/layered-labels-replay-ops.ts` (the manager twin), `docs/translation-rules.md`, `decisions.md` G1, G6, F1, F10, F11, F16.

## Architecture decisions

G1 (scope), G6 (manager), F1, F10 (E1 recipe), F11 (idioms), AD-10.

## Interface contract (consumed by T11)

`new LabelSideSelector()`, `new LabelManagementProcessor(centerLabels: boolean)`, each with `process(graph, monitor)`; the Java's
semantics, `centerLabels` true for the center arm, false for the end/node/port arm.

## Acceptance criteria

- Given a `scenarios/LabelSideSelector/*` row per selection mode, when replayed, then every label's `LabelSide` equals the row.
- Given a graph without a `LABEL_MANAGER`, when `LabelManagementProcessor.process` runs, then no label changes.
- Given the G6 manager and a label wider than the target, when the center arm runs, then width equals the row's.
- Given a fresh process, when each new module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
