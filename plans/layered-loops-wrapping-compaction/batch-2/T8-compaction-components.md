<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `compaction/components`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): port the layered components compaction package`
Scratch: `$TMPDIR/7g/T8/`.

## Context

W1, W2, W6. `J/compaction/components/{IComponent (51), IConnectedComponents (39), IExternalExtension (56),
ComponentsToCGraphTransformer (346), OneDimensionalComponentsCompaction (430)}.java`, used only by `ComponentsCompactor` (T12).
They build on T3's `compaction/oned` and T4's `recthull`. Hashed containers (W6): `ComponentsToCGraphTransformer`'s
`oldPosition`, `offsets`, `externalExtensions` (`Maps.newHashMap`, `:70-78`) and `externalPlaceholder`
(`HashMultimap<Direction, …>`, `:79`); `OneDimensionalComponentsCompaction.LEFT_RIGHT`/`UP_DOWN` (`Sets.newHashSet` of two
`Direction`s, `:65-66`, membership).

## Task

1. Port the five types under `src/alg/layered/compaction/components/` (generic interfaces as TS generics).
2. One `ad10` journal row per hashed container with its reads.
3. Tests: structure tests here; behaviour is proven through `ComponentsCompactor` rows in T12 and T16 (L4).

## Write-set

`src/alg/layered/compaction/components/**`.

## Read-set

The five Java files, T3's and T4's TS files, `src/guava/{HashMultimap,Maps,Sets}.ts`, `decisions.md` W2, W6.

## Acceptance criteria

- Given `npm run typecheck`, `npm run complexity` and `npx vitest run test/architecture`, when run, then all are clean.
- Given each hashed container, when audited, then the journal holds an `ad10` row.
- Given a fresh process, when each module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A. Reversible.
