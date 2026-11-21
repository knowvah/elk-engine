<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: `testValidNodeOrder` on rows where it is not vacuous

## Context

`src/alg/layered/intermediate/InvertedPortProcessorTest.test.ts` ports the Java `@TestAfterProcessor` test
(`test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/InvertedPortProcessorTest.java`).
It replays the 13 `models/ptolemy-*/…/INVERTED_PORT_PROCESSOR/default` rows of `test/golden/refs/java/layered-order.json`
(`:20-24`) and runs the assertion body (`:26-51`). No edge in those graphs leaves a WEST port or enters an EAST port, so no
assertion executes ([D1](../decisions.md#d1)). `InvertedPortProcessor.test.ts:26-52` lists further IPP-terminal rows
(ticket and north/south models, `scenarios/InvertedPortProcessor/*`, `sites/InvertedPortProcessor/freePorts`,
`sites/HeadLabels/*`) whose dumps it already compares with the oracle.

## Task

1. Make `testValidNodeOrder` return the number of edges that reached an assertion (WEST-source outgoing plus EAST-target
   incoming), keeping the Java assertion body and order unchanged.
2. Add a second `describe` that replays every row of the `InvertedPortProcessor.test.ts` list outside the ptolemy 13
   (same selection; reuse its replay helpers — `runOrderPrefix` for `models/*` and `scenarios/*`, the site replay for
   `sites/*`, as that file does) and runs `testValidNodeOrder` on each.
3. For each row, derive from the row's recorded input (`row.elk` / the vendored model) whether a side-fixed node has an
   edge leaving a WEST port or entering an EAST port. Assert the returned count is positive for those rows. Do not hard-code
   counts from the port.
4. Leave the existing ptolemy `describe` and its 13 cases exactly as they are.
5. Journal: per row, the count; which rows are non-vacuous; the ptolemy scan (0 such edges in the 9 vendored inputs).

## Write-set

`src/alg/layered/intermediate/InvertedPortProcessorTest.test.ts` only. Scratch in `$TMPDIR/layered-evidence-gaps/T1/`.

## Read-set

`InvertedPortProcessorTest.test.ts` (63 lines); `InvertedPortProcessor.test.ts:1-80`;
`test/helpers/layered-order-replay-ops.ts`, `test/helpers/layered-order-site-replay.ts`,
`test/helpers/layered-order-replay-rows.ts`; `InvertedPortProcessor.java:84-150` (what an inverted port is).

## Acceptance criteria

- Given the non-ptolemy IPP rows, when the new `describe` runs, then at least three rows (the two
  `scenarios/InvertedPortProcessor/*` and `sites/InvertedPortProcessor/freePorts`) execute assertions (count > 0) and pass.
- Given a row whose input has a WEST-output or EAST-input edge on a side-fixed node, when replayed, then its count is
  positive.
- Given the 13 ptolemy cases, when run, then they are unchanged and pass.
- Given `npx vitest run src/alg/layered/intermediate/InvertedPortProcessor*.test.ts`, then green.

## Quality bar

Test file only; no ref change; prettier and typecheck clean. A row that fails the assertion is stop 2 (diagnosis: the
dump already matches the oracle, so a failure would mean the Java test itself fails on that row: journal and check on the
oracle with `tools/oracle/java-tests.sh` if needed).

## Observability

N/A — no new observable operations.

## Rollback

Reversible: revert the test file.
