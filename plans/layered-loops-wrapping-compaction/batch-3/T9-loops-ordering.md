<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `loops/ordering`: `PortSideAssigner`, `PortRestorer`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T9): port the self-loop port side assigner and restorer`
Scratch: `$TMPDIR/7g/T9/`.

## Context

W1, W6, W14. `J/intermediate/loops/ordering/{PortSideAssigner (214), PortRestorer (516)}.java`, called by `SelfLoopPreProcessor`
and `SelfLoopPortRestorer` (T14). `PortRestorer.targetAreas` is a Guava `ArrayTable` over `PortSide.values()` ×
`PortSideArea.values()` (`:96`): a row-major 2D structure over those key lists (W6; the landed `src/guava/Table.ts` if it fits,
otherwise a private helper in the file); `connectionSides` is an `EnumSet` (`:471`). Nested enums (`PortSideArea`, …) go in
prefixed files. `selfLoopDistribution` and `selfLoopOrdering` decide the branches (`J/Layered.melk:660-680`).

## Task

1. Port both classes; Java order and names; `@see` on every symbol.
2. Proven through T14's rows; here, tests that drive each `SelfLoopDistributionStrategy`/`SelfLoopOrderingStrategy` branch on
   `SelfLoopTestGraphCreator` graphs and assert structure (port sides, list order) only where the Java determines it without a
   numeric literal; numeric expectations wait for rows (L4).

## Write-set

`src/alg/layered/intermediate/loops/ordering/**`.

## Read-set

Both Java files, T5's classes, `src/guava/Table.ts`, `src/java/util/EnumSet.ts`, `decisions.md` W6.

## Acceptance criteria

- Given each distribution and ordering strategy, when a test graph runs through the class, then the branch the Java takes is
  taken (coverage of each `switch` arm).
- Given `ArrayTable`, when ported, then iteration and lookup follow the two key lists' order (journal one `ad10` row).
- Given `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
