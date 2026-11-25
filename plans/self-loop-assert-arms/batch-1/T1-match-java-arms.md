<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: match the six arms to the Java

**Owner:** orchestrator. **Budget:** 45 min.

## Context

dev-assert D5.4 left six `throw new Error(...)`s after `devAssert(() => false)`. The Java returns a value or goes on at
each one ([README](../README.md#objective)). D1-D3 say what each arm becomes, D4 says how it is tested, and D5 asks for a
proof per arm.

## Read-set

- Java at the pin, under `~/git/knowvah/elk/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/`:
  - `routing/OrthogonalSelfLoopRouter.java:138-181`, `:209-306`, `:338-445`
  - `routing/RoutingDirector.java:55-90`, `:178-229`, and `assignLeftmostRightmostPorts`/`lowestPortOnSide`
  - `SelfHyperLoop.java:85-110`, `SelfLoopType.java:41-70`
- `src/alg/layered/intermediate/loops/routing/{OrthogonalSelfLoopRouter,OrthogonalSelfLoopRouterSlotPositions,RoutingDirector}.ts`
- `src/alg/layered/intermediate/loops/routing/RoutingDirector.test.ts`, `RoutingDirectorTest.test.ts:15-30`
- `test/helpers/with-assertions.ts`, `test/helpers/assertion-error-of.ts`, `test/helpers/SelfLoopTestGraphCreator.ts`
- `plans/dev-assert/inventory.md:205-235` (the `Superseded by #127` section), `docs/translation-rules.md:505-525`

## Write-set

The seven files of the README table marked T1, and this mission's journal.

## Steps

1. **Proofs (D5).** For each arm, write one `evidence` row: the Java and TS lines that close it, or a counter-example. If
   one is found, run it through `tools/oracle/run.sh` (check `uptime` first) and through the port, and journal both
   results (stop 2).
2. **Red.** Write the D4 tests from the Java lines, run them, and journal the failures. Each assertions-off test must
   fail on the old `Error`, and each `assertionErrorOf` test must already pass.
3. **Green.** Make the D1 edits with D3's types. Rewrite the comments at `OrthogonalSelfLoopRouter.ts:43-44` and
   `OrthogonalSelfLoopRouterSlotPositions.ts:19-20`, and add D2's one-line comment at the two reads. Remove the
   `// Java: assert false` tails of the throws. Keep the Java line cites the files already carry.
4. **Records (D6).** Append the inventory section and update the `docs/translation-rules.md` outcome bullet.
5. Run the README's T1 gates, the second one with `ELK_DEV_ASSERTIONS=off`. Run
   `grep -rn "throw kept" docs src test` and journal the result: no live `src` or `docs` text may still describe a
   kept throw for these rows.
6. Commit: `git -c commit.gpgsign=false commit -F <file>`, subject
   `fix(layered): let six self-loop assert-false arms return as in java`.

## Interface contracts

| Symbol | Before | After |
| ------ | ------ | ----- |
| `OrthogonalSelfLoopRouter#getBaseVector` (private) | `KVector` | `KVector \| null` |
| `RoutingDirector#computeMissingPortSide` (private) | `PortSide` | `PortSide \| null` |
| `RoutingDirector#assignLeftmostRightmostPorts` (private) | `(SelfHyperLoop, PortSide, PortSide)` | `(SelfHyperLoop, PortSide \| null, PortSide \| null)` |
| `computeBaselinePosition` (module function) | not exported | exported, same signature |

## Acceptance criteria

- Given each of the six arms with assertions off, when the D4 input is applied, then the result is the Java's: `break`,
  `-1`, one `null` appended, `null`, a `(null, null)` call, or `null`, as in the D4 table.
- Given row 105 with a null selector and assertions off, when `determineThreeSideLoopRoutes` runs, then it throws a
  `TypeError` and `assignLeftmostRightmostPorts` is not called.
- Given each arm with assertions on, when the same input is applied, then `assertionErrorOf` returns an
  `AssertionError`.
- Given the scoped suite, with assertions on and with `ELK_DEV_ASSERTIONS=off`, when it runs, then it is green, and its
  count exceeds 473 only by the new tests.
- Given the journal, when it is read, then it has one D5 `evidence` row per arm.

## Observability

N/A. There are no new observable operations, and the library has no logging.

## Rollback

Reversible: revert the commit. No data, ref or contract outside the package changes.
