<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: ts-parity-dashboard (auto-confirmed at planning, 2026-11-13)

These are in the queue form. A stop that blocks only some cases or part of one task: file it with
`gh issue create --label needs-ruling`, name the exact cases or files, journal it as a `ruling` row, leave those cases as they
are, and finish the rest. A stop that blocks the whole mission halts it: journal it, commit the work, and end with the halted
line the driver prompt names. A write outside a task's write-set is not a stop; journal why it was needed.

1. **Outside the worktree.** A change needs `../elk`, `../elk-end-label-*`, `$ELK_MODELS_DIR`, `~/.claude`, the main checkout,
   or a new or changed oracle patch → `needs-ruling`.
2. **Repeated failure.** The same gate check fails twice in a row (failures caused only by a timeout at high load do not
   count), or one location is edited three times in a row for the same check → halt that task with the diagnosis so far.
3. **AD-13.** A byte diff in a landed ref, vector or golden; a landed test that passes only if its assertion changes; an
   expectation derived by hand. Leave the row and file it. Moving existing `ts-layout-compare.test.ts` cases is allowed only
   with their assertions unchanged (TP2 keeps the re-exports, so the file can stay as it is).
4. **Locked decisions.** A change would contradict TP1–TP8, an earlier mission's rows, or AD-1…AD-16 (above all AD-4's 1e-6 and
   AD-5's local sweeps).
5. **Findings beyond the bound.** After T5 there are more than 10 distinct mechanisms that are landed-port defects, or more than
   200 unannotated cases. Do not halt: file one `follow-up` issue per mechanism with its artifact, annotate the cases, and
   finish. The dashboard shows them. Journal it as a `ruling` row and flag it in the README summary.
6. **Nondeterminism.** A TS case changes between two TS runs of the same oracle sweep, outside spore's `Math.random()` jitter
   (PK4) and `random`'s unseeded nested composites. That is a port defect or a harness fault: diagnose it. A spore case that
   flickers goes to #79 as evidence; it is never reclassified (TP5).
7. **Oracle sweep health.** Any `oracle-error` verdict, a `timeout` count above the old report's 1, or a `parse error` in the
   fresh sweep → diagnose before the TS sweep. A harness fault in landed `tools/oracle` files is `needs-ruling` (they are
   frozen for this mission).
8. **Coverage.** Below 90/90/90/90; any new `tools/corpus` module below 90 % branches.
9. **Suite time.** `npm test` (every sweep directory `/nonexistent`) takes more than the baseline plus 20 s at similar load.
10. **Byte identity.** `regen-goldens.sh` for any landed set differs from the committed refs.
11. **Report drift.** `parity-report.ts --ts-summary <final>` without `--write` reports the committed report stale at mission end.
12. **Docs build.** `npm run docs:build` fails, or `docs-site/parity.md` does not contain the `TS sweep` table.
13. **Residual cases.** One of the 13 cases of #68 item A or #71 item 2 is not `ok` → diagnose it (the maintainer's
    "anything else is a defect to diagnose"); it never becomes an annotation by itself.
14. **Divergence.** A coordinate differs from the oracle by more than 1e-6. Trace the first point where the run departs from
    the oracle. If the mechanism is in tooling, fix it at its origin. If it is in a landed port, follow TP6 and stop 15. If it is
    below the code, prove it with a controlled experiment and file `needs-ruling` (a new known-divergence entry needs the
    maintainer's approval; the 0.01 px rule belongs to #74). Never loosen the bar.
15. **Landed-code defect.** A mismatch traced to a landed `src/` module is fixed at its origin only if the fix stays in one
    module, comes with oracle evidence (a sweep case plus a unit test whose expectation comes from the oracle output), and
    changes no landed expected value. Otherwise: a `follow-up` issue (TP6).
16. **Upstream.** An ELK defect that the port copies: draft it in the journal and file `needs-ruling`. Never open a fix branch,
    never file upstream.
17. **Mission end.** Squash as TP8. The driver checks that there is one commit on the base and that the tree is clean.

## Push-forward (decide and journal)

- Module splits of `ts-layout-compare.ts` and `parity-report.ts` that keep the current exports.
- Shard count, timeout default and child protocol details.
- The order and wording of report cells, where TP4 leaves them open.
- Fanning T5 out into per-algorithm agents (the orchestrator merges `ts-findings.json`).
- Annotation wording; `follow-up` issues for defects outside the mission.
- Fixes of 1–3 lines to pre-existing problems in the files being edited.
- Reruns after a failure caused only by a timeout.
- Scratch directories under `$TMPDIR/ts-parity-dashboard/`; `.agent-notes/ts-parity-dashboard.md`.
