<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — java-foundations (2026-10-11)

## Observation: lizard misparses `<` after a colon in TypeScript as a generic

- **Context**: Batch 2 lizard gate on `src/java/lang/DoubleToString.ts`.
- **Finding**: lizard 1.22.2 treats `<` following `name:` in an object literal
  (`{ n: n < 0n ? -n : n }`) or following a ternary `:` (`… : lo > 0 && hi < 0`)
  as a generic type open and swallows code up to the next `>`. A 4-line
  function was reported as 70 NLOC / CCN 23. A named temporary or an `if`
  restores the correct parse. The complexity hook uses the same lizard, so
  it blocks such files even though the code is small.
- **Impact**: when the hook or gate reports an absurd NLOC/CCN for a tiny
  function, check `lizard <file>` function spans before "fixing" complexity;
  avoid `<` comparisons directly after `:` in object literals and ternaries.
- **Confidence**: High

## Observation: `Random.test.ts` `replay` exceeds 30 NLOC on `main`

- **Context**: Batch 2 gate run over all changed `.ts`.
- **Finding**: `src/java/util/Random.test.ts:39` `replay` is 35 NLOC and was so
  before this mission; the hook skips `*.test.ts` so it never blocked.
- **Impact**: candidate for a dedicated cleanup PR; gates that run lizard over
  test files will keep warning until then.
- **Confidence**: High

## Observation: JDK `Integer.valueOf` accepts any Unicode `Nd` digit

- **Context**: T1/T6 vectors and `JavaInteger.valueOf`.
- **Finding**: `Integer.valueOf("٣")` → 3 and fullwidth `"１２"` → 12 (via
  `Character.digit`), while `Double.parseDouble` rejects non-ASCII digits and
  does not trim NBSP. `parseDouble("1.0.0")` reports `multiple points`, every
  other reject row `For input string: "…"`.
- **Impact**: ELK option parsing through `Integer.valueOf` is more permissive
  than through `Double.parseDouble`; the shims replicate both.
- **Confidence**: High

## Observation: `Math.log10` needs no shim in V8

- **Context**: T4, 1264 JVM rows for `Math.log10` at parsed `1e<n>` and
  `Math.pow(10, n)` inputs, n = −323…308.
- **Finding**: native `Math.log10` matched every row bit-for-bit, including
  the exact powers 10^0…10^22 the Javadoc requires to yield n.
- **Impact**: no `JavaMath.log10` shim; the replay test documents it.
- **Confidence**: High

## Observation: source-launcher vector runs tie identity hashes to the generator's bytes

- **Context**: T11 appended probe generators to `tools/vectors/JavaVectors.java`
  and regenerated `collections.json`.
- **Finding**: any byte change to the generator (even a comment), or running a
  precompiled copy, changes exactly the 54 `collections.json` scripts whose
  order depends on `System.identityHashCode` (plain colliders and four KVector
  scripts); two runs of the same program are identical. The HEAD generator
  reproduces the file byte-for-byte.
- **Impact**: `collections.json` is frozen to the current generator bytes;
  new probe vectors must go in a separate generator file. The regeneration
  gate is only meaningful for an unmodified `JavaVectors.java`.
- **Confidence**: High

## Observation: JVM `HashMap` order of equal-hash keys is identity-ordered in tree bins

- **Context**: T11 clean-room `JavaHashMap` model against `collections.json`.
- **Finding**: once a bin holds ≥ 9 keys at capacity ≥ 64 and some keys have
  equal hashes without a comparison order (KVector-derived `TEdge`/`TTriangle`,
  any non-Comparable key), the JVM breaks ties by identity hash. Identical
  histories produce different orders (`collider-ColliderPlain-same-fwd-cap64`
  vs `-same-rev-cap64`).
- **Impact**: oracle output that iterates such a set (e.g. spore `NaiveMinST`
  tie order with many equal-hash vectors) is not reproducible by any port or
  by the JVM itself across programs; conformance goldens hitting this case
  need a known-divergence entry rather than a model fix.
- **Confidence**: High

## Observation: lizard parses zero functions when a Java lambda body contains `<`

- **Context**: T14 lizard gate on `tools/vectors/GuavaVectors.java`.
- **Finding**: a field initializer `BiPredicate<Integer,Integer> SIZED = (i, n) -> i < X || …`
  made lizard 1.22.2 and 1.23.0 report 0 functions for the whole file with
  exit 0 (the `<` was read as a generic). Rewriting as `X > i` restored 45
  parsed functions. The same `<`-after-`:` problem blocked a TS ternary in a
  `*.test.ts` (the hook does check test files on Write/Edit).
- **Impact**: a lizard exit 0 is meaningless unless the function count in
  its summary is plausible; check it on Java and TS files alike.
- **Confidence**: High

## Observation: a capacity sweep must record orders below the expected size

- **Context**: T14 deriving `newHashMapWithExpectedSize(n)` capacity from vectors.
- **Finding**: recording iteration order only at ≥ n keys cannot distinguish an
  oversized initial table because growth reaches the same table; recording at
  8, 24, n and n+1 keys discriminates. Result: capacity `ceil(n/0.75)`.
- **Impact**: future capacity-rule vectors (any hash container) must sample
  below the expected size.
- **Confidence**: High

## Observation: Guava `HashBiMap` inverse view order is not symmetric

- **Context**: T14 `guava.json` `biMap` scripts (36 scripts, 1236 steps).
- **Finding**: `put(k, v)` where `v` is bound to `k'` throws; `forcePut` takes
  `k'`'s place in the forward view but the evicted holder's place in the
  inverse view; `inverse().put` of an existing inverse key removes that
  binding and appends. A symmetric model failed 13 random scripts.
- **Impact**: ports must not assume the inverse view mirrors forward order.
- **Confidence**: High

## Observation: generated-NaN sign differs between arm64 and x86-64

- **Context**: first GitHub Actions run (`ubuntu-latest`, x86-64) of the
  `numeric.json` `f32` replay.
- **Finding**: `Inf − Inf`, `0 × Inf` and `0 / 0` yield `0x7ff8…` on arm64
  (where the JVM vectors were recorded) and `0xfff8…` on x86-64, in both the
  JVM and V8. Propagated NaNs keep their input pattern on both. Neither
  IEEE 754 nor the JLS specifies the generated pattern.
- **Impact**: any vector or test that compares raw NaN bits is platform-bound;
  shims canonicalize NaN results (`Float32.ts`) and future vector generators
  should record `doubleToLongBits` (canonical) rather than raw bits for NaN.
- **Confidence**: High
