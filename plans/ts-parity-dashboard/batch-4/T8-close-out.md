<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8: close-out and squash

Decision: TP8 ([decisions.md](../decisions.md)); stop 17. Run by the orchestrator.

## Steps

1. Mission-end gates ([README § Quality gates](../README.md#quality-gates), the end block), run alone. Journal each result
   (queue gates 1–6), including `regen-goldens.sh` for the six landed sets and `git diff --exit-code test/golden/refs/`.
2. `plans/roadmap.md`: append `## Revision <date> (ts-parity-dashboard)`, as the earlier revisions do. It covers:
   - row 9 is done;
   - evidence (oracle and TS counts per algorithm, residuals, the `Math.*` list, the fitness test);
   - decisions TP1–TP8 and the deviations;
   - divergences;
   - changes to landed code (T6, if any);
   - hand-offs (row 12: the dashboard publishes with the docs site; row 13: the sweep and report runbook is the upgrade check);
   - flags for the maintainer.

   Edit no earlier line.
3. `.agent-notes/ts-parity-dashboard.md`: novel observations only, in the memory template.
4. README: tick the batches and add a `## Mission summary` (exit items with their journal rows, decisions, flags, issues
   filed), in the shape of `plans/alg-packing/README.md`.
5. Issue comments:
   - #40: the report path and the per-algorithm counts;
   - #79: the flicker seen in the two TS runs;
   - #68 and #71: the residuals are `ok`;
   - #74: point to the new `Math.*` list as the audit's input.
6. Squash: `git tag ts-parity-dashboard/pre-squash`, `git reset --soft <base>`, then one commit with
   `git -c commit.gpgsign=false commit -F <file>`. Subject: `feat(corpus): ts sweep and per-algorithm parity dashboard (9)`.
   The body says why: sharded with a per-case limit, the report is the dashboard, the `Math.*` list. Footer: `Refs: #40`.
   Follow the queue rules: lines ≤ 80 characters, no attribution lines. Check `git log --oneline <base>..HEAD` shows exactly
   one commit and `git status` is clean.

## Acceptance criteria

- Given the end gates, when they run, then all six queue gates pass and are journaled.
- Given the roadmap, when `git diff plans/roadmap.md` is read, then it shows only the appended revision.
- Given the squash, when `git log <base>..HEAD` runs, then it shows one commit with footer `Refs: #40`, the tag
  `ts-parity-dashboard/pre-squash` exists, and the tree is clean.

**Observability:** N/A. **Rollback:** the pre-squash tag keeps the per-task history.
