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
