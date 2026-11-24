<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: generated-goldens-layered (issue #68, 2026-11-23)

Planning-time notes are in `generated-goldens-layered-planning.md`. Journal:
`plans/generated-goldens-layered/decision-journal.md`.

## Observation: a new directory under `test/golden/inputs/pipeline/` reaches no recorder and no hash manifest

- **Context**: T1 vendored three repository files under `test/golden/inputs/pipeline/generated/` and had to know whether
  any recorder or test walks that tree.
- **Finding**: `test/golden/inputs/manifest.json` records sha-256 hashes of elk-models files only (its header names
  `eclipse-elk/elk-models` and the pinned commit), and `algorithm-refs.test.ts` checks its keys against explicit lists,
  not against the directory. `LayeredFrameworkVectors.discover` walks `test/golden/inputs/realworld` and fails on an
  unlisted file; `LayeredCompoundVectors`, `LayeredPipelineVectors` and `LayeredLoopsVectors` read explicit `MODEL_TABLE`
  rows. Nothing walks `inputs/pipeline/`.
- **Impact**: a repository-sourced golden input can live under `inputs/pipeline/<dir>/` without touching a recorder's
  pinned table or the hash manifest. It must not go under `inputs/realworld/`, and it does not belong in
  `inputs/manifest.json`; prove its bytes against its source in the runner instead.
- **Confidence**: High

## Observation: `vitest --reporter=json` writes an untracked `.vitest/json/output.json`

- **Context**: counting tests per file for the journal with `npx vitest run <files> --reporter=json`.
- **Finding**: with no `outputFile`, vitest 5.0.3 prints `JSON report written to …/.vitest/json/output.json` and writes
  the report there instead of to stdout. `.vitest/` is not in `.gitignore`, so `git add -A` would commit it.
- **Impact**: read the report from that file, then remove `.vitest/` before staging.
- **Confidence**: High

## Observation: the 1-minute load can cross 12 between a poll and the run it gates

- **Context**: the D5 regen runs, on a machine shared with other sessions (load 10 to 14 during the mission).
- **Finding**: a wait loop returned at 11.75 and the `uptime` at the start of the next command read 12.33.
- **Impact**: put the load check and the oracle run in one shell command (a `gate` function called immediately before
  `nice -n 10 <run>`), not in two tool calls.
- **Confidence**: High

## Observation: dropping a classified exemption makes the old manifest red before the entries move

- **Context**: T1's red step edited both golden runners before the manifests.
- **Finding**: the brief expected only the new pin test to fail. The algorithm check of `tree-goldens.test.ts` (each
  ref records the algorithm its entry names) also failed, on exactly the three entries the removed
  `RECORDED_WITH_LAYERED` list had exempted.
- **Impact**: when a mission removes an exemption list and moves the exempted rows in the same task, the red state has
  two failing tests; the second one is the evidence that the exemption was load-bearing, not a defect.
- **Confidence**: High
