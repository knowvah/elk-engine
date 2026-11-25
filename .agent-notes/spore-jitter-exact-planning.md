<!-- SPDX-License-Identifier: EPL-2.0 -->

# spore-jitter-exact: planning observations (issue #106)

## Observation: the jitter path skips every exact self-check of the recorder

- **Context**: reading `SporeLayoutVectors.java` `build` for #106.
- **Finding**: a row with `jitterNodes > 0` returns `jitterRow` before the round-trip comparison, the stepwise-vs-engine end
  check and the throws check. Those checks have never run on a shifted input; `jitterRow` only compares the engine dumps of
  its 6 runs (`runsAgree`).
- **Impact**: the first `shift` recording is also the first time the stepwise importer and the engine are compared on a
  shifted graph; a failure there is a recorder or oracle question before it is a port question (stop 1).
- **Confidence**: High

## Observation: `randomSeed` 0 keeps the shift unseeded

- **Context**: deciding the scope of exact rows.
- **Finding**: `ElkGraphImporter.java:131-136` (spore) builds `new Random()` when `randomSeed` is 0, `new Random(seed)`
  otherwise. Only non-zero seeds can have exact rows.
- **Impact**: an exact row on a factor that sets `randomSeed` 0 would fail the build-twice check; keep such inputs
  invariants-only.
- **Confidence**: High

## Observation: frozen per-group counts make the stops group expensive to extend

- **Context**: choosing between twins in `full`/`stops` and a new group.
- **Finding**: seven count assertions in six spore test files pin the `full` and `stops` groups (per algorithm too). The
  `objects` group (T13b) set the precedent of a group in `ROW_GROUPS` but not `GROUPS`, which leaves `tieSummary` and
  `optionCoverage` byte-equal.
- **Impact**: new spore evidence goes in a new group unless a ruling allows the counts to move.
- **Confidence**: High
