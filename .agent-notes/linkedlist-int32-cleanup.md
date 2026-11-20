<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: linkedlist-int32-cleanup (issue #47, 2026-11-19)

Planning-time notes are in `linkedlist-int32-cleanup-planning.md`. Journal:
`plans/linkedlist-int32-cleanup/decision-journal.md`. The caller audit is `plans/linkedlist-int32-cleanup/audit.md`,
the `int` site table `plans/linkedlist-int32-cleanup/int32-sites.md`.

## Observation: `tsc` answers "who calls this method, on which receiver type" without a compiler API

- **Context**: T1, enumerating the callers of `LinkedList.remove/contains/indexOf`. TypeScript 7 has no JS compiler
  API, and LSP find-references returned only the declaration (planning note).
- **Finding**: renaming the method in a scratch edit and running `npx tsc --noEmit --pretty false` lists every call
  as `TS2339`/`TS2551` "Property 'x' does not exist on type 'LinkedList<TEdge>'", receiver type included. An
  assignability error (`TS2322`/`TS2345`) in the same output would mean an interface hides further calls; there was
  none. `git checkout -- <file>` restores the file. 23 errors here, 14 outside tests.
- **Impact**: a type-driven caller list for any method costs one typecheck run. A grep for `.remove(` in the files
  that mention `LinkedList` gave 77 lines, most of them on other receivers.
- **Confidence**: High

## Observation: a javac Tree API pass gives the Java side the same way

- **Context**: T1, the Java-side enumeration D1 asks for. A grep finds 494 `contains`/`indexOf`/`remove…` calls in
  the in-scope Java with no receiver types.
- **Finding**: a single-file Java program (`audit.md` § 5) run with `java -cp <third-party jars> EqCalls.java` parses
  and attributes the `src`, `src-gen` and `xtend-gen` directories of the sixteen in-scope bundles in the oracle
  worktree and prints receiver type, resolved overload (`List#remove(int)` against `List#remove(Object)`) and
  argument types per call. It needs only the third-party bundles of the recorder scripts on the classpath, about a
  minute, and no oracle jars. 17 of 845 calls did not resolve (a `getProperty` of a generated options class); their
  argument types still print.
- **Impact**: this is the route for the two follow-up audits (#121 equality through sets and indirect calls, #122
  `int` arithmetic): swap the visited tree kind. It is a JVM run, so the queue's load rule applies.
- **Confidence**: High

## Observation: the port's `equals` methods exist, but array call sites can bypass them

- **Context**: T1, checking the Java list calls on value-equal element types that the port keeps as arrays.
- **Finding**: `LayoutAlgorithmData.ts:172` ports `equals` (by id), yet `LayoutMetaDataService.ts:139` tests
  membership with `Array.includes`, which is identity. The Java (`LayoutMetaDataService.java:494`) uses `equals`, so
  registering a provider twice leaves one layouter in the Java category and two in the port's (oracle run, #120).
  The other eight such sites compare explicitly (`findIndex((x) => x.equals(y))`, `some(…equals…)`) or remove by
  index.
- **Impact**: a ported `equals` proves nothing about its call sites. For a class among the 20 in-scope Java files
  that declare `boolean equals(`, check each `includes`/`indexOf`/`===` on its instances (#121, item 3).
- **Confidence**: High

## Observation: `++` on a field that also takes unbounded `+=` needs `Int32` too

- **Context**: T2, converting the crossing and path-count sums.
- **Finding**: decision D4 listed `+ - * += -=`; four `++` sites increment an accumulator that is not a count of one
  collection (`NodeInfo.connectedEdges`, `wrongModelOrder` twice, `BarycenterState.degree`). JLS 15.14.2 makes `x++`
  the same `int` addition, so they were converted. A pair count (n(n-1)/2 per layer) passes 2^31 at 65,537
  elements, far sooner than a crossing sum.
- **Impact**: when classifying `int` arithmetic, ask what the variable accumulates, not which operator the line uses.
- **Confidence**: High

## Observation: machine load from other projects can exceed the JVM threshold for minutes

- **Context**: T1, before the javac run (19:00 CST).
- **Finding**: load average was 190 on 12 cores from another repository's `dot` jobs, fell below 12 within five
  minutes, and the suite directories still passed while it was high (about twice as slow).
- **Impact**: poll `sysctl -n vm.loadavg` in a foreground loop of at most nine minutes instead of starting a JVM
  run or the coverage gate under such load.
- **Confidence**: Medium (one occurrence)
