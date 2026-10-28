<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `LGraphAdapters` and `Tarjan`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port lgraph adapters and tarjan`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7a (README). `LGraphAdapters` (681 lines) exposes the LGraph through the `GraphAdapters` interfaces of
`src/core/util/adapters/` so `NodeDimensionCalculation` (`src/alg/common/nodespacing/`) can size layered nodes; this
closes the roadmap follow-up "NodeDimensionCalculation via LGraphAdapters". `Tarjan` (strongly connected components)
is used by `SCCModelOrderCycleBreaker` (7b); its recursion becomes an explicit stack (AC6).

- **Patterns:** `src/core/util/adapters/ElkGraphAdapters*.ts` (the ElkGraph implementation of the same interfaces,
  including port caching: create ports before adapting); `.agent-notes/alg-common.md` AC6 entries.
- The self-loop branch (`J/graph/LGraphAdapters.java:515-552`) calls the T3 staged classes; it is reachable only
  when `SELF_LOOP_HOLDER` is set, which no 7a code does. Port it verbatim and journal it as unreachable in 7a.

## Task

1. Port `J/graph/LGraphAdapters.java` to `S/graph/LGraphAdapters.ts` with nested adapter classes and
   `PortComparator` per M15; every branch, Java order; the `adapt` overloads per §6.5.
2. Port `J/graph/Tarjan.java` to `S/graph/Tarjan.ts`. `stronglyConnected` keeps its public name and observable
   effects (stack contents, `nodeToSCCID`, `InternalProperties` writes, SCC numbering order) with an explicit work
   stack instead of recursion (AC6). The two `HashMap` sites follow AD-10 (identity-hashed `LNode` keys → `Map` in
   insertion order); journal each.
3. Tests:
   - `Tarjan`: a recursive reference implementation written in the test from the Java, compared with the port on
     generated graphs (chains, cycles, nested SCCs, 10,000-node chain for depth); assert equality of every effect,
     not hand-derived ids. Run the deep case under `--jitless` once and journal the result.
   - `LGraphAdapters`: structural behaviour read from the Java (which elements are adapted, filters, transparent
     north/south ports, port order). No numeric literals (L4): T8 replays the oracle.

## Write-set

`S/graph/{LGraphAdapters,Tarjan}{,.test}.ts` and their M15 nested-type files.

## Read-set

`J/graph/{LGraphAdapters,Tarjan}.java`; `src/core/util/adapters/*.ts` (interfaces and the ElkGraph adapters);
`S/graph/*.ts`, `S/options/InternalProperties.ts` (T3 output); `decisions.md` L1, L4; `docs/translation-rules.md`
(AD-10 row).

## Interface contract (consumed by T8)

`LGraphAdapters.adapt(graph, transparentNorthSouthEdges?, transparentCommentNodes?, nodeFilter?)` returns an
`LGraphAdapter` implementing the core `GraphAdapter` interface, as in the Java.

## Acceptance criteria

- Given generated graphs including a 10,000-node chain, when `Tarjan` runs, then every effect equals the recursive
  reference's and no stack overflow occurs.
- Given an LGraph with north/south port dummies and comment nodes, when adapted with each flag combination, then the
  adapted nodes, ports and edges are the ones the Java selects.
- Given the self-loop branch, when inspected, then it calls only the staged members, and the journal records it as
  unreachable in 7a.

## Observability / Rollback

N/A — no new observable operations. Reversible: revert the commit.
