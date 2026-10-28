<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Replay-alone coverage map

**Agent:** main session · **Commit:** `docs(T9): map layered branches unreached by the replays`

## Context

Mission 7a (README), L4. Expectations come from the oracle; anything the replays do not exercise must get its own
oracle row rather than a hand-derived literal. 6c's T1 is the precedent (`plans/ad13-rederivation/t4-unreached.md`).

## Task

1. Run only the oracle replays with coverage restricted to the 7a classes:
   `npx vitest run --coverage --coverage.include='src/alg/layered/**' src/alg/layered/graph/transform/LayeredFrameworkTransformVectors.test.ts src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts test/melk/layered-registry.test.ts`
   (adjust flags to the repo's vitest config; record the exact command and load).
2. Per class, list untaken branches and uncovered functions, excluding staged classes and the throwing factory arms.
   Expected large gaps: `Tarjan` (no 7a caller), `LGraphUtil` helpers used only by later phases, `LNode`/`LPort`
   methods for layer-assigned graphs, `Spacings`.
3. For each, name the smallest scenario reaching it: a graph (ELK JSON-expressible) plus the public calls on the
   LGraph, or a note that the branch is unreachable from public API in 7a (journal those). Group scenarios that
   share a graph.
4. Write `plans/layered-framework/unreached.md`: a table `| # | Class | Lines / branch | Scenario id | Graph | Calls |
   Expected shape |`, then the unreachable list. Stop 11 above about 15 scenarios.

## Write-set

`plans/layered-framework/unreached.md`.

## Read-set

`plans/ad13-rederivation/t4-unreached.md` (format), coverage output, the 7a sources, the Java for each branch.

## Interface contract (consumed by T10, T11)

Each scenario has a stable id `site/<class>/<name>`, an input graph description, a call sequence on Java public
API, and the `expected` fields T11 will assert.

## Acceptance criteria

- Given the replay-alone coverage run, when the table is compared with it, then every untaken branch in a non-staged
  7a class appears exactly once (scenario or unreachable note).
- Given the scenario count, when it exceeds about 15, then the task stops (stop 11) with the table journaled.

## Observability / Rollback

N/A — analysis only. Reversible: revert the commit.
