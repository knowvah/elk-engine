<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — ElkMath facade, combinatorics and aggregates (R4, P1)

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T3): port elkmath combinatorics and aggregates`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core`.

## Context
Mission 5b (README).
- `src/core/math/ElkMath.ts` currently holds only `boundi` (mission 4f, D5), exported as a function and inside the
  `ElkMath` namespace object. `RandomGraphGenerator` imports it.
- `ElkMath.java` has 1,273 lines, so it is split into section modules behind a facade (P1, M10 rule). This task adds
  two of the four sections; T10 adds `Bezier` and `Geometry` and extends the facade.

## Task
1. **`ElkMathCombinatorics.ts`**: `FACT_TABLE`, `factl`, `factd`, `binomiall`, `binomiald`, `powd`, `powf`
   (`J/math/ElkMath.java:33-200`).
   - `factl` and `binomiall` return `bigint` through `src/java/lang/Int64.ts`, wrapping as Java does (R4).
   - `powf` rounds every intermediate with `Math.fround` (Java `float`).
   - `factd`'s Stirling branch (`:80`) calls `powf` and `powd` exactly as Java does.
2. **`ElkMathAggregates.ts`**: `maxi`, `mini`, `averagei`, `maxl`, `minl`, `averagel`, `maxf`, `minf`, `averagef`,
   `maxd`, `mind`, `averaged`, `boundi` (moved here, behaviour unchanged), `boundl`, `boundf`, `boundd`, `clipVector`,
   `signum` (`:610-925`).
   - Java varargs become rest parameters.
   - The `*i` functions use `Int32` arithmetic, the `*l` functions `bigint` with `Int64` wrapping, and the `*f`
     functions `Math.fround`.
3. **`ElkMath.ts`** becomes the facade:
   - it re-exports every section function by name and keeps the `ElkMath` namespace object, now with all ported
     members;
   - existing imports (`boundi`, `ElkMath`) keep working unchanged;
   - sections never import `ElkMath.ts` (lesson from `.agent-notes/core-engine.md`, the ElkUtil sections).
4. **`ElkMathTest.test.ts`**: port `JT/math/ElkMathTest.java:129-219` and `:318-369` (fact, binomial, pow, max, min,
   average) with the exact Java expectations. The rest of the file is T10's.
   - Leave `src/core/math/ElkMath.test.ts` (the landed `boundi` test) untouched.

## Write-set
`src/core/math/{ElkMath,ElkMathCombinatorics,ElkMathAggregates}.ts`, `src/core/math/ElkMathTest.test.ts`, plus
colocated unit tests for the branches `ElkMathTest` does not cover.

## Read-set
- `J/math/ElkMath.java:1-200`, `:600-925`.
- `JT/math/ElkMathTest.java:120-219`, `:310-369`.
- `src/core/math/{ElkMath,ElkMath.test,KVector}.ts`.
- `src/java/lang/{Int32,Int64,Float32,JavaMath}.ts`.
- `src/core/util/ElkUtil.ts` (facade pattern).
- `decisions.md#r4--long-in-elkmath`.

## Interface contracts (outputs)
- Facade: `ElkMath.ts` exports every section function by its Java name, plus `const ElkMath = { … } as const`.
  T10 adds its sections to both.
- `factl(x: number): bigint`, `binomiall(n: number, k: number): bigint`, `maxl(...values: bigint[]): bigint`, and so
  on.

## Acceptance criteria
- Given `factl(20)`, when called, then it returns `2432902008176640000n`.
- Given `factl(21)` or `factl(-50)`, when called, then `IllegalArgumentException` is thrown (`ElkMathTest.java:139-150`).
- Given every ported `ElkMathTest` case in the ranges above, when run, then it passes with the Java expectations.
- Given `RandomGraphGenerator`'s `boundi` import and the landed `ElkMath.test.ts`, when the suite runs, then both
  pass unchanged.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
