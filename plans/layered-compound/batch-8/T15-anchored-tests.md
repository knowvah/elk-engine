<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Anchored tests, mutation checks

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T15): anchor the 7h branches and check mutants`
Scratch: `$TMPDIR/7h/T15/`.

## Context

Mission 7h, H12 (F12; 7g's T21 shape). Each anchored case cites `// oracle: <row id>; <Java file:line>` and takes every literal
from that row (L4). `.agent-notes/layered-labels.md` notes that `toEqual` on enum constants is vacuous: use `toBe` or `String()`.

## Task

1. Anchored cases for the branches the replay reaches only indirectly, with one file per class group: `CompoundGraphPreprocessor`
   sections, `CompoundGraphPostprocessor` sections, `CrossHierarchyEdge`/comparator, `HierarchicalNodeResizingProcessor`, and the
   driver's hierarchical arms (`ElkLayeredHierarchyAnchored.test.ts`). A regression then names its class.
2. Mutation checks on the decisive branches: flip a comparison or drop a branch in a scratch copy, and the anchored or replay test
   must fail. Journal survivors with the row that would discriminate them, and file a `follow-up` issue if a new oracle graph is
   needed (7g's #55 shape).
3. Coverage over the full suite must be at least 90/90/90/90 (stop 10), with shortfalls journaled as U.

## Write-set

New `*Anchored.test.ts` files beside the 7h classes and beside `ElkLayeredHierarchy.ts`.

## Read-set

`plans/layered-compound/unreached.md`, `layered-compound.json` rows by id, `src/alg/layered/ElkLayeredAnchored.test.ts` and
`src/alg/layered/components/ComponentsAnchored.test.ts` (shape), `decisions.md` H12.

## Acceptance criteria

- Given each anchored case, when read, then it names its row and Java line and invents no literal.
- Given `env $SWEEPS npm run coverage` (orchestrator), when run, then all four metrics are at least 90.
- Given the mutation checks, when run, then survivors are journaled with their discriminating row or a `follow-up` issue.

## Observability / Rollback

N/A. Reversible.
