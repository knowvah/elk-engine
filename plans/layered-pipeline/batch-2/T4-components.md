<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — `components`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): port the connected components processor and placers`
`J` as README; `JT` as README. Scratch: a private subdirectory `<scratchpad>/T4/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal;
a hand-derived expectation is stop 3. A verbatim side-effect-free duplicate such as `X || X` is collapsed with a comment naming
the Java line; everything else stays verbatim. No assertion the Java lacks in a ported suite.

## Context

Mission 7f, F1, F10, F11. `doLayout` calls `split` and `combine` on every layout; about 335 ptolemy levels have several
components and 1,184 have external ports, so `ComponentGroupGraphPlacer` is a default path. `ComponentsCompactor` is staged (T2).

## Task

1. Port, one class per file at `src/alg/layered/components/`, Java order and names: `AbstractGraphPlacer`, `SimpleRowGraphPlacer`,
   `ComponentGroup`, `ComponentGroupGraphPlacer`, `ModelOrderComponentGroup`, `ComponentGroupModelOrderGraphPlacer`,
   `ModelOrderRowGraphPlacer`, `ComponentsProcessor`; `@see` each. Respect the limits (500-line files, 30 NLOC, CCN 10, 5 params):
   sections behind a facade (P1), Java order kept. Run `npm run complexity` after the first full write of each file.
2. **`ComponentsProcessor.dfs`** (`J/components/ComponentsProcessor.java` `dfs`): explicit-stack loop reproducing the visit order
   and the `mutableData` accumulation, proven against a verbatim recursive twin in the test file on every `componentsSplit`
   scenario row and a deep chain under `--pool=forks --execArgv=--jitless` (F11). `port1.getConnectedPorts()` iteration order
   is the landed one.
3. **Containers (F11):** `CONSTRAINTS` (`J/components/ComponentGroup.java:96`) and `MODEL_ORDER_CONSTRAINTS`
   (`ModelOrderComponentGroup.java:56`) key on `Set<PortSide>`: confirm from the Java they are looked up, not iterated, and
   implement the value-keyed lookup without a hash-order dependency (an `EnumSet` bitmask key is fine); if anything iterates them,
   stop 17. `ArrayListMultimap components` (`ComponentGroup.java:182`): per-key insertion order; any `keySet()` or `values()`
   iteration gets an AD-10 journal row. Both constraint tables are lazy (F10).
4. **Numeric (F11):** `(float) Math.sqrt(totalArea)` at `SimpleRowGraphPlacer.java:77` and `ComponentGroupGraphPlacer.java:376` through
   `Float32`; every other double stays a double; `ElkMath.maxd` is landed.
5. Port `JT/components/ComponentGroupTest.java` to `src/alg/layered/components/ComponentGroupTest.test.ts` (Java literals, 2 oracle runs).
6. Replay every `scenarios/ComponentsProcessor/*` row through T3's ops with the class injected.

## Write-set

`src/alg/layered/components/{AbstractGraphPlacer,SimpleRowGraphPlacer,ComponentGroup,ComponentGroupGraphPlacer,ModelOrderComponentGroup,
ComponentGroupModelOrderGraphPlacer,ModelOrderRowGraphPlacer,ComponentsProcessor}*.ts` and their tests, `ComponentGroupTest.test.ts`.

## Read-set

`J/components/*.java`, `JT/components/ComponentGroupTest.java`, `src/alg/layered/components/ComponentsCompactor.ts` (T2),
`src/alg/layered/graph/LGraphUtil.ts:356` (`getMinimalModelOrder`), `src/alg/layered/options/InternalProperties.ts`,
`test/helpers/layered-pipeline-replay-*.ts`, `docs/translation-rules.md`, `decisions.md` F1, F10, F11, F16.

## Interface contract (consumed by T8)

`new ComponentsProcessor()`, `split(graph): LGraph[]`, `combine(components, target): void`; the Java's semantics.

## Acceptance criteria

- Given a `componentsSplit` row, when replayed, then the component list and each component's nodes equal the row.
- Given a chain of 5,000 connected nodes under `--jitless`, when split, then no overflow and the same visit order as the twin at depth 200.
- Given `ComponentGroupTest`, when run, then it passes with the Java's literals.
- Given `compaction.connectedComponents=true`, when `combine` runs, then the staged compactor throws naming 7g.

## Observability / Rollback

N/A — no new observable operations. Reversible.
