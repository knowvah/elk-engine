<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: canonical-nan (issue #72, 2026-11)

## Observation: V8 keeps a NaN's sign bit, and a negated NaN has it set

- **Context**: deciding whether moving the TS encoders to `canonicalHex` changes behaviour or only wording (T1, T3).
- **Finding**: on Node v26.3.1 (arm64) a NaN read from the bits `fff8000000000000` or `7ff8dead0000beef` keeps those bits
  through variables, object fields, arrays and maps, and `DataView.setFloat64` writes them back unchanged. `0/0`,
  `Infinity - Infinity`, `Math.sqrt(-1)` and `Number('NaN')` give `7ff8000000000000`; `-NaN` gives `fff8000000000000`.
- **Impact**: a raw encoder on the port side can emit `fff8…` wherever the port negates a NaN, so the raw TS encoders
  were a real source of sign-bit mismatches, not only the JVM. A test of "both NaN signs encode alike" is meaningful on
  V8: build the negative NaN with `longBitsToDouble(0xfff8000000000000n)` (`NEGATIVE_NAN` in `test/helpers/double-hex.ts`).
- **Confidence**: High (probe output in the journal, T1 `note`)

## Observation: no landed ref or cached sweep hash held a NaN with the sign bit set

- **Context**: rerunning all 22 layout recorders and all eight oracle sweeps after the move to `Double.doubleToLongBits`.
- **Finding**: 29 ref files and 67,111 sweep result lines came out byte-identical. The layout refs with NaN tokens
  (`force.json` 6,440, `spore-layout.json` 56, `mrtree-units.json` 72) hold only `7ff8000000000000`, and no `ok` case of
  the pipeline sweep (the one sweep whose hasher was raw on layout output) changed its hash. The sign-bit flip #53 saw was
  in the loops sweep (7g), which hashed canonically already.
- **Impact**: the canonical form is a guard against a flake, not a correction of recorded data. A later mission that sees
  a NaN-only ref or hash change after this one should suspect a new raw encoder first (the fitness test names them).
- **Confidence**: High

## Observation: editing one recorder turns every recorder's vector cache cold

- **Context**: the unchanged-recorder baseline and the reruns (T1, T4).
- **Finding**: `vector-cache.sh` salts each entry with the program's own source, but its inputs digest covers every file
  under `tools/vectors/`. At the base 21 of 22 recorders were already cold (only layered-compound hit), and after T2 all
  22 were. Cold timings on this machine under `nice -n 10`: 1 to 11 s for most; layered-pipeline 16 to 24 s;
  layered-loops 19 to 35 s; force 45 to 58 s; layered-labels 49 to 52 s; spore-layout 66 to 72 s. All 22 together are
  about 5 minutes of JVM time; waiting for the load gate took longer than the runs.
- **Impact**: "rerun every layout recorder" is a 5-minute job, so a baseline before and a rerun after are both
  affordable. A cache hit proves only that the ref equals an earlier recording; the cold rerun is the oracle proof.
- **Confidence**: High

## Observation: the load gate reads the mission's own runs

- **Context**: gating JVM runs on a 1-minute load of 12 or less while running the sweeps one after another (T4).
- **Finding**: the seven smaller sweeps take 12 to 64 s each. The phase sweep took 497 s for 32,652 cases; its JVM ran at
  about 600 % CPU and the load average rose above 200 while it ran (other sessions were busy too, so the share is not
  measured). The full vitest suite pushes the load past 100 as well. The 595 `timeout` ids of the phase sweep were the
  same as on 2026-11-20, so its time limit is not load-sensitive at that level.
- **Impact**: run the phase sweep last, and expect a load gate sampled right after it, or after a suite run, to wait on
  load the mission caused itself.
- **Confidence**: Medium (one run; the split between this session and others was not measured)

## Observation: a queue base can be a rebase of the tree the last gate ran on

- **Context**: gate 4 passed with 73 fewer tests than the planning baseline although the mission added 34 (T5).
- **Finding**: `chore/issue-queue` was rebased onto a newer main between the previous mission's gate and
  this mission's start (`git reflog show chore/issue-queue`: "rebase (finish)"). Main had deleted a test file, changed
  docs tests and added `src/layout.ts`, so the journaled totals of the previous mission described another tree. The full
  suite on an exact copy of the base tree (rsync of the worktree with its gitignored state, then the mission's diff
  undone file by file) gave the true base: 1,214 files, 50,611 passed, 83 skipped, in 277 s without coverage.
- **Impact**: a planning baseline quoted from an earlier journal holds only if the base commit's tree is the one that
  gate ran on; compare committer dates with the gate's log time. A copy of the worktree in `$TMPDIR` gives a base
  measurement without detaching HEAD or touching the branch (set `ELK_SOURCE_DIR`, `ELK_ORACLE_DIR` and
  `ELK_MODELS_DIR` to absolute paths, because the defaults are relative to the repository root).
- **Confidence**: High

## Observation: a token-based fitness test forbids equivalent forms that still name the token

- **Context**: D2 kept `ForceVectors.hex`'s `isNaN ? NAN_HEX : raw` as "already equivalent"; D5 forbids
  `doubleToRawLongBits` in every layout recorder.
- **Finding**: the two decisions contradict each other for that one line. The mission swapped the call inside the ternary
  (output identical, proven by the cold rerun of `force-vectors.sh`) instead of adding an allowlist entry that would have
  let a later raw site in the same file through.
- **Impact**: when a brief pairs "leave equivalent code alone" with a grep-style guard, check each "equivalent" site
  against the guard's pattern at planning time.
- **Confidence**: High

## Observation: `a && b && nohup c &` backgrounds the whole list

- **Context**: committing and then starting a detached recorder run in one shell command.
- **Finding**: `&` applies to the whole AND-list, so the commits ran in the background too and the tool returned before
  they finished (they did succeed).
- **Impact**: start a detached run in its own command, after the foreground steps have reported.
- **Confidence**: High
