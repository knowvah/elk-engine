<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — `compaction/recthull` + `RectlinearConvexHullTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): port the layered rectilinear convex hull`
Scratch: `$TMPDIR/7g/T4/`.

## Context

W1, W2, W8. `J/compaction/recthull/{Point,RectilinearConvexHull,Scanline}.java` (604). The landed `src/alg/common/{Point,RectilinearConvexHull}.ts`
and `src/alg/common/compaction/Scanline.ts` port the common copies, which differ (W2: 12, 17 and 10 diff lines); port the layered
copies as their own files, keeping nested types (event handlers, quadrants) in prefixed files as the common port does.

## Task

1. Port `JT/compaction/recthull/RectlinearConvexHullTest.java` (2 runs) **first** to
   `src/alg/layered/compaction/recthull/RectlinearConvexHullTest.test.ts` with the Java's literals.
2. Port the three classes under `src/alg/layered/compaction/recthull/`.

## Write-set

`src/alg/layered/compaction/recthull/**`.

## Read-set

The three Java files and the test, the landed common ports (structure only), `decisions.md` W2, W8.

## Acceptance criteria

- Given `RectlinearConvexHullTest`, when run, then both cases pass with the Java's assertions unchanged.
- Given the layered and common Java copies, when the TS files are compared with them, then every behavioural difference of the
  `diff` appears in the layered port (journal one row listing them).

## Observability / Rollback

N/A. Reversible.
