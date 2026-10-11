<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `java.util.Random` and `Collections.shuffle`

**Agent:** typescript-pro · **Commit:** `feat(java): port java.util.Random and Collections.shuffle`

## Context
ELK's layered, force, and random layouts draw from `java.util.Random`
(`nextFloat` 19 uses, `nextInt` 13, `nextDouble` 10, `nextBoolean` 4,
`nextLong` 1, `nextGaussian` 1) and `Collections.shuffle(list, rnd)` once.
Layout output depends on these sequences bit-for-bit. This is the
mission's proof of the *vectors → frozen test → implementation* loop.

## Task
TDD: first write tests replaying every case in
`test/golden/refs/java/random.json`; then implement from the **Javadoc**
algorithm descriptions.

## Write-set
`src/java/util/Random.ts`, `src/java/util/Random.test.ts`,
`src/java/util/Collections.ts`, `src/java/util/Collections.test.ts`.

## Read-set
- `test/golden/refs/java/random.json` (contract below)
- Javadoc: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Random.html
  (the specified LCG: multiplier `0x5DEECE66D`, addend `0xB`, mask
  `2^48-1`, seed scrambling, `next(bits)`, and the documented algorithms
  for each `nextX`), and `Collections.shuffle(List, Random)` Javadoc.
- `../decisions.md#ad-9…`, `#ad-7…`, `#ad-13…`
- **Never** OpenJDK source (AD-9, stop #9).

## Interface contract (input from T6)
Doubles/floats as 16-hex double bit strings; longs as decimal strings; see
`batch-2b/T6-jvm-vectors.md#interface-contract`.

## API (output; consumed by future missions)
```ts
/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Random.html */
export class Random {
  constructor(seed?: bigint | number);  // number must be a safe integer
  setSeed(seed: bigint | number): void;
  nextInt(bound?: number): number;      // bound must be > 0 (throw RangeError like IllegalArgumentException)
  nextLong(): bigint;
  nextDouble(): number;
  nextFloat(): number;                  // float value, returned widened
  nextBoolean(): boolean;
  nextGaussian(): number;               // with haveNextNextGaussian caching
}
// src/java/util/Collections.ts
export function shuffle<T>(list: T[], rnd: Random): void;   // in place
```
- State is per instance (no module globals — T4 test).
- 48-bit state arithmetic must be exact: use `bigint`, or split 24/24-bit
  `number` math — choose, document in a comment with the reason.
- No-arg constructor: Java seeds from `nanoTime`; port derives a seed
  from `Math.random()` (browser-safe) — document as an intentional
  nondeterministic divergence (ELK treats `randomSeed = 0` the same way).
- `nextFloat` returns `next(24) / 2^24` exactly as Javadoc; round through
  `Math.fround` where Java has float precision.

## Acceptance criteria
- Given every case in `random.json`, when replayed on one instance per
  seed, then every value is bit-identical (compare double bits).
- Given seed `Long.MAX_VALUE` / `Long.MIN_VALUE`, then scrambling matches
  with no precision loss.
- Given ≥ 3 consecutive `nextGaussian` calls, then the cached second value
  is returned on the second call exactly as the JVM did.
- Given `shuffle` vectors (sizes 0, 1, 2, 10), then permutations match.
- Given `nextInt(0)` or `nextInt(-1)`, then a `RangeError` is thrown.

## Quality bar
Gates in README.md (brief); coverage 90×4 for these files. `@see` Javadoc
URL on each exported symbol. Test helpers for hex-bit decoding live in the
test file (or `test/helpers/javaBits.ts` is NOT in write-set — keep them
local).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
