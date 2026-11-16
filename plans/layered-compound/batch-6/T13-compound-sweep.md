<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Compound sweep

**Agent:** java-architect (sonnet) · **Commit:** `test(T13): add the compound breadth sweep`
Scratch: `$TMPDIR/7h/T13/`.

## Context

Mission 7h, H5. 7g's loops sweep is the shape: `LayeredLoopsVectors.java --sweep/--dump`, `tools/oracle/loops-sweep.sh [--force]`
(a stamp over the oracle build, recorder source, models commit and inputs; run `--force` after any diagnosis-aid run),
`test/corpus/loops-sweep.test.ts`, `test/helpers/layered-loops-sweep.ts`, `LOOPS_SWEEP_DIR`, `test/corpus/.loops-sweep/`
(gitignored), and the NaN-canonical hash (issue #53, open: follow a ruling if one lands before this task).

## Task

1. `--sweep <modelsDir> <outDir>` / `--dump <case id> …` in `LayeredCompoundVectors.java` (≤ 5,000 lines in total, stop 13), with
   the cases of H5. Part (a) is the label sweep's enumeration, copied with its origin cited and kept only where `INCLUDE_CHILDREN`
   is set (expected 50). Part (b) is every `INCLUDE_CHILDREN` `.elkt`/`.json` of `tests/layered`, `tickets/layered` and `examples`
   × `default` and the 4 directions. Part (c) is every `realworld/ptolemy/hierarchical/*.json` with `INCLUDE_CHILDREN` at the
   root × the 4 directions. A model with an unregistered algorithm (`elk.stress`) is out of scope, counted per part. No refusal
   category remains, so any refusal stops the sweep naming the case. Each case gets 20 s.
2. `tools/oracle/compound-sweep.sh [--force]` (shellcheck clean), `COMPOUND_SWEEP_DIR`, `test/corpus/.compound-sweep/` added to
   `.gitignore`, `test/corpus/compound-sweep.test.ts` (skips when the dir is absent, like the loops sweep), and
   `test/helpers/layered-compound-sweep.ts` with its test.
3. Run detached at stride 1 (`uptime` first, `nohup nice -n 10 …`, polls of at most 9 min). Journal the counts per part and the
   out-of-scope count. A part (a) count other than 50 is journaled with its mechanism. Every `ok` case must hash-match, and
   throws must be equal on both sides. A mismatch enters diagnosis mode (stop 17/19).

## Write-set

`tools/vectors/LayeredCompoundVectors.java`, `tools/oracle/compound-sweep.sh`, `test/corpus/compound-sweep.test.ts`,
`test/helpers/layered-compound-sweep{,.test}.ts`, `.gitignore`.

## Read-set

`tools/vectors/LayeredLoopsVectors.java` (`--sweep` part and its header lines 12-33), `LayeredLabelsVectors.java` (`--sweep`
part), `tools/oracle/loops-sweep.sh`, `test/corpus/loops-sweep.test.ts`, `test/helpers/layered-loops-sweep.ts`, `decisions.md` H5.

## Acceptance criteria

- Given the sweep at stride 1, when run, then every `ok` case matches, there are 0 refusals, and the journal holds the per-part
  counts, with any difference from 50 in part (a) explained.
- Given T1's ref, when the recorder is re-run after this task, then `layered-compound.json` is byte-identical.
- Given a second sweep run with nothing changed, then the stamp hits and the results are reused.

## Observability / Rollback

Stderr: per-part counts, out-of-scope counts, timeouts. Reversible.
