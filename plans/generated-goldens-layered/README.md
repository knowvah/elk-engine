<!-- SPDX-License-Identifier: EPL-2.0 -->

# generated-goldens-layered: mission brief (issue #68)

## Objective

Three goldens of the `trees` set, `mrtree-generated`, `radial-generated` and `vertiflex-generated`, were recorded by
the oracle with **layered**: their entries carry no `retarget` and their corpus inputs
(`test/corpus/generated/<alg>-tree-small.json`) set no algorithm, so the oracle resolved the default. Every ref's root
says `resolvedAlgorithm: Layout Algorithm: org.eclipse.elk.layered`. `test/golden/tree-goldens.test.ts` lists them in
`RECORDED_WITH_LAYERED`. The maintainer ruled on #68 (2026-11-13, item C): keep them, as layered goldens, under ids that
say what they are. Items A and B of the ruling need no work here (A closed by #40; B is a docs line, T2). Item B's
0.01 px bar became the general bar for last-ulp math (#74); the `sloppy_overlaps_2` entry cites #74.

Exit (#68 item C, steps 1-5):

- `test/golden/layered.json` holds 27 entries: the 24 of mission 7h and three new ones (D1 ids), `algorithm`
  `org.eclipse.elk.layered`, variant `default`, no `retarget`, notes naming the source
  `test/corpus/generated/<alg>-tree-small.json`. `test/golden/trees.json` holds 37 entries; the three
  `*-generated-retarget` entries are unchanged.
- The three refs move from `refs/elk-trees/` to `refs/elk-layered/` by `git mv`, byte-identical.
  `git diff -M --stat <base> -- test/golden/refs/` shows exactly three renames at 100% similarity and nothing else. Both
  sets regenerate byte-identically by script (D5), which also proves neither `_meta.json` changes (D4).
- `RECORDED_WITH_LAYERED` and its uses are gone. `test/golden/layered-hierarchy-goldens.test.ts` lays out and passes all
  27 (D3).
- `docs/conformance.md` and the two architecture docs give the new counts; the mislabel notes are gone; the
  `sloppy_overlaps_2` entry carries the 0.01 px bar and cites #74 (D6).
- Queue gates 1-7 are green and journaled. One squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (generated-goldens-layered)`; `.agent-notes/generated-goldens-layered.md` is written (or the
  journal says nothing is novel).

**Not in this mission:** any ref content change; any comparator or tolerance change (ruling boundary); any `src/`
change; the AD-4 amendment and audit (#74); the `<alg>-generated-retarget` entries; the translated `docs-site/` pages
(#133); `tools/corpus/ts-findings.json` (its `#68` note stays until the branch merges); any oracle patch, `ELK_COMMIT`
change, or write to `~/git/knowvah/elk`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md)
   and `.agent-notes/generated-goldens-layered-planning.md`, and run `gh issue view 68 --comments`.
3. `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, commit it with
   `git add plans/generated-goldens-layered .agent-notes/generated-goldens-layered-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add generated-goldens-layered mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`63fa9aa4` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004 (true at planning).
   Otherwise rebuild with `tools/oracle/build.sh` and journal it. Record
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.core plugins/org.eclipse.elk.graph plugins/org.eclipse.elk.graph.json plugins/org.eclipse.elk.alg.layered plugins/org.eclipse.elk.alg.mrtree plugins/org.eclipse.elk.alg.radial plugins/org.eclipse.elk.alg.vertiflex`
   (empty at planning). A change is journaled, not a stop.
5. Baseline: see the journal's `plan` rows. Rerun it only if the base sha differs from `63fa9aa4`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API or service change; no `src/` change. Goldens move between two sets; no ref content changes.

| File | Action | Task |
| ---- | ------ | ---- |
| `test/golden/trees.json` (drop three entries) | Modify | T1 |
| `test/golden/layered.json` (add three entries, D1) | Modify | T1 |
| `test/golden/refs/elk-trees/{mrtree,radial,vertiflex}-generated.json` → `refs/elk-layered/<D1 id>.json` | `git mv` | T1 |
| `test/golden/inputs/pipeline/generated/{mrtree,radial,vertiflex}-tree-small.json` (byte copies of `test/corpus/generated/`, D2) | Create | T1 |
| `tools/oracle/regen-goldens.sh` (header; `generated/` paths resolve to `test/corpus/`, D2) | Modify | T1 |
| `test/golden/tree-goldens.test.ts` (delete `RECORDED_WITH_LAYERED`, D3) | Modify | T1 |
| `test/golden/layered-hierarchy-goldens.test.ts` (27 entries, D3) | Modify | T1 |
| `docs/conformance.md` (`:353-358`, `:1681-1685`, `:1875-1877`, `:1980-1987`, D6) | Modify | T2 |
| `docs/architecture/alg-trees.md` (`:152-160`), `docs/architecture/alg-layered-compound.md` (`:218-221`) | Modify | T2 |
| `plans/roadmap.md` (appended revision), `.agent-notes/generated-goldens-layered.md`, this README, the journal | Modify / Create | T3 (journal: orchestrator throughout) |

`test/golden/trees-inputs/*-generated.json` stay: the three `*-generated-retarget` entries read them. Neither
`_meta.json` changes (D4). No new package, env var or database change. Scratch work goes under
`$TMPDIR/generated-goldens-layered/` and is never committed.

## Quality gates

After each task: `npx vitest run test/golden/tree-goldens.test.ts test/golden/layered-hierarchy-goldens.test.ts test/golden/layered-goldens.test.ts`,
`npm run typecheck`, `npx prettier --check <changed files>`, `shellcheck tools/oracle/regen-goldens.sh` (T1), and
`git diff -M --stat <base> -- test/golden/refs/` (only the three renames at 100%). T3 runs queue gates 1-7
([T3](batch-2/T3-close-out.md)). Before any oracle run, check `uptime`, wait while it is above 12, and run under
`nice -n 10`. Each regen takes seconds, so it may run in the foreground. Start the full suite detached, as the queue
rules show.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire:

- stop 2: a regen run (D5) writes a ref that is not byte-identical to the moved or remaining one;
- stop 3: the TS layout of a moved golden fails in the layered runner.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Move the three goldens, prove byte identity | T1 | — | [x] |
| [2](batch-2/overview.md) | Docs; close-out and squash | T2, T3 | 1 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator does every task itself, with no subagents: two manifests, three
renames, one script, two tests and three docs, all sequential. It owns every oracle run, commit, `gh` call, `plans/`
and `.agent-notes/`. One commit per task before the squash.

**Time:** about 1.25 h. T1 takes 30 min, T2 15 min, T3 35 min (most of it the coverage run).

## Landing

1. Tag the tip `generated-goldens-layered/pre-squash`.
2. `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>`.
3. The message:
   - Subject: `test(golden): move three layered-recorded tree goldens to the layered set`, or a better one within 72
     characters.
   - Body: the ruling (#68 item C, 2026-11-13); the three old and new ids; the byte-identity proof (renames at 100%,
     both sets regenerate byte-identically, `_meta.json` unchanged); the input resolution of D2; the test changes of
     D3; the docs, with the #74 citation.
   - Footer `Refs: #68`. No attribution lines (queue rules).
4. Never push.

## Reference

- [decisions.md](decisions.md): D1-D6 and the auto-confirmed record.
- [stop-conditions.md](stop-conditions.md), [diagrams/component-map.md](diagrams/component-map.md),
  [diagrams/data-flow.md](diagrams/data-flow.md).
- Precedents: `plans/alg-trees/decision-journal.md` (T4 `fix` row and T18 rows: how the three were classified);
  `plans/parse-refs-layered-keys/` (a journaled ref operation proven by script).

## Mission summary (2026-11-23)

Completed 2026-11-23: 3 of 3 tasks. No halt, no partial.

- **Result.** `mrtree-generated`, `radial-generated` and `vertiflex-generated` left the trees set and are
  `generated-{mrtree,radial,vertiflex}-tree-small--default` in the layered set (`algorithm` `org.eclipse.elk.layered`,
  variant `default`, no `retarget`). `test/golden/layered.json` holds 27 entries, `test/golden/trees.json` 37.
- **Proof.** Refs moved by `git mv`. `git diff -M --summary 63fa9aa4 -- test/golden/refs/`: three renames at 100%, 0
  insertions, 0 deletions, nothing else. `regen-goldens.sh --set layered` (27 refs) and `--set trees` (37 refs) wrote
  nothing that differs; neither `_meta.json` changed (D4: they hold no ids or counts).
- **Landed.** The two manifests; the three renamed refs; three vendored inputs under
  `test/golden/inputs/pipeline/generated/`; the `generated/` resolver in `tools/oracle/regen-goldens.sh` (D2); both
  runners (D3); `docs/conformance.md`, `docs/architecture/alg-trees.md`, `docs/architecture/alg-layered-compound.md`
  (D6); the roadmap revision; `.agent-notes/generated-goldens-layered.md`. No `src/` file changed.
- **Not as planned.**
  - The red state had two failing tests, not one: with the exemption list gone, the tree runner's algorithm check
    failed on the three entries until they moved (journal, T1 `gate`).
  - The first `--set layered` regen started as the 1-minute load read 12.33, just after a poll at 11.75. Its output was
    unchanged; both sets were rerun behind a load gate, and those runs are the proof.
  - Three more current-state lines of `alg-layered-compound.md` were updated with D6's passage (contents row, test-table
    row, runbook comment).
  - The commits carry no attribution trailer: the queue rules ask for none.
- **Decisions.** D1-D6 as planned. Added: the vendored copies stay out of `test/golden/inputs/manifest.json` (it hashes
  elk-models files; its test is a frozen list), and the runner proves them against `test/corpus/` instead.
  **Flagged for review**: say so if they should be hashed there as well.
- **Gates.** Queue gates 1-7 green on the final tree (journal, T3 `gate`): coverage 1,212 files, 50,570 passed / 83
  skipped (baseline 50,569; the trees runner −3, the layered runner +4), 98.81 / 97.01 / 98.57 / 98.86, equal to the
  planning baseline; CodeQL with no new accepted entry; no ref differs from the base except the three renames.
- **Issues.** #169 (`follow-up`): `docs/architecture/overview.md:40` still counts 40 `trees` goldens. Comment: #68
  (hand-back). No `needs-ruling` issue.
