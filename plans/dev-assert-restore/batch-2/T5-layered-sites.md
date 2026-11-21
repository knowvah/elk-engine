<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: #21, #22, #23, #40, #116, #123 — wraps and new tests

## Context

#113 option 2 for the alg.layered sites. Same pattern as T4. Decisions
[D4](../decisions.md#d4-where-the-113-steps-are-wrapped) and
[D6](../decisions.md#d6-one-new-test-per-site-with-assertions-on).

| # | Site | Wrap (census decides the exact tests) | New test |
| - | ---- | ------------------------------------- | -------- |
| 21 | `freeExternalPortSide`, direction ≠ `UNDEFINED` | rows `site/lgraphutil/externalPorts/free-undefined-netflow-{positive,zero,negative}` in `LGraphUtilExternalPorts.test.ts` and `LayeredSiteVectors.test.ts` | one row's input with assertions on throws, message `''` |
| 22 | `placeDummy` default arm, detail `finalExternalPortSide` | row `…/fixed-side-undefined` in both files; the test "sets no layer or in-layer constraint for a side that is not WEST/EAST/NORTH/SOUTH" | that row's input throws, message `UNDEFINED` (the JVM's) |
| 23 | `LNode.setGraph`, `layer === null` | "falls back to the layer graph while no graph is set" (`LNode.test.ts`) | `setLayer` then `setGraph` throws |
| 40 | `moveTree`, `layers.length - depth > 0` | "throws as Java does when a tree is deeper than the layers it is moved into" | same input throws `AssertionError`, not `IndexOutOfBoundsException` |
| 116 | `EdgeLabelSideSelection.transpose` default arm | "returns null for a receiver that is no constant" | same receiver throws |
| 123 | `ForsterConstraintResolver` `lastValue` check | "leaves an unconstrained layer and its barycenters alone" (`[3, 1, 2]`); "compares barycenters as floats: …" (`1 + 1e-10`, then `1`) | barycenters `[3, 1, 2]` throw |

New tests go in the file that holds the wrapped test (#21/#22: `LGraphUtilExternalPorts.test.ts`). For #123, check
with the site's float/double reading whether `1 + 1e-10` then `1` violates `>= lastValue`; the census says whether
the second test fires.

## Write-set

`src/alg/layered/graph/LGraphUtilExternalPorts.test.ts`, `src/alg/layered/LayeredSiteVectors.test.ts`,
`src/alg/layered/graph/LNode.test.ts`, `src/alg/layered/intermediate/HighDegreeNodeLayeringProcessor.test.ts`,
`src/alg/layered/options/EdgeLabelSideSelection.test.ts`, `src/alg/layered/p3order/ForsterConstraintResolver.test.ts`
(plus any file the orchestrator adds from the census).

## Read-set

`census.md` (these six tables); `test/helpers/with-assertions.ts`; `src/java/lang/AssertionError.ts`; the six site
functions by symbol; the row loops of `LayeredSiteVectors.test.ts:55-90` and of `LGraphUtilExternalPorts.test.ts`.

## Rules

As T4: wrap the violating call, `expect` lines byte-identical, row sets as named constants with ids verbatim from #113.

## Acceptance criteria

- Given the six files, when run with assertions on and with `ELK_DEV_ASSERTIONS=off`, then each passes with its T2
  baseline count plus its new tests.
- Given each new test, when run in either mode, then it observes an `AssertionError` with the message stated above.
- Given `git diff` of the six files, when read, then no existing `expect`, expected value or title changed.

## Observability / rollback

N/A — test code only. Reversible.
