<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `java.awt.geom.Rectangle2D` shim (R3)

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): add rectangle2d shim proven by jvm vectors`

## Context
Mission 5b (README). `comments/*` (T13, T15, T16) uses `Rectangle2D.Double` for comment and target bounds. This shim
provides exactly that surface (R3), written from the JDK 21 Javadoc only.
- **AD-9:** never read OpenJDK source.
- T2's `test/golden/refs/java/awt.json` is the frozen expectation.

## Task
1. Write `src/java/awt/geom/Rectangle2D.ts`. Shims cite the Javadoc spec URL per member, not a `@see` to Java
   source; follow `src/java/util/Random.ts`.
   - An `abstract class Rectangle2D` with the static constants `OUT_LEFT`, `OUT_TOP`, `OUT_RIGHT`, `OUT_BOTTOM`, using
     the Javadoc constant values.
   - Abstract getters, the `outcode(x, y)` contract, `intersects(x, y, w, h)`, `intersects(r: Rectangle2D)` and
     `isEmpty()`, each as the Javadoc specifies.
   - A static nested `Rectangle2D.Double`, either as a static class property or as a merged namespace, so callers
     write `new Rectangle2D.Double(x, y, w, h)`. It has public `x`, `y`, `width` and `height` fields.
2. Add only those members. `comments/*` needs nothing more (YAGNI), and `src/java` imports nothing from ELK.
3. Write the test: replay every `awt.json` row, decoding hex doubles as other vector replays do (grep
   `hexToDouble` or the equivalent under `src/java`), and assert exact equality.

## Write-set
`src/java/awt/geom/Rectangle2D.ts`, `src/java/awt/geom/Rectangle2D.test.ts`.

## Read-set
- `test/golden/refs/java/awt.json`.
- `src/java/util/Random.ts` and its test (shim and vector-replay pattern).
- The JDK 21 Javadoc for `java.awt.geom.Rectangle2D` and `Rectangle2D.Double`.
- `decisions.md#r3--rectangle2d`.

## Interface contracts (outputs, consumed by T13, T15, T16)
- `new Rectangle2D.Double(x, y, w, h)`, with mutable public `x`, `y`, `width`, `height`.
- `outcode(x, y): number`, `intersects(r: Rectangle2D): boolean`, `intersects(x, y, w, h): boolean`,
  `isEmpty(): boolean`.
- `Rectangle2D.OUT_LEFT | OUT_TOP | OUT_RIGHT | OUT_BOTTOM`.

## Acceptance criteria
- Given every `awt.json` row, when replayed, then the TS result equals the JVM result exactly.
- Given a NaN-size rectangle, when `isEmpty`, `outcode` and `intersects` run, then they match the recorded rows.
- Given the fitness tests, when run, then `src/java/awt/geom` imports nothing from ELK directories and has the SPDX
  header.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
