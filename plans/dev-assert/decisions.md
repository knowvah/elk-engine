<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: dev-assert (issue #45)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D8 were auto-confirmed at planning
(unattended run, 2026-11-19); the evidence and rejected options are under [Auto-confirmed](#auto-confirmed-unattended).

## D1. Lazy thunks: `devAssert(check, detail?)`

`export function devAssert(check: () => boolean, detail?: () => unknown): void`. When assertions are disabled, neither
thunk is called. When enabled and `check()` is false, it throws `new AssertionError(detail === undefined ? undefined :
String(detail()))`. This is JLS 14.10: a disabled `assert` evaluates nothing, and the detail expression is evaluated
only on failure. § 6.8's `devAssert(cond, msg?)` signature is updated to this one in T1.

## D2. Runtime switch with the first reviewed module global

`src/java/lang/DevAssert.ts` holds `let assertionsEnabled = false` and exports `setAssertionsEnabled(enabled: boolean)`
and `assertionsEnabled()` (read-only accessor, for the suite's guard test). It is the stand-in for the JVM's `-ea` flag:
process-wide configuration, read but never written by a layout. T1 adds the first entry to `ALLOWLIST` in
`test/architecture/module-globals.fitness.test.ts`, key `src/java/lang/DevAssert.ts::assertionsEnabled`, with that
reason. Nothing is exported from `src/index.ts` or `test/public-api/candidate-index.ts` (AD-14).

## D3. `AssertionError extends Error`

`src/java/lang/AssertionError.ts`: `class AssertionError extends Error`, `name = 'AssertionError'`. Java's parent is
`java.lang.Error`; the port has no class for it, and JS `Error` already stands in for `Throwable` (AD-16a). So a ported
`catch (Exception e)` does not catch it, as in Java. Register it in `test/architecture/exception-hierarchy.fitness.test.ts`
the way that file registers classes with a JS root parent. Cite the Javadoc URL
(`…/java.base/java/lang/AssertionError.html`). Constructor: `(detailMessage?: string)` only.

## D4. The suite runs with assertions enabled

`test/setup/dev-assertions.ts` calls `setAssertionsEnabled(process.env.ELK_DEV_ASSERTIONS !== 'off')` (test code may
read env; `src/` may not); `vitest.config.ts` adds it as `test.setupFiles`. `ELK_DEV_ASSERTIONS=off` exists only to
prove stop 2 (the suite disabled equals the base). A guard test (`test/setup/dev-assertions.test.ts`) asserts
`assertionsEnabled() === (process.env.ELK_DEV_ASSERTIONS !== 'off')`, so a config regression fails loudly. `DevAssert.test.ts` covers the disabled path by switching off and back on in `try/finally` (thunks not
called; no throw). This also keeps function coverage: a thunk is covered wherever its site is reached.

## D5. Site convention

1. **Position.** At the Java statement's position, in the TS function that ports the Java method. `assert e;` →
   `devAssert(() => e);`; `assert e : m;` → `devAssert(() => e, () => m);`. Translate `e` with the same rules as the
   surrounding code (`Int32`, `DoubleMath.fuzzyEquals` from `src/guava/DoubleMath.ts`, `===` for Java reference `==`).
2. **No effects.** The thunk reads only; § 6.8 proves no Java assert has a side effect. Never change TS narrowing or
   non-null assertions around the site.
3. **Supporting code.** A local or constant the Java declares only for an assert (e.g. `ThresholdStrategy.EPSILON`,
   `ForsterConstraintResolver`'s `lastValue`) is ported with it.
4. **`assert false` arms.** Where the TS arm exists, put `devAssert(() => false)` first and keep what follows. Where
   the port substituted `throw new Error(...)` for `assert false; return x;`, keep the throw after the `devAssert`
   (no production change) and mark the row `restored (throw kept)`. Where TS has no arm (closed enum, `never`), add it
   only if typecheck, complexity and codeql stay clean; otherwise the row is `not-portable: no TS arm`.
5. **Comments.** Replace the omission comment with the `devAssert` line. Keep a Java line cite where the file already
   cites lines; renumber nothing else.
6. **Ownership.** A site belongs to the lane that owns its TS file's directory (batch-2 overview). Complexity splits
   follow the project's existing helper-split pattern and stay in the same file or a sibling in the same directory.

## D6. `SelfLoopHolderTest.test.ts` uses the shim

Its test-local `class AssertionError extends Error {}` (line 11) stands in for `java.lang.AssertionError`, which both
JUnit's `fail()` and a failed `assert` throw. Once `SelfLoopHolder.install`'s assert is restored and the suite runs with
assertions on, the shim's error would not match the local class. T4 replaces the local class with an import of
`src/java/lang/AssertionError.ts`. Every assertion and expected value of the file stays as it is. That is the Java test
as written, now reaching the real assert (Tycho runs it with `-ea`). Any other change to that test is a stop (5).

## D7. Triage of an assertion that fires in the suite

Diagnosis mode first (mechanism, origin, causal chain, ruled out).

- **Ported JUnit test or vector replay.** ELK's JUnit ran with `-ea` and `tools/oracle/java-tests.sh` reports 0
  failures, so a firing site there is a port defect. Fix it at its mechanism when the fix is inside the site's file
  and changes no expected value; journal it as a `fix`. Otherwise leave the site unrestored (`not-portable: pending
  #N`) and file a `follow-up` issue naming the mechanism.
- **Golden, corpus or layout input.** Run the same input on the oracle: `JAVA_TOOL_OPTIONS=-ea tools/oracle/run.sh
  "$TMPDIR/ea" <input>`. If Java throws the same `AssertionError`, the site is Java-faithful: leave it unrestored,
  file `needs-ruling` with the input and the Java stack, and journal. If Java does not throw, it is a port defect:
  apply the first bullet's rule.

## D8. One commit on the queue branch

Missions stack on `chore/issue-queue`. Per-task commits during execution, then tag `dev-assert/pre-squash` and squash
onto the base (README, Landing). Footer `Refs: #45`.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected, and why | Evidence |
| -------- | ------ | ----------------- | -------- |
| D1 call form | Thunks | Eager `devAssert(cond)` evaluates the condition in production; `EndLabelPreprocessorPlacement.ts:33` would then call `labelCell.hasLabels()` right after a disabled null check, so a disabled assert could throw. Inline `if (enabled && !c) throw` at each site adds one never-taken branch per site to branch coverage and repeats the throw 143 times | JLS 14.10 (disabled asserts evaluate nothing); `EndLabelPreprocessorPlacement.ts:33` |
| D2 switch | Module `let` with a reviewed `ALLOWLIST` entry | A `const` holder object with a mutable field slips past `module-globals.fitness.test.ts` without review. A `globalThis` flag works like an env var, and `src/` reads none. A build-time `define` with a `typeof` fallback reads an undeclared global at runtime, Vitest's `define` handling of `src/` modules was not verified, and one process cannot test both states | `module-globals.fitness.test.ts:10-16` (reviewed entries allowed; `ALLOWLIST` empty); CLAUDE.md "Browser-safe `src/`" |
| D3 parent | `Error` | Adding `java.lang.Error` as a class has no other caller (YAGNI) | `exception-hierarchy.fitness.test.ts` header (JS `Error` stands in for `Throwable`) |
| D4 suite | Enabled for the whole suite | Enabling it only in targeted tests leaves most thunks uncovered (function coverage) and misses port defects in goldens | `build/pom.xml:358-361` (Tycho `enableAssertions` true) |
| D6 test edit | Import the shim | Leaving the local class makes `testNonSelfLoopGraph` fail once `install`'s assert is restored. Leaving that site unrestored drops a Java behaviour the JUnit test pins | `SelfLoopHolderTest.java:45-51`; `SelfLoopHolderTest.test.ts:10-16, 30-39` |
| D7 triage | `-ea` oracle check per input | Leaving every firing site out by default would hide port defects | `tools/oracle/run.sh` (single-case runs); Tycho `-ea` |

No change is Irreversible: the helper is internal, disabled by default, and nothing in the published contract changes.
