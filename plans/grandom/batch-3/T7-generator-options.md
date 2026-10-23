<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `GeneratorOptions` and `RandVal`

**Agent:** typescript-pro · **Commit:** `feat(T7): port generatoroptions and randval`

## Context
`GeneratorOptions.java` (335 lines) extends `MapPropertyHolder` and declares the nested enums `FileFormat`,
`GraphType`, `EdgeDetermination`, ~50 `IProperty` constants (ids `basic.*` etc., Java defaults incl. `Float`
values) and the nested class `RandVal` (`:244-335`: `allNil`, `minMax`, `exact`, `gaussian`, `val`, `intVal`,
`defaultInt`, `floatVal`, setters, `min`, `max`, `defaultVal`). D8: every `float` through `Math.fround`. TS has
`MapPropertyHolder`, `Property`, `Random.nextGaussian`/`nextFloat`, `JavaMath.round`/`roundFloat`/`d2i`/`l2i`.
Nested Java types become sibling files (translation-rules §6.4).

## Task
1. `GeneratorOptions.ts`: the class and every property constant in declaration order with the Java id and default;
   `Float` defaults as `Math.fround` values; `PORT_CONSTRAINTS` uses `src/core/options` `PortConstraints`.
2. `FileFormat.ts`, `GraphType.ts`, `EdgeDetermination.ts`: enums per §6.3 (fields/methods if the Java has them).
3. `RandVal.ts`: the nested class with every method; `val(r)` draws exactly as Java (no extra draws, same order);
   `intVal` / `floatVal` cast as Java does (`d2i`, `fround`).
4. Tests: replay every `randval` row of `grandom-generate.json` (all draws, exact equality); property id/default
   table; `allNil` / `defaultVal` / `defaultInt` branches from the Java source.

## Write-set
`src/core/debug/grandom/generators/{GeneratorOptions,RandVal,FileFormat,GraphType,EdgeDetermination}.ts` (+ tests).

## Read-set
`GeneratorOptions.java`, `src/graph/properties/{MapPropertyHolder,Property}.ts`, `src/java/util/Random.ts`,
`src/java/lang/JavaMath.ts`, `docs/translation-rules.md` §1.5, §1.6, §3, §6.3–6.4.

## Interface contracts (outputs)
`GeneratorOptions` (a `MapPropertyHolder`) with static property constants named as in Java; `RandVal` with
`val(r): number`, `intVal(r): number`, `floatVal(r): number`, factories. Consumed by T10–T14.

## Acceptance criteria
- Given every randval row, when replayed with `new Random(seed)`, then all `val`, `intVal` and `floatVal` draws equal
  the recorded values exactly.
- Given a fresh `GeneratorOptions`, when each property is read, then the Java default (by id) is returned.
- Given a gaussian `RandVal`, when `val` is called twice, then the second call consumes the cached Gaussian exactly as
  the JVM rows show.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
