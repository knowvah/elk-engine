<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — `src/guava` boundary fitness rule

**Agent:** typescript-pro · **Commit:** `test(architecture): admit src/guava like src/java`

## Context
The module-boundary fitness test maps `src/` directories to ELK bundles by longest prefix and
exempts `src/java` (imports only `src/java`; importable everywhere). `src/guava/` (M6) does not
exist yet and would be flagged as an unmapped directory.

## Task
Add the `src/guava` rule and append tests that pin it. Existing assertions must not change.

## Write-set
`test/architecture/module-boundaries.fitness.test.ts`.

## Read-set
- `../decisions.md#m6--srcguava`
- `test/architecture/module-boundaries.fitness.test.ts:19-130` (`JAVA_DIR`, `violationFor`,
  `checkFile`, `unmappedFile`) and the self-check describes after it.

## Specification
- `src/guava/**` may import `src/guava/**` and `src/java/**` only; anything else is a violation
  (message pattern like the existing `src/java may import only src/java`).
- Any mapped bundle (and `src/index.ts`) may import `src/guava/**`.
- `src/guava/**` files are not "unmapped directories".
- `src/java/**` may still import only `src/java/**` (it must not import `src/guava`).

## Acceptance criteria
- Given `src/guava/Lists.ts` importing `../java/lang/Int32.js`, then no violation.
- Given `src/guava/Lists.ts` importing `../graph/G.js`, then one violation naming both files.
- Given `src/alg/layered/X.ts` importing `../../guava/Lists.js`, then no violation; given
  `src/java/util/A.ts` importing `../../guava/Lists.js`, then a violation.
- Given `unmappedFile('src/guava/Lists.ts', committed)`, then `undefined`.
- Given `git diff -- test/architecture/module-boundaries.fitness.test.ts`, then no removed lines
  inside existing `it(...)` bodies (logic outside tests may change; assertions may not).

## Quality bar
README gates; `npx vitest run test/architecture` green.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `src/` files. Do not touch `bundle-deps.json` or `tools/bundle-deps.ts`.
