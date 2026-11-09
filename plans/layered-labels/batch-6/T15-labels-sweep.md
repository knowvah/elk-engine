<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Label sweep

**Agent:** java-architect (sonnet) · **Commit:** `test(T15): add the layered labels sweep`
`J` as README. Scratch: a private subdirectory `<scratchpad>/T15/`.

## Context

Mission 7f2, G7, G3, G4, F6, F14. 7f's sweep is the pattern: `LayeredPipelineVectors.java --sweep/--dump`, `tools/oracle/pipeline-sweep.sh`,
`test/corpus/pipeline-sweep.test.ts`, `test/helpers/layered-pipeline-sweep.ts` (read only; `.agent-notes/layered-pipeline.md` on
the unflagged JVM and on measuring hash order by temporary edit). 7f's sweep never exercised the label family: ptolemy has node labels
only (`.agent-notes/layered-labels-planning.md`). Hashes are exact: a last-ulp difference is a mismatch to diagnose, never to tolerate.

## Task

1. `LayeredLabelsVectors.java --sweep <modelsDir> <outDir>` / `--dump <case id> <modelsDir> <outDir>` (sweep and dump modes only; the
   no-flag recording path stays byte-identical, re-record and `cmp`). Cases: `model/<model>/<default|RIGHT|LEFT|DOWN|UP>` for every
   label- or comment-bearing `.elkt` of `$ELK_MODELS_DIR/{tests/layered,tickets/layered,examples}` (about 217: 134 + 38 + 45), through
   the recursive engine at default options and with `elk.direction` each of the four values. Canonical form: 7f's sorted-key raw-IEEE-hex
   dump of positions, sizes, bend points, junction points, label geometry and graph size, hashed as 7f's. Line format as 7f (`ok`,
   `refused` with the first refused member and its category, `throws` with class, `timeout`), 20 s per case. Refusal is on the whole
   plan (G2); only 7g (self loops, wrapping, compaction) and 7h (`INCLUDE_CHILDREN`, `HIERARCHICAL_NODE_RESIZER`) categories.
2. `tools/oracle/labels-sweep.sh [--force]`: 7f's shape, stamp = oracle build + recorder source + models commit + input hash,
   `LABELS_SWEEP_DIR` override, writes `test/corpus/.labels-sweep/results.jsonl`, same classpath and JVM flags as
   `layered-labels-vectors.sh`; `shellcheck -x` clean.
3. `test/corpus/labels-sweep.test.ts` + `test/helpers/layered-labels-sweep.ts`: replay each `ok` case through the real driver, hash,
   compare; count `refused`/`timeout` per category; `throws` must throw the same class; skip with a message when the models or sweep dir
   is absent; stride 2 default, `LABELS_SWEEP_STRIDE=1` for the full run. Time a 10-model subset first, then the full run; journal.
4. `.gitignore`: `test/corpus/.labels-sweep/`.
5. A mismatch is a port defect: `--dump` the case, produce the diagnosis artifact; never change the port, a helper or the canonical form
   to match (the classes are outside the write-set: hand the mechanism to the orchestrator, stop 1). A mismatch traced to a hashed
   container's order is stop 17. Report the refusal tally per category (outside 7g/7h is stop 5).
6. **FX3-style check (measurement only, nothing committed).** For each hashed container of this mission with an AD-10 journal row
   (`END_LABELS`, G4; any other the ports journaled), edit the port temporarily to the opposite order (END_LABELS iterated in reverse
   in `EndLabelPostprocessor`), run the sweep at stride 1, and record the count of matching cases against the unmodified count; revert
   and check `git diff` is empty. Run it after T14 has finished measuring (it reads `src/`). Journal per container: matches of total.
   Insertion order must match the sweep; a container where it does not is stop 17 with FX3's size-hash precedent in the journal.

## Write-set

`tools/vectors/LayeredLabelsVectors.java` (sweep and dump modes only), `tools/oracle/labels-sweep.sh`, `test/corpus/labels-sweep.test.ts`,
`test/helpers/layered-labels-sweep.ts`, `.gitignore`.

## Read-set

`tools/vectors/LayeredPipelineVectors.java` (sweep and dump modes), `tools/oracle/pipeline-sweep.sh`, `test/corpus/pipeline-sweep.test.ts`,
`test/helpers/layered-pipeline-sweep.ts`, `tools/vectors/layered-labels-vectors.sh`, `test/helpers/layered-labels-replay-*.ts`,
`decisions.md` G2, G3, G4, G7, F6, F14.

## Interface contract

Line format documented in the recorder header; `LABELS_SWEEP_STRIDE`, `LABELS_SWEEP_DIR`; results under `test/corpus/.labels-sweep/`.

## Acceptance criteria

- Given the full sweep at stride 1 with `ELK_MODELS_DIR` present, when replayed, then every `ok` case hash-matches.
- Given a refusal, when tallied, then its category is 7g or 7h.
- Given the recorder's no-flag path, when re-recorded, then `layered-labels.json` is byte-identical.
- Given the FX3-style check, when run, then insertion order matches the sweep for every journaled container (counts journaled).
- Given `git status` after the check, when read, then the port is unchanged.

## Observability / Rollback

Sweep tallies and timings in the journal; oracle timeouts recorded per case. Reversible.
