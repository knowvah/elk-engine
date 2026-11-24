<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: tree-recorder-gaps (issue #66)

Locked for this mission. A contradiction found during execution is stop 6 ([stop-conditions.md](stop-conditions.md)).

## D1: three new ref files, existing refs byte-identical

**Context.**

- `radial.json`'s 309 ids are pinned by `test/helpers/radial-replay-rows.test.ts:71`.
- `vertiflex.json`'s counts (247 / 216 / 8) are pinned by `test/helpers/vertiflex-replay-rows.test.ts:42` and `:87`.
- `mrtree.json`'s counts are pinned by `MrTreeVectors.test.ts` (`FIRST_REF_COUNTS`). `mrtree-extra.json` is 8,117,818 bytes
  against its 8 MiB cap (`MrTreeVectors.java:234`), and its seeded shapes draw in plan order.
- #156 shows where appending rows to a ref with pinned counts leads: an AD-13 STOP.

**Decision.** The new rows go into `test/golden/refs/java/radial-extra.json`, `vertiflex-extra.json` and `mrtree-extra2.json`.
The issue names the pattern ("use a second ref file as `mrtree-extra.json` does"). The five landed tree refs stay
byte-identical.

**Rejected.**

- (a) Appending to the existing refs: it changes pinned counts (AD-13).
- (b) Appending to `mrtree-extra.json`: it is at its cap, and the change touches a landed ref for no gain.
- (c) A new recorder program per bundle: it duplicates a harness of 1,400 to 1,700 lines (dump, round trip, self-checks).

## D2: each recorder writes its new file after the existing ones, from its own plan

**Decision.**

- Each recorder gains one more plan: a separate scenario list and builder method, with its own seed constants. Seeds in
  use: radial 8301, vertiflex 8101, mrtree 8101/8102 and 8201/8202. Pick unused values and journal them. It also gains one more output
  written **after** the existing file or files, with the same row contract, header shape, strict-JSON parse and self-checks
  (round trip, two builds byte-identical) as the file before it.
- The existing plan, its seeds, its static lists and its output order are untouched. A scenario is never added to an
  existing list, because a static list read by the first file would change it.
- An env selector in the style of `MRTREE_FILE=main|extra` is allowed (push-forward). The default run writes every file.
- Header comments of the recorder and its `*-vectors.sh` name the new file. No other script change.

**Consequences.** Each recorder's salt changes, so one cold run per script. Cold runs take 3-6 s. The cache copies every
file of the output dir, so a second output needs no `vector-cache.sh` change (`vc_run_whole`).

## D3: replay through new test files, existing assertions untouched

**Decision.**

- Radial: `src/alg/radial/RadialExtraVectors.test.ts` replays every row of `radial-extra.json` (full through the engine,
  stops step by step, throws by class, message and frame) with the helpers `RadialVectors.test.ts` uses
  (`loadRadialRows(group, file)`, `runEngine`, `runStops`, `compareStop`, `throwDiffs`).
- Vertiflex: `src/alg/vertiflex/VertiFlexExtraVectors.test.ts` does the same with `loadVertiFlexRows(group, file)` and
  `vertiflex-replay-run.ts`.
- Mrtree: append `'mrtree-extra2.json'` to `REF_FILES` in `src/alg/mrtree/MrTreeVectors.test.ts`. Its header says that is how a
  ref of the same contract is added.
- A path helper (`radialExtraRefPath` and so on) may be added to the bundle's `*-replay-rows.ts`. No other helper change,
  unless a helper hardcodes the first file. Then the task adds an optional parameter with the old default and journals it.
- Each new test file asserts its file's `rowCounts` with literal numbers taken from the recording, as the existing tests do.

## D4: one outcome per item, and the evidence for it

Each item of [items.md](items.md) ends with exactly one outcome:

1. **Recorded.** A row in a new ref replays at the AD-4 bar, and:
   - for an **arm** item, a scoped coverage run of the new test file alone (`npx vitest run <new test> --coverage
     --coverage.include=<file>`) shows the arm taken, where the existing replays alone do not (T1 baseline);
   - for a **mutant** item, the T1 harness applies the mutant: the new test file fails and the existing replay tests still
     pass (the gap was real). Then the harness restores the file and the new test file passes.
2. **Reached on the oracle, port diverges.** Stop 2. The row stays out of the ref, and the item names the `follow-up`.
3. **Proven unreachable through ELK JSON.** A proof from the Java (class D or P, the `unreached.md` classes), with the guard
   and the invariant. A mutant may also be proven equivalent.
4. **Unreached, not proven.** The budget ran out. Record what was tried and the closest approach (stop 7).

**Budget:** 45 min of wall clock per item, from the subagent's spawn time, items in [items.md](items.md) order within a
bundle. Unused time carries over to the next item of the same bundle. Outcome-1 rows are kept minimal: the smallest graph
that does it, at most two rows per item (a full row, plus a stops row when the arm sits inside a step).

## D5: the dump extension is a needs-ruling part

**Context.** Issue bullet 4: the mrtree stop dump lacks a node's in-edge order and the graph's `DIRECTION` after `NodePlacer`, so
isolated replays skip 27 graphs and the helper restores `DIRECTION`. Extending the dump means:

- re-recording `mrtree.json` and `mrtree-extra.json` (every stop gains fields);
- changing `UNRESTORABLE_GRAPHS = 27` (`test/helpers/mrtree-replay-dump.test.ts:62`) and the refusal test around it. That is a
  frozen expected value, so AD-13 makes it a STOP.

**Decision.** T1 files a `needs-ruling` issue. The question: may the dump be extended, with both refs re-recorded by script
(old fields byte-equal, proved by stripping the new keys) and the count of 27 lowered to what the extension leaves? Name
the files and lines. `mrtree-extra2.json` uses today's dump contract, so the rows of all three files share one replay path.

**Rejected.** (a) Extending the dump in the new file only: two dump contracts in one recorder, and the 27 graphs stay
skipped. (b) Doing the whole extension: the queue rules make a changed expected value a `needs-ruling` part.

## D6: outcomes are appended to the 8a records, never rewritten

**Decision.** T5 appends a section `## tree-recorder-gaps (#66), <date>` to `plans/alg-trees/unreached.md`, with one row per item
(outcome, row ids, evidence pointer). Earlier rows stay as written. The section says which earlier `R` rows it supersedes.
`plans/alg-trees/decision-journal.md` gains one closing row. This follows `plans/layered-arm-search/` D8.

## D7: no production change; a divergence is a partial

**Decision.** No file under `src/` changes except the three test files of D3. If a new row replays differently from the oracle:
use diagnosis mode to find the first divergence, keep the row out of the ref (remove its scenario, or exclude it with the
selector and journal the id), file a `follow-up` issue with the diagnosis artifact, and record outcome 2.

## D8: the mutation harness is scratch, timed and self-restoring

**Decision.** T1 writes `$TMPDIR/tree-recorder-gaps/mutate.sh <file> <line> <from> <to> <test files...>`. It:

- copies the file aside;
- applies the one-token change on that line, and fails if the change applies zero times or more than once;
- runs `timeout 300 npx vitest run <test files>` (the 8a note: an external kill timer is needed);
- restores the file in a `trap` on every exit path;
- checks that `git diff --quiet -- <file>` holds afterwards;
- prints `killed` or `survived` per test file.

It is never committed. Its text goes into the journal. A mutant edits the shared tree, so these rules apply:

- A subagent mutates only files of its own bundle (`src/alg/<bundle>/`), one mutant at a time.
- Algorithm bundles never import each other (AD-8), so the mutant cannot reach another bundle's tests.
- The orchestrator runs no `typecheck`, coverage or full suite while a batch 2 subagent is working.

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-23. Selected #66, the lowest-numbered open
`queue:ready` issue with no "Blocked by" reference. No `queue:planned` issue was open.

| Decision | Chosen | Rejected | Evidence |
| -------- | ------ | -------- | -------- |
| D1 ref layout | three new files | append (AD-13 count pins); new recorder programs | `radial-replay-rows.test.ts:71`, `vertiflex-replay-rows.test.ts:42`, `MrTreeVectors.java:234`, #156 |
| D3 replay | new test files, `REF_FILES` append | `describe.each` refactor of the existing tests (edits frozen files) | `MrTreeVectors.test.ts:10` comment |
| D4 outcome scheme | four outcomes, 45 min per item | open-ended search | `plans/layered-arm-search/decisions.md` D3/D4 |
| D5 dump extension | `needs-ruling` | do it; do it in the new file only | `mrtree-replay-dump.test.ts:62` (frozen 27) |
| D7 divergences | partial with `follow-up` | fix `src/` in this mission | queue rules ("new defects: follow-up"); #59 precedent |
| Mission name | `tree-recorder-gaps` | `trees-recorder-scenarios` | — |
