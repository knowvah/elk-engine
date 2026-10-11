<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — JVM vector generator

**Agent:** java-architect · **Commit:** `test(vectors): add jvm-generated vectors for java runtime shims`

## Context
elk-engine must reproduce Java runtime semantics bit-exactly
(`java.util.Random`, `Math.round`, `(int)` casts, int overflow,
`Double.compare`, `Collections.shuffle`). AD-9: TS shims are written from
the **Javadoc specs** and proven against values produced by a real JVM.
This task produces the frozen expected values (AD-13). ELK usage counts:
`nextFloat` 19, `nextInt` 13, `nextDouble` 10, `nextBoolean` 4, `nextLong`
1, `nextGaussian` 1, `Collections.shuffle(list, rnd)` 1. ELK seeds:
layered/force default `randomSeed = 1`; `0` means "seed from time".

## Task
Write a single-file Java program (JDK 11+ source launcher, no deps) that
emits two deterministic JSON vector files, then run it and commit the
output.

## Write-set
`tools/vectors/JavaVectors.java`, `test/golden/refs/java/random.json`,
`test/golden/refs/java/lang.json`.

## Read-set
- `../decisions.md#ad-9-java-shims-from-specs-never-openjdk-source`, `#ad-13-tests-are-immutable-spec-commitments`
- Javadoc only (https://docs.oracle.com/en/java/javase/21/docs/api/) for
  `java.util.Random`, `java.lang.Math`, `java.lang.Double`. Do not read
  OpenJDK source.

## Interface contract (output; consumed by T9, T10)
Encoding: every `double`/`float` value or argument is a 16-hex-digit
lower-case IEEE-754 **double** bit string (`Double.doubleToRawLongBits`,
floats widened to double first); every `long` is a decimal string; ints
are JSON numbers.
```ts
// random.json
interface RandomVectors {
  jdk: string;                                  // System.getProperty("java.version")
  cases: {
    seed: string;                               // long, decimal
    calls: {
      method: 'nextInt' | 'nextIntBound' | 'nextLong' | 'nextDouble'
            | 'nextFloat' | 'nextBoolean' | 'nextGaussian' | 'shuffle';
      arg?: number | number[];                  // bound for nextIntBound; list for shuffle
      value: number | string | boolean | number[];
    }[];                                        // in call order on ONE Random instance
  }[];
}
// lang.json
interface LangVectors {
  jdk: string;
  round: [string, string][];        // [x bits, Math.round(x) as long decimal]
  roundFloat: [string, number][];   // [f bits (widened), Math.round(f) int]
  floorDiv: [number, number, number][];   // int a, int b, result
  floorMod: [number, number, number][];
  d2i: [string, number][];          // [x bits, (int) x]
  d2l: [string, string][];          // [x bits, (long) x decimal]
  i32: { op: 'add'|'sub'|'mul'|'div'|'rem'|'neg'|'shl'|'shr'|'ushr'; a: number; b: number; r: number }[];
  doubleCompare: [string, string, number][];  // [a bits, b bits, Double.compare sign]
}
```

## Case coverage (minimum)
- Seeds: `0`, `1`, `-1`, `42`, `Long.MAX_VALUE`, `Long.MIN_VALUE`,
  `0x5DEECE66DL`. Per seed ≥ 20 interleaved calls covering every method,
  `nextIntBound` bounds `1, 2, 3, 7, 16, 100, 1<<30, Integer.MAX_VALUE`,
  ≥ 3 consecutive `nextGaussian` (exercise the cached second value),
  `shuffle` of lists sized 0, 1, 2, 10.
- Doubles: `±0.0`, `NaN`, `±Infinity`, `0.49999999999999994`, `0.5`,
  `-0.5`, `1.5`, `2.5`, `-2.5`, `±2^31`, `2^31-1`, `±2^31+0.5`, `±2^53`,
  `2^63`, `Double.MIN_VALUE`, `Double.MAX_VALUE`, `1e-300`, plus 20
  pseudo-random doubles from a fixed-seed `Random`.
- ints: `0`, `±1`, `Integer.MIN_VALUE`, `Integer.MAX_VALUE`, `7`, `-7`, `3`,
  `-3` across all `i32` ops and floorDiv/floorMod (skip divisor 0); shift
  counts include `0, 1, 31, 32, 33, -1`.

## Run
`java tools/vectors/JavaVectors.java test/golden/refs/java` — writes both
files with stable key order and 2-space indentation, trailing newline.

## Acceptance criteria
- Given JDK 21, when the program runs twice, then both outputs are
  byte-identical across runs.
- Given `random.json`, then it contains every seed and every method listed
  above, including ≥ 3 consecutive `nextGaussian` calls per seed.
- Given `lang.json`, then it contains the `0.49999999999999994`, `NaN`,
  `-0.0`, and `±2^31` boundary cases in `round`, `d2i`, and `doubleCompare`.
- Given the Java file, then it has the SPDX header and its comment cites
  Javadoc as the spec source.

## Quality bar
Gates in README.md (brief). Program ≤ 300 lines, methods ≤ 30 lines
(complexity hook). Hand-rolled JSON writer (no deps).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Vectors are frozen once committed. Later tasks may **add** cases by
editing the generator and re-running, never change existing values.
