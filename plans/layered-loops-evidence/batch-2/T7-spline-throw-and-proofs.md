<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: the spline `:137` case and the Sc28 entries

## Context

[D5](../decisions.md#d5) (spline) and [D6](../decisions.md#d6) (Sc28). T4 handed back the TS trace, the dead-arm
arguments and the comparator counts. The orchestrator journaled the D5 oracle probe.

## Task

1. In `src/alg/layered/p5edges/splines/SplineEdgeRouter.sites.test.ts`, add a `describe` for the D5 graph. Build it
   with the file's existing helpers if they fit; otherwise build it as ELK JSON and lay it out through the TS layered
   layout entry the file's other cases use.
   - Assert that the `:137` else arm is taken at least once. Use a spy on the state set it skips, or on a method
     reached only from that arm. Choose a seam that needs no `src/` change. If none exists, journal it and assert the
     edge's absence from `edgesRemainingLayer` instead.
   - Assert that the layout throws a `TypeError` whose stack contains `getSplinePath`.
   - The comment names the probe's journal row, the exception class and the first ELK frame
     the probe printed, and the Java lines `:398-402` / `:445-449`.
   - Assert no value the Java does not produce.
2. In `unreached.md`, replace the *to verify* text of the spline entry and the four Sc28 entries with the verified
   classification and evidence: the arguments with file:line, the comparator script's counts and Node version, the
   probe's journal row, and the test title.
3. Run the file, `npm run typecheck`, and `npx prettier --check` on the changed files.
4. Commit: `test(layered): pin the spline router throw on an unzipped inverted port`.

## Write-set

`src/alg/layered/p5edges/splines/SplineEdgeRouter.sites.test.ts`; `plans/layered-loops-evidence/unreached.md` (the
spline and Sc28 sections).

## Read-set

`SplineEdgeRouter.sites.test.ts` (its existing helpers and layout entry); `SplineEdgeRouter.ts:240-260, :436-450`;
`SplineEdgeRouterSegments.ts:110-145`; the T4 hand-back and probe rows in the journal.

## Acceptance criteria

- Given the D5 graph, when the TS layout runs, then the `:137` else arm is observed and a `TypeError` naming
  `getSplinePath` is thrown, matching the oracle probe's `NullPointerException` site.
- Given `unreached.md`, when it is read, then the spline entry is X with the probe evidence, and each Sc28 entry is
  dead (argument) or U on V8 (measurement), with nothing left *to verify*.

## Observability

N/A: test evidence only.

## Rollback

Reversible: revert the test case and the plan file.
