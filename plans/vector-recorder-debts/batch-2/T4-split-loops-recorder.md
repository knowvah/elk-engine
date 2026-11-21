<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: split `LayeredLoopsVectors.java`

## Context

D3. The file is 4,571 lines at planning, pinned to `-XX:hashCode=2` by its script. Top-level members include:

- records `Raw`, `Result`, `Spec`, `Row`, `Level`, `ModelFile`, `Cand`, `LoopGraph`, `SweepCase`, `Setting`;
- classes `Bug`, `Refusal`, `Dump` (516), `Encoder` (710), `Base` (1111), `ShrinkWidthManager` (1489),
  `CancelledMonitor`, `NotInPlan`, `PlanRecorder` (2188), `OutOfScope`, `SweepStats` (4428);
- static methods between them.

The ref records `LayeredLoopsVectors$ShrinkWidthManager`.

## Write-set

- `tools/vectors/LayeredLoopsVectors.java`
- `tools/vectors/LayeredLoopsVectors/*.java` (new; SPDX `//` header each; default package)
- `decision-journal.md`

## Read-set

- `tools/vectors/LayeredLoopsVectors.java` (all)
- `tools/vectors/layered-loops-vectors.sh`: `check_models` greps the entry for the SHA table
- `test/architecture/elk-pin.fitness.test.ts`: rules over `tools/vectors/*.java`; helpers sit in a subdirectory
- `tools/codeql/scan.sh`: the Java suite runs `--build-mode=none` over the repo

## Steps

1. **Observable names.** Run `grep -o 'LayeredLoopsVectors\$[A-Za-z]*'` over `test/golden/refs/java/` and
   `test/corpus/.loops-sweep/results.jsonl`, and grep the source for `getClass()`, `getName()` and `getSimpleName()`.
   Journal the list. Every class on it, plus the four exception classes, stays nested in the entry.
2. **Cut by pure moves.** Move cohesive groups (for example the dump and encoder, the plan recorder, the sweep, the
   model and loop-graph builders) to top-level package-private classes in helper files.
   - Qualify the static calls that cross files.
   - Do not reorder statements within a method or the initialization order of static fields that hold state (a
     static initializer that registers or allocates stays where its order is unchanged, or stays in the entry).
   - Keep `main`, `elkCommit()`, the header and the SHA table in the entry.
   - Each file stays under 1,000 lines where a class boundary allows; journal any exception.
3. **Compile check.** Run `javac -d "$TMPDIR/pm50-split"` on the entry and helpers, with the script's classpath and
   its `JAVA_TOOL_OPTIONS`. It must report no errors; journal any new warnings.
4. **Ref check.** Run `tools/vectors/layered-loops-vectors.sh "$TMPDIR/pm50-t4"` (new salt, so `recorded`) and
   `cmp` the output with `test/golden/refs/java/layered-loops.json`. If it differs: stop 3, with the T1-only source
   as the control.
5. **Dump mode.** Pick one case id from the before-side `results.jsonl`, and run `loops-sweep.sh --dump <id>`
   before (T1 commit, via `git worktree` in `$TMPDIR`, or by checking out the old entry into a temp dir) and after
   the split. Journal whether the outputs are equal; a difference is stop 4.
6. Update the entry's header: "single-file source program" becomes "multi-file program built by
   `java-program.sh`; helpers in `LayeredLoopsVectors/`". Commit.

## Acceptance criteria

- Given the split recorder, when `layered-loops-vectors.sh` runs on its new salt, then `layered-loops.json` is
  `cmp`-identical to the ref.
- Given the split, then `LayeredLoopsVectors$ShrinkWidthManager` and the four exception classes are still nested,
  and no helper file exceeds 1,000 lines without a journaled reason.
- Given `--dump` of one sweep case, then output before and after the split is equal.
- Given `git diff --stat`, then the entry shrank and the helper files hold the moved code, with no logic edits.

## Observability

N/A: tooling only.

## Rollback

Reversible: revert the commit. The single-file launch path returns automatically when the directory is gone.
