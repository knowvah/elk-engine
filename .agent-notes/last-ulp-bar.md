<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: last-ulp-bar (issue #74, 2026-11)

## Observation: HotSpot's `Math.sin` / `Math.cos` differ from `StrictMath` the same way interpreted and compiled

- **Context**: the planning note asked whether a cold oracle JVM gives V8's value for the radial case, since the sweep
  row came from a warm one (T3).
- **Finding**: on the reference platform (macOS arm64, JDK 21.0.1) `Math.sin(1.6073462520335293)` is `3feffa875dca2e60`
  on the first call, after 2,000,000 calls, under `-Xint`, under `-XX:TieredStopAtLevel=1` and under `-Xcomp`;
  `StrictMath.sin` gives `…2e5f`. In `last-ulp.json` `cold == warm` on all 334 inputs, and none of 3,000 repeated
  layouts of `sloppy_overlaps_2` differs from the first.
- **Impact**: for `sin` and `cos` the oracle reproduces itself; a last-ulp difference against the port is not a JIT
  artefact, and one oracle run is evidence. This is measured for `sin`/`cos` on this platform only (the NaN sign bit of
  #72 does differ between interpreted and compiled code).
- **Confidence**: High

## Observation: substituting the oracle's recorded math values proves a last-ulp mechanism

- **Context**: rule point 2 of the AD-4 amendment asks for a demonstrated mechanism, not a small delta (T4).
- **Finding**: with `vi.spyOn(Math, 'sin')` returning HotSpot's recorded bits on the recorded divergent inputs (and V8's
  value elsewhere), the port's output equals the oracle's bit for bit: 0 of 56 numbers differ for the radial case, and
  the six disco `import` stops equal `disco.json` exactly. Three inputs (E1) and fourteen (E2) are the whole difference.
- **Impact**: this is the test to write for any later last-ulp entry: record `Math` against `StrictMath` on the call's
  inputs (`tools/vectors/LastUlpVectors.java` reads `last-ulp-inputs.txt`), then show the substitution closes the
  difference. If it does not close it, the entry has a second cause and is not a last-ulp case.
- **Confidence**: High

## Observation: V8 has the bits of `StrictMath` on every recorded `sin` and `cos` input

- **Context**: the mechanism rows (T3, T4), Node v26.3.1 on arm64.
- **Finding**: 334 of 334. HotSpot differs on 3 of 7 `sin` inputs of the radial case (not 1, as the 8a prose suggested:
  the same magnitude at three angles), on 0 of its 7 `cos` inputs, and on 9 `cos` and 5 `sin` of the 160 disco inputs
  (8b's counts, now with the inputs committed).
- **Impact**: at these sites a fdlibm port would match V8, not the oracle, so it cannot remove the divergence (TP7's
  conclusion, now pinned). A V8 update that changes `Math.sin` fails the pinning test's mechanism rows first.
- **Confidence**: High for the recorded inputs; nothing is claimed for other inputs

## Observation: a new pin-stamping recorder runs into a frozen count

- **Context**: T3 said to stamp the new ref through `elkCommit()` like the other recorders.
- **Finding**: `test/architecture/elk-pin.fitness.test.ts:44` pins `EXPECTED_STAMPING_RECORDERS = 41`; a 42nd file with
  `elkCommit()` fails it, and the count may not be edited (AD-13; #173 asks). Separately,
  `test/docs/elk-upgrade-runbook.test.ts` fails until a new `tools/vectors/*-vectors.sh` has a row in
  `docs/architecture/elk-upgrade.md` § 7.1; there the fix is the row.
- **Impact**: a brief that adds a recorder must plan for both: the runbook row is part of the write-set, and the stamp
  needs a ruling until #173 is answered.
- **Confidence**: High

## Observation: a recorder that reads `.elkt` needs the bundle list of `tools/oracle/run.sh`

- **Context**: laying out the vendored `.elkt` the way the sweep harness does (T3).
- **Finding**: the `THIRD_PARTY` list of `radial-vectors.sh` is enough for ELK JSON; `ElkGraphStandaloneSetup` also needs
  `org.eclipse.xtext.xbase`, `org.antlr.runtime`, `com.google.inject`, `jakarta.inject.jakarta.inject-api`,
  `org.aopalliance`, `org.apache.log4j` and `org.eclipse.equinox.common`. The harness classes (`CaseRunner`,
  `GraphOverlay`, `ElkModelReader`) are package-private in the default package and compiled apart from a source-launcher
  program, so a recorder mirrors them and cites the lines; the export then equals the sweep cache's JSON.
- **Impact**: copy the list from `last-ulp-vectors.sh` for the next recorder that starts from a corpus `.elkt`.
- **Confidence**: High

## Observation: counts that differ from the brief

- **Context**: T1's audit.
- **Finding**: the math-call-sites table has 31 "none observed" rows, not 34 (36 rows, 4 cite the disco entry, 1 the
  radial one). The collection matches 8b: 160 `sin`, 160 `cos` (the same 160 values) and 171 `atan2` pairs over the 88
  stops rows; the 92 `full` rows reach 203 further inputs and are bit-identical to the ref. The radial case's largest
  difference is 4.55e-13, not "within 1e-13" (#174 lists the two places that still say so, and 12 stale TS lines).
- **Impact**: cite the measured values from the entries table of `docs/conformance.md` § 2, not the older prose.
- **Confidence**: High
