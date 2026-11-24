<!-- SPDX-License-Identifier: EPL-2.0 -->

# last-ulp-bar: planning observations (issue #74)

## Observation: the 8b math experiment's inputs were never committed

- **Context**: looking for oracle evidence of E2's mechanism (HotSpot `Math.sin`/`Math.cos` against `StrictMath`).
- **Finding**: `plans/alg-force-disco/decision-journal.md:52` records the counts (491 inputs; 9 `cos`, 5 `sin` differ) but
  no recorder, input file or ref holds the inputs or the HotSpot values. The only committed `Math` against `StrictMath`
  rows are the `log` rows of `tools/vectors/ForceVectors.java:1670-1700`. E1's HotSpot value (…4178) is in the 8a docs only.
- **Impact**: a pin for either entry needs a new recorder and ref (D4); T1 collects the inputs again.
- **Confidence**: High

## Observation: the radial sweep row ran in a warm JVM

- **Context**: locating E1's oracle output.
- **Finding**: the sweep row `retarget/radial/default/tests/layered/splines/sloppy_overlaps_2` in
  `~/git/knowvah/elk-oracle/sweep/8bca22f4…-ac5af2ba…/results.jsonl` is `ok` in 3 ms, deep into a long sweep JVM. Whether
  HotSpot gives the intrinsic value (…4178) on a cold first layout is unknown.
- **Impact**: the recorder records cold and warm runs; stop 3 covers the case where neither reproduces the sweep.
- **Confidence**: Medium (the cold behaviour on arm64 is not measured)

## Observation: E2 never missed the 1e-6 bar

- **Context**: classing the audit entries against the amended rule.
- **Finding**: the 32 differing disco fields are all within 1e-6 (`docs/conformance.md:2137-2142`), so the amendment does
  not require their acceptance; #74 still names "the force entries".
- **Impact**: D2's `inside-bar` class: measured and pinned, not accepted.
- **Confidence**: High
