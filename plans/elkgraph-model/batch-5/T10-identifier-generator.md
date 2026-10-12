<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — GraphIdentifierGenerator

**Agent:** typescript-pro · **Commit:** `feat(graph): port graphidentifiergenerator`

## Context
`GraphIdentifierGenerator` validates, generates and de-duplicates element identifiers by walking
`eAllContents()` (the first consumer of the D4 walk order) and an `ElkGraphSwitch`-style dispatch.
Kept per the port-map (user decision); its `assertUnique` uses an unseeded `java.util.Random`
(D10). `graph.json` records `assertValid().assertExists()` outcomes (T2).

## Task
TDD: write the test from the `generateIdentifiers` rows in `graph.json` and the Java body (the
`ElkGraphSwitch` becomes an `if`/`else` chain on the T8 type guards in the same case order:
node, port, label, edge, edge section). Port `forGraph`, `assertValid`, `assertExists`,
`assertUnique`, `execute`, the private `ElementType` enum with prefixes `N P E ES L`,
`validateIdentifier` (char loop), `nextIdentifier`, `assertAllIdsUnique`,
`fourDigitPaddedRandomNumber`, `padZeroes`.

## Write-set
`src/graph/util/GraphIdentifierGenerator.ts`, `src/graph/util/GraphIdentifierGenerator.test.ts`.

## Read-set
- `../decisions.md#d4--eobject-surface`, `#d10--divergences-accepted-up-front`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java`
- `test/golden/refs/java/graph.json` (`generateIdentifiers` steps) + `test/helpers/graph-vectors.ts` (T9)
- `src/graph/util/ElkGraphUtil.ts` (T9), `src/graph/*.ts` guards (T8), `src/java/util/Random.ts`,
  `src/guava/{Strings,Sets,Iterators}.ts`

## Interface contract (consumed by mission 4b `.elkt` tooling)
```ts
export class GraphIdentifierGenerator { static forGraph(graph: ElkNode): GraphIdentifierGenerator;
  assertValid(): this; assertExists(): this; assertUnique(): this; execute(): void }
```

## Acceptance criteria
- Given a graph whose elements carry ids `'a b'`, `'1x'`, `''`, `null`, `'ok'`, when
  `assertValid().assertExists().execute()`, then ids are `a_b`, `_x`, generated `N1`/`P1`/`E1`/
  `ES1`/`L1` and root `G1`, exactly as the `graph.json` rows record (replayed through the helper).
- Given an existing id `N1`, when a node needs a generated id, then it gets `N2` (collision skip).
- Given two nodes with id `n`, when `assertUnique().execute()`, then the second matches
  `/^n_g\d{4}$/` and all ids are unique; a third duplicate also ends unique.
- Given `execute()` with nothing asserted, then no identifier changes.

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not seed the `Random` (Java semantics); do not add an `ElkGraphSwitch` class. No changes
outside the write-set.
