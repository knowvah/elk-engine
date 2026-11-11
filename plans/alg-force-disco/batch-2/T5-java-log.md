<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Full-domain `JavaMath.log`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): add a bit-exact JavaMath.log` · Scratch: `$TMPDIR/alg-force-disco/T5/`

## Context

Mission 8b, FD3. `src/java/util/Random.ts:43` has a private fdlibm `strictLog` limited to `0 < x < 1`. `EadesModel.attractive` needs
the whole domain.

## Task

1. Add `log(x: number): number` to `src/java/lang/JavaMath.ts`: the netlib fdlibm `e_log` algorithm, full domain (NaN, ±infinity, 0,
   negative, subnormal, `x ≥ 1`), citing the Javadoc of `StrictMath.log` and netlib. Never read OpenJDK source (AD-9).
2. Test against every `log` row of `force.json`, exact raw-bit equality.
3. If `Random.ts` can import it with `Random.test.ts` unchanged and green, do so and delete the private copy. Otherwise leave
   `Random.ts` alone and journal why.

## Write-set

`src/java/lang/JavaMath.ts`, `src/java/lang/JavaMath.test.ts`, `src/java/util/Random.ts`, `src/java/util/Random.test.ts` (read-only
unless item 3 applies; never change an expected value).

## Read-set

`src/java/util/Random.ts:30-87`, `src/java/lang/JavaMath.test.ts`, `decisions.md#fd3-mathlog-in-eadesmodel`, `test/golden/refs/java/force.json` group `log`.

## Interface contract (consumed by T8)

`JavaMath.log(x: number): number`, equal bit for bit to the recorded `Math.log`.

## Acceptance criteria

- Given every `log` row, when `JavaMath.log` runs, then its raw bits equal the row's (stop 18 otherwise).
- Given 0, a negative value, NaN and infinity, then the result is the row's.
- Given `src/java`, then the fitness test still shows no ELK import.

## Observability / Rollback

N/A — no new observable operations. Reversible.
