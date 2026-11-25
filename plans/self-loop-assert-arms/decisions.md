<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: self-loop-assert-arms (issue #115)

These decisions are locked for this mission. If execution finds a contradiction, stop 5 fires
([stop-conditions.md](stop-conditions.md)). Row numbers are the `#` column of `plans/dev-assert/inventory.md`
and of the issue's table.

## D0: what done means

#115's "Done when" applies: "each row either matches the Java's behaviour with assertions off, with a test from the
Java source, or is listed as a deviation with the reason; the inventory statuses are updated." Under D1 every row takes
the first branch, so no `docs/conformance.md` deviation is added. The issue also asks for "a proof or a counter-example
per arm". D5 journals one for each arm.

## D1: every arm does what the Java does without `-ea`

**Context.** dev-assert D5.4 put `devAssert(() => false)` in front of six `throw new Error(...)`s, and left the throws in
place as a substitute for `assert false; return x;` or `assert false;` followed by a fall-through. A JVM without `-ea`
does not throw at any of the six.
**Decision.** At each site, keep the `devAssert(() => false)` and then do what the Java statement after it does:

| # | Site | After `devAssert(() => false)` |
| - | ---- | ------------------------------ |
| 96 | `OrthogonalSelfLoopRouter.offsetLabels`, `default` (Java `placeLabels`, `:180`) | `break` (the label position is left as it is) |
| 98 | `OrthogonalSelfLoopRouterSlotPositions.computeBaselinePosition`, `default` (`:304-305`) | `return -1` |
| 99 | `OrthogonalSelfLoopRouter.addOuterBendPoint`, `default` (`:367`) | `break`, then `bendPoints.add(result)` as the Java does |
| 100 | `OrthogonalSelfLoopRouter.getBaseVector`, `default` (`:441-442`) | `return null` (D3) |
| 105 | `RoutingDirector.determineThreeSideLoopRoutes`, `default` (`:207`) | `break`, then `assignLeftmostRightmostPorts(slLoop, null, null)` (D3) |
| 108 | `RoutingDirector.computeMissingPortSide`, after the loop (`:227-228`) | `return null` (D3) |

**Consequences.** A production run without assertions no longer throws a port-made `Error` at these lines. Where the
Java then dereferences null, the port raises D10's `TypeError` at the same step (D3). With assertions on, every arm
still throws the `AssertionError` first. The comments of the files that describe the throws are rewritten:
`OrthogonalSelfLoopRouter.ts:43-44` and `OrthogonalSelfLoopRouterSlotPositions.ts:19-20`.

## D2: no explicit bounds check in front of the arms

**Context.** `placeLabels` and `getBaseVector` read `routingSlotPositions[side.ordinal()][routingSlot]` before their
`switch` (Java `:145`, `:429`). For `UNDEFINED` with an empty row, the JVM throws `ArrayIndexOutOfBoundsException` at
the read. JS reads `undefined` and goes on.
**Decision.** Add no bounds check. `docs/translation-rules.md` § 6.7 ports an explicit check only where ELK catches the
exception. Nothing catches this one, and AD-16b adds no shim for an uncaught JVM error. In T1, journal per row what the
JVM does at the read for each input of D4. A code comment at the two reads names the difference in one line.
**Consequences.** The difference is only reachable with a port side that D5 shows cannot reach these methods. The
tests of D4 drive the split helpers, or pass a `routingSlotPositions` whose `UNDEFINED` row is long enough. Their
expected values are then the Java's.

## D3: the nulls flow as in the Java

- `getBaseVector` returns `KVector | null`. `addOuterBendPoint` adds the result to `bendPoints` unchanged, null
  included, as Java's `LinkedList.add(null)` does. The two `result.x/y +=` arms need a `!`. They are reached only
  for a side that returned a vector, and a comment says so. `cornerBendPoint` dereferences the components as the Java
  does (`currPortSideComponent.add(...)`), so null is a `TypeError` there.
- `computeMissingPortSide` returns `PortSide | null`. In `determineThreeSideLoopRoutes`, a null selector must raise a
  `TypeError` **before any arm**, as a Java `switch` on a null enum throws `NullPointerException` from `ordinal()`.
  A TS `switch (null)` would reach `default` instead. The `default` arm (a non-null side that is not one of the four,
  which Java can reach only with `UNDEFINED`) runs `devAssert(() => false)`. It then falls out with both sides null
  into `assignLeftmostRightmostPorts`, whose parameters widen to `PortSide | null`.
- No new helper and no new shim (AD-16b). The executor chooses the local form of the null check, for example a
  `missingSide!.ordinal()` read with a comment that cites D10. The form must keep typecheck, complexity and CodeQL
  clean.

## D4: tests come from the Java source, with assertions off and on

One pair of tests per row: a `withAssertions(false, …)` test that pins the Java statement after `assert false`, and an
`assertionErrorOf(…)` test that pins the `AssertionError` (`test/helpers/with-assertions.ts`,
`test/helpers/assertion-error-of.ts`). Private methods are reached through a typed `as unknown as` view, as
`RoutingDirectorTest.test.ts:25` does. Expected values are written from the Java lines cited in D1 **before** the code
changes, and the new tests must fail first (red, journaled):

| # | Input | Expected with assertions off |
| - | ----- | ---------------------------- |
| 96 | `offsetLabels(slLabels, UNDEFINED, p, d)` | returns; `slLabels.getPosition()` unchanged |
| 98 | `computeBaselinePosition(slHolder, UNDEFINED, d)`, exported from its module for this test with a one-line comment (its only callers pass the four constants, so no exported function reaches the arm; the module is not in `src/index.ts`) | `-1` |
| 99/100 | `getBaseVector(UNDEFINED, 0, rows)`, where `rows[0]` has one entry | `null`; then `addOuterBendPoint` on a port whose side is `UNDEFINED` (routing slot 0, `rows[0]` non-empty) appends exactly one `null` to `bendPoints` |
| 105 | `computeMissingPortSide` stubbed to return `UNDEFINED` | `assignLeftmostRightmostPorts` called once with `(slLoop, null, null)` (spy) |
| 105 | `computeMissingPortSide` stubbed to return `null` | `TypeError`; `assignLeftmostRightmostPorts` not called |
| 108 | a loop whose `slPortsBySide` key set holds all four sides (set as `RoutingDirectorTest.test.ts:25` does) | `null` |

Every new test lives in `OrthogonalSelfLoopRouter.test.ts` (new) or `RoutingDirector.test.ts` (appended). No existing
expected value changes. Planning found no test that pins any of the six messages (`grep` over `src`, `test`, `tools`).

## D5: a reachability proof or counter-example per arm

The issue says "a proof or a counter-example per arm decides how much it matters". T1 journals one `evidence` row per
arm. Each row gives the Java lines and the TS lines that close the arm. Starting points read at planning:

- **98.** The only callers pass the constants `NORTH`, `EAST`, `SOUTH` and `WEST` (`OrthogonalSelfLoopRouter.java:230-233`;
  TS `OrthogonalSelfLoopRouterSlotPositions.ts:43-46`).
- **99, 100.** The side is an `LPort` side of a self-loop port. `SelfHyperLoop.computePortsPerSide` (`:103`) calls
  `SelfLoopType.fromPortSides`, which throws `IllegalArgumentException` on `UNDEFINED` (`SelfLoopType.java:42-44`).
  Prove that no port side changes between that call and routing, or name the step that does.
- **96.** Label sides come only from `LabelPlacer`'s constant assignments. A label side left null fails at
  `labelSide.ordinal()` (`:145`) in both runtimes, before the `switch`.
- **105, 108.** The dispatch reaches `determineThreeSideLoopRoutes` only for `THREE_SIDES`, that is, three keys and no
  `UNDEFINED`. So `computeMissingPortSide` always finds a missing side and never returns `UNDEFINED`. The `default` arm
  of 105 is dead in Java (a null selector throws at the `switch`).

A counter-example (a valid graph that reaches an arm) does not change D1. Run it through the oracle and the port, and
journal both results. A mismatch puts diagnosis mode into effect, and the input becomes a `follow-up` issue for a golden.
No golden is added in this mission.

## D6: records

- `plans/dev-assert/inventory.md` gains an appended `## Superseded by #115 (<date>)` section, in the shape of the
  `## Superseded by #127` section. It lists the six rows with their new status, `restored`, and corrected status totals
  (138 `restored`, 0 `restored (throw kept)`, 5 comments naming an issue). No earlier line of that file changes.
- `docs/translation-rules.md:511-516` (the "Outcome" bullet) is updated to say 138 restored and none in front of a
  kept throw, with a reference to #115.
- No ref, vector, golden, oracle patch or `ELK_COMMIT` changes. No recorder input changes, so gate 7 must show
  `test/golden/refs/` untouched against the base.

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-25. `next` resolved to #115: it is
the lowest-numbered open `queue:ready` issue, no issue is `queue:planned`, it has no "Blocked by" line, and it has no
`needs-ruling` label.

| Decision | Taken | Rejected | Evidence |
| -------- | ----- | -------- | -------- |
| D1 | match the Java without `-ea` in all six rows | (a) keep the six throws and list them in `docs/conformance.md`; (b) a mix by row | CLAUDE.md: "Port every branch" and "Still in doubt: keep the Java behavior". A new listed deviation is a maintainer decision, while matching the Java is not. `docs/translation-rules.md:511-512`: "After `assert false`, what follows in the Java stays as it is". The kept throws were a temporary choice to avoid changing production behaviour inside #45 (dev-assert D5.4), and #115 is where that change was deferred to. No test pins a message (D4). |
| D2 | no bounds check | (a) a `RangeError` check at the two reads; (b) the `ArrayIndexOutOfBoundsException` shim | § 6.7 of `docs/translation-rules.md`: an explicit check only where ELK catches it. AD-16b: no new Java-named shim for an uncaught JVM error. (a) would add code at two reads that the Java has only implicitly, for a state D5 closes. |
| D3 | null flows with a `TypeError` at the Java NPE step | (a) keep the non-null return types and throw `TypeError` inside the arm; (b) return a sentinel | AD-16b ("tests compare when it happens, not its class"; D10). (a) throws inside the arm, where the Java returns. (b) has no Java counterpart. |
| D4 | expected values from the Java source | a new JVM site vector | AD-13 accepts the Java source as a source of expected values. No recorder drives these private methods (`grep` of `tools/vectors` finds neither router), and the outcomes are single Java statements (`return -1`, `return null`, `break`). A recorder would add a ref for no added certainty. |
