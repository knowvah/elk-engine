<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: queue gates, records, #116 comment, squash

## Write-set

- `plans/roadmap.md`: append a `## Revision <date> (corpus-sweeps-asserts)` section. Never edit an earlier line.
- `.agent-notes/corpus-sweeps-asserts.md`, for novel observations (D3's presence-only throws rule is one).
- `plans/corpus-sweeps-asserts/decision-journal.md`, the README's batch status and summary.
- Delete `test/corpus/assert-site-probe.test.ts` if T1 created it.

## Steps

1. Delete the probe. `git status --short test/` lists no untracked file.
2. Run queue gates 1-7 on the final tree and journal each (exit code, totals):

   ```bash
   npm run format:check
   npm run typecheck
   npm run complexity                      # read the output; never trust plain lizard's exit code
   nohup nice -n 10 bash -c 'npm run coverage; echo "exit $?"' >"$TMPDIR/coverage.log" 2>&1 &   # ~15 min; poll ≤ 9 min
   npm run docs:build                      # journal the typedoc warning count
   npm run codeql                          # every finding fixed or accepted with a reason
   git diff --exit-code <base> -- test/golden/refs/
   ```

   For gate 7: no recorder input changes, so no script is rerun. The base for gate 4 is the planning row: 1,258 files,
   51,964 passed, 83 skipped, and 98.88 / 97.05 / 98.67 / 98.92 %. If T2 changed `src/`, also run the full suite with
   `ELK_DEV_ASSERTIONS=off` (it must be green as well).
3. Records:
   - Roadmap revision: what ran, per-sweep counts, the sites and outcomes, and the issues filed. State the
     residual: five comment sites wait on knowvah/elk#27, #28 and #128, and #137 covers the non-layered algorithms.
   - Notes file.
   - README batch table `[x]`.
4. Comment on #116 (`gh issue comment 116 --body-file <file>`) with a per-sweep table (checked / ok / throws /
   `AssertionError`s), each site's outcome with its issue number, and the squash sha after step 5. Do not close the
   issue: it closes when the branch merges.
5. Squash (README "Landing"). The message is per D6: subject ≤ 72 characters, lowercase, no period; a body that says
   why; footer `Refs: #116`; no attribution lines. Write it to a file and commit with
   `git -c commit.gpgsign=false commit -F <file>`.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then each passes and is journaled with its figures.
- Given the squash, when `git log --oneline <base>..HEAD` runs, then it prints exactly one commit, its footer is
  `Refs: #116`, and the tag `corpus-sweeps-asserts/pre-squash` points at the pre-squash tip.
- Given #116, when T3 ends, then it has a comment with the per-sweep results and each site's outcome, and its labels
  are unchanged by the executor (the driver manages labels).

## Observability / rollback

N/A: this task adds no new observable operations. It is reversible.
