<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9: gates, roadmap, notes, squash

## Task

1. Queue gates 1-7 on the final tree, each journaled (`T9 gate`). Run them in this order:

   ```bash
   npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
   SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
   env $SWEEPS npm run coverage          # 90/90/90/90, the full suite
   npm run docs:build                    # journal the typedoc warning count
   npm run codeql                        # every finding fixed or accepted with a reason
   ```

   Gate 7: rerun `tools/vectors/layered-loops-vectors.sh` cold (`ELK_VECTORS_CACHE=off`, detached, `nice -n 10`,
   `uptime` ≤ 12). Then check `git diff --exit-code test/golden/refs/` against the committed tree, and
   `git diff --stat <base> -- test/golden/refs/`, which must show only `layered-loops.json`.
2. Append `## Revision <date> (layered-loops-evidence)` to `plans/roadmap.md` (never edit an earlier line). Cover:
   - the rows added (ids, counts, bytes);
   - the mutant verdicts (M1-M10);
   - the spline `:137` X classification and the Sc28 verdicts, pointing to this mission's `unreached.md` (D10);
   - the D7 rows;
   - any `needs-ruling` or `follow-up` issues;
   - the gates.
3. Write `.agent-notes/layered-loops-evidence.md` for anything novel, for example the unzipper as a producer of
   non-adjacent edges, the V8 sort's comparator call order, or the issue's recipes that did not discriminate.
4. Fill the README's "Mission summary" and mark the batches `[x]`.
5. Squash: `git tag layered-loops-evidence/pre-squash`, then `git reset --soft <base>`, then one commit with
   `git -c commit.gpgsign=false commit -F <file>`. Use the subject from [D11](../decisions.md#d11). The body covers the
   rows per item, the mutant verdicts, the reclassifications, the D3 diff result, and the issues filed. Footer
   `Refs: #55`, no attribution lines. Never push.

## Write-set

`plans/roadmap.md` (append only), `.agent-notes/layered-loops-evidence.md`, `plans/layered-loops-evidence/README.md`
(summary, batch status), `plans/layered-loops-evidence/decision-journal.md`.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then each passes, and its result is journaled with numbers.
- Given gate 7, when the recorder reruns cold, then `test/golden/refs/` has no diff, and only `layered-loops.json`
  differs from the base.
- Given `git log <base>..HEAD`, when read after the squash, then it shows exactly one commit with footer `Refs: #55`.

## Observability

N/A.

## Rollback

Reversible: the pre-squash tag keeps per-task history.
