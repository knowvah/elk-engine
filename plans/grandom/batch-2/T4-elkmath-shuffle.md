<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — `ElkMath.boundi` and `Collections.shuffle(list)`

**Agent:** typescript-pro · **Commit:** `feat(T4): add elkmath boundi and the default-random shuffle`

## Context
D5 and D7. `RandomGraphGenerator.java:464` calls `ElkMath.boundi`; `sample()` (`:196-203`) calls the one-argument
`Collections.shuffle(list)`. `src/java/util/Collections.ts` has only `shuffle(list, rnd)` (vector-proven). The
fitness test forbids module-level mutable `let` outside its allowlist. CLAUDE.md "Translation Rules → Hazards" says
`Collections.shuffle` has no in-scope caller.

## Task
1. `src/core/math/ElkMath.ts`: `boundi(i, lower, upper)` exactly as `ElkMath.java`, plus a header naming the members
   ported so far (D5). ELK has no JUnit test for `boundi`; tests come from the Java source.
2. `src/java/util/Collections.ts`: overload `shuffle(list)` using a lazily created unseeded `Random` held in a
   module-level `const` holder; Javadoc spec URL for the one-argument form; keep the two-argument form unchanged.
3. `CLAUDE.md`: change the shuffle sentence to say the one-argument overload has one in-scope caller
   (`RandomGraphGenerator.sample`, unseeded, invariants only) and the two-argument form stays vector-proven.

## Write-set
`src/core/math/ElkMath.ts` (+ test), `src/java/util/Collections.ts` (+ test), `CLAUDE.md`.

## Read-set
`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java` (`boundi` only),
`src/core/util/ElkUtil.ts:1-30` (partial-port header), `src/java/util/{Collections,Random}.ts`,
`test/architecture/*mutable*` (allowlist).

## Interface contracts (outputs)
`boundi(i: number, lower: number, upper: number): number`; `shuffle<T>(list: T[]): void`. Consumed by T12–T13.

## Acceptance criteria
- Given `boundi(5, 1, 3)`, `boundi(-2, 1, 3)`, `boundi(2, 1, 3)`, when called, then 3, 1, 2 (`ElkMath.java:819`).
- Given `boundi(1, 1, 0)` (the `n = 1` bipartite case: lower > upper), when called, then 1 (the `x <= lower` branch
  wins).
- Given a 10-element list, when `shuffle(list)` runs, then it is a permutation of the input (same multiset).
- Given the existing `shuffle(list, rnd)` vector tests, when run, then they pass unchanged.
- Given the module-level-mutable fitness test, when run, then it passes without allowlist changes.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
