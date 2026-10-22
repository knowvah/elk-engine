<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — `ConfigurationParser`

**Agent:** typescript-pro · **Commit:** `feat(T10): port the grandom configurationparser`

## Context
`ConfigurationParser.xtend` (230 lines): `static parse(Configuration, Random)` → `GeneratorOptions`, with private
`hierarchy`, `edges`, `nodes`, `size`, `ports`, `setQuantities`, `toRandVal`, `setFlowSide` (switch over
`FlowType` × `Side`), `getConstraint` (switch over `ConstraintType`), `setGraphType` (switch over `Form`), `exists`,
`setIfExists`. Some branches draw from the `Random` (e.g. flow amounts), so draw order matters. Xtend semantics:
`xtend-gen/.../ConfigurationParser.java` settles them (null-safe `?.`, switch fall-through, boxing).

## Task
1. `generators/ConfigurationParser.ts`: every method in Xtend order, same draws in the same order, Java defaults
   where the config omits a value.
2. Tests: for every `seeded` row of `grandom-generate.json`, parse the row's input with `GRandomText.parse` — or, if
   T9 has not landed in this parallel batch, with T8's parser directly — then call
   `ConfigurationParser.parse(config, new Random(seed))` per configuration and compare the options dump with the
   recorded `options` exactly (keys, order, values; `RandVal` fields). Unit tests for each switch arm from the
   source (all `FlowType` × `Side`, all `ConstraintType`, all `Form`).

## Write-set
`src/core/debug/grandom/generators/ConfigurationParser.ts` (+ tests).

## Read-set
`ConfigurationParser.xtend`, `xtend-gen/.../ConfigurationParser.java`, T7's `GeneratorOptions`/`RandVal`, T5's model,
T8's parser API, `RandomGraphGenerator.java:110-140` (how `generate(Configuration)` seeds and calls `parse`).

## Interface contracts (outputs)
`ConfigurationParser.parse(config: Configuration, r: Random): GeneratorOptions`; consumed by T12.

## Acceptance criteria
- Given every seeded row, when parsed with `new Random(seed)`, then the options dump equals the recorded one exactly.
- Given each `FlowType` × `Side` combination, when `setFlowSide` runs, then the matching `INCOMING_*`/`OUTGOING_*`
  property is set (and no other).
- Given a seeded row with `samples > 1`, when replayed, then `parse` runs once for the configuration (not per
  sample; `RandomGraphGenerator.java:110-123`) and its dump equals the row's single `options` entry.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
