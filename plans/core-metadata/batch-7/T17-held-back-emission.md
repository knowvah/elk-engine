<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — Emit the held-back Core algorithm classes

**Agent:** typescript-pro · **Commit:** `test(T17): prove the emitter on the held-back core algorithm classes`

## Context
C1 keeps `FixedLayouterOptions`, `BoxLayouterOptions`, `RandomLayouterOptions` out of `src/` until
mission 5, so the emitter's algorithm-class path would otherwise be unexercised. This test emits
them against stub providers and checks their registry calls against the JVM (i), so mission 5 only
has to empty the pending list.

## Task
1. `test/melk/stub-provider.ts`: three minimal `AbstractLayoutProvider` subclasses (test-only) whose
   `layout` throws; record `initialize(parameter)` calls.
2. `test/melk/held-back-emit.test.ts`: resolve `Core.melk` with `pendingTypes: []`, emit only the
   three algorithm classes with `emitBundle(…, { outputDir: 'test/melk/.held-back', importOverrides })`
   mapping the three provider FQNs to the stub module, write them to `test/melk/.held-back/`,
   dynamically import each, and:
   - `new FixedLayouterOptions().apply(recorder)` (and box, random) deep-equals `metadata.json` (i)
     for that class;
   - `ALGORITHM_ID` equals the Java constant; the factory's `create()` returns a stub with
     `initialize("")` (or the `#parameter`) called once, `destroy()` calls `dispose`.
3. `.gitignore`: add `test/melk/.held-back/`. Clean the directory in `afterAll`.

## Write-set
`test/melk/held-back-emit.test.ts`, `test/melk/stub-provider.ts`, `.gitignore`.

## Read-set
- `tools/melk/{emit,generate}.ts` (T13), `tools/melk/config.ts` (T12), `test/melk/{recorder,helpers}.ts`
- `../elk-oracle/plugins/org.eclipse.elk.core/src-gen/org/eclipse/elk/core/options/FixedLayouterOptions.java`

## Interface contract
None consumed later; mission 5 deletes `stub-provider.ts` usage when the real providers land.

## Acceptance criteria
- Given each of the three emitted classes, then their recorded calls deep-equal (i).
- Given each factory, then `create()` returns the stub with the Java `initialize` argument.
- Given the test run, then `test/melk/.held-back/` is removed afterwards and is gitignored.

## Quality bar
README gates; the test runs in < 5 s.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No files under `src/`; no change to `tools/melk/` (if the emitter lacks an option this needs, stop).
