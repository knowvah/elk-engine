<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: recorder-pin-source (auto-confirmed at planning, 2026-11-20)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Any write in `../elk`, `$ELK_MODELS_DIR`, `~/.claude`, the main checkout or
   another repository. `$ELK_ORACLE_DIR` only through `tools/oracle/` and `tools/vectors/` scripts (the vector cache
   and sweep dirs they fill); a rebuild only if the mission-start stamp check fails.
2. **Baseline red.** A queue gate fails on the untouched tree: journal the failing test names and halt as blocked.

## Partial stops (file and continue)

3. **A ref changes (AD-13).** Any byte of `test/golden/refs/` differs after a cold run, or a new script's output
   differs from its committed ref under `cmp`. Do not re-record, edit, or revert the ref to green. Enter diagnosis
   mode (mechanism, origin, chain, ruled out) on the oracle side first. The expected mechanism, if it happens, is an
   unpinned recorder (no `-XX:hashCode=2`: `alg-common`, `comment`, `elkt`/`elkj`/`elkr`, `graph`, `graph-json`,
   `metadata`, `transfer`, `node-micro-layout`, `nodespacing-site`, `layered-framework`, `layered-site`) whose output
   follows identity hashes that javac's allocations shifted when the source changed; prove it by running the base
   source of that recorder under the same oracle (byte-equal to the ref) and the edited one twice (equal to each
   other). Restore the committed ref with `git checkout -- <ref>`, keep the T1 edit, file `needs-ruling` naming the
   ref, the rows and the mechanism (the remedy, pinning the flag, is itself a ref change), and finish the rest. If a
   change has another mechanism, the same, with the artifact.
4. **A sweep's `results.jsonl` differs** from the T0 before-side. Same handling as 3, without a ref to restore; the
   sweep dir is gitignored. If the before-side was not fresh at T0 (see T0), the comparison is void: journal it as
   such, not as a pass.
5. **More would change.** A recorder needs an edit beyond D2 (more than one stamp site, a stamp read in sweep mode,
   a second constant), a sweep script or the salt formula needs a change, or a recorder outside the 41 would have to
   change: do not make it; file `needs-ruling` with the file and reason.
6. **A new script cannot reproduce its ref** with the documented command (for example `GuavaVectors` needs a JVM flag
   the header does not name): that is stop 3 for that ref; the script is not committed with a flag the ref was not
   recorded with.

## Mechanics

7. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count): halt with the diagnosis so far.
8. **Load.** Before a recorder, sweep or the full suite, check `uptime`; above 12, wait; run under `nice -n 10`. Never
   start the full suite or a multi-process sweep beside another multi-process job; the `elkj` lane is one JVM and may
   run beside short recorders, one at a time (runbook § 7).
9. **The `elkj` lane fails or exceeds 7 h.** Journal the log tail and the last row; if the failure is the D2 check
   (property missing), fix the caller and restart; any other failure is diagnosis, then halt if unexplained.

## Push-forward (decide and journal, do not stop)

- Accessor message wording, its exact line in each file, and where the early `elkCommit()` call sits in a vector path.
- The transformation script (kept in `$TMPDIR`, not committed) and the order of edits.
- Fitness-test shape and names; dropping D4 item 3 with a journaled reason.
- Header-comment wording of the two new scripts, `vector-cache.sh` and the four direct scripts.
- Runbook wording; whether § 5 step 3 keeps its number with a one-line "nothing to edit" body (preferred: section and
  step numbers are cited elsewhere) or is merged.
- `follow-up` issues for anything else found on the way (for example stale `Run:` comments in the two unedited
  sources, translated `docs-site/` runbook pages if any).
