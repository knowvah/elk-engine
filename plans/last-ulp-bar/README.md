<!-- SPDX-License-Identifier: EPL-2.0 -->

# last-ulp-bar: mission brief (issue #74)

## Objective

The maintainer ruled on 2026-11-13 that the general bar for last-ulp math divergences is **0.01 px**: "we pursue
perfection but accept deltas because the algos for trig functions work that way." The conformance bar stays 1e-6. A case
that misses 1e-6 is a known divergence only when its mechanism is a demonstrated last-ulp difference between HotSpot
`Math.*` and V8 **and** its effect on every position and size stays at or below 0.01 px against the oracle. A larger
effect, or a flipped discrete decision, is a defect or a STOP. Each entry is pinned per case, never by a global tolerance.
This mission appends that rule to AD-4 as an amendment, states it in `CLAUDE.md` and `docs/conformance.md`, audits every
existing last-ulp entry, and gives each one a measured maximum positional delta and a test that pins its mechanism and its
bound ([D0](decisions.md#d0-the-ruling-this-mission-executes)).

Exit (#74):

- `plans/elk-engine-skeleton/decisions.md` ends with `## AD-4 amendment (2026-11-13)`: the four-point rule of #74 and a
  link to the issue. The AD-4 text is byte-identical ([D1](decisions.md#d1-where-the-rule-is-written)).
- `CLAUDE.md` (Verification, conformance-bar bullet) and `docs/conformance.md` § 2 state the bound (D1).
- The audit table (T1, journal) lists every last-ulp entry with its class, mechanism evidence and measured maximum
  positional delta ([D2](decisions.md#d2-audit-scope-and-classes), [D3](decisions.md#d3-how-a-delta-is-measured)).
- `tools/vectors/LastUlpVectors.java` records HotSpot `Math.*` against `StrictMath.*` on each entry's inputs and the
  oracle layout of the radial entry, into the new ref `test/golden/refs/java/last-ulp.json`
  ([D4](decisions.md#d4-mechanism-and-oracle-evidence-a-new-jvm-vector)).
- `test/golden/last-ulp-divergences.test.ts` pins each accepted entry: mechanism, delta at or below its measured value,
  measured value at or below 0.01 px, no discrete difference ([D5](decisions.md#d5-the-pinning-test)).
- `docs/conformance.md` § 2 has a table of last-ulp entries (mechanism, measured delta, pin) and the three "audit is
  issue #74" sentences are replaced by the result ([D6](decisions.md#d6-docs)).
- Every entry above the bar or without a demonstrated mechanism is a `needs-ruling` issue, not fixed here.
- Queue gates 1-7 green and journaled; one squashed commit on the base; `plans/roadmap.md` gains
  `## Revision <date> (last-ulp-bar)`; `.agent-notes/last-ulp-bar.md` is written.

**Not in this mission:**

- Any change to the 1e-6 tolerance, `compare-json.ts` defaults, an existing ref or golden, or any `src/` file.
- Fixing an entry that fails the bar (it becomes `needs-ruling`). A fdlibm or HotSpot-intrinsic port of `sin`/`cos`.
- The 34 math call sites with "none observed": they have no divergence to bound (D2). The `docs-site/` pages,
  `tools/corpus/ts-findings.json`, `docs/parity-report.md`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md)
   and `.agent-notes/last-ulp-bar-planning.md`. Run `gh issue view 74 --comments` and `gh issue view 68 --comments`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/last-ulp-bar .agent-notes/last-ulp-bar-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add last-ulp-bar mission brief"`. Record the squash base in the
   journal: the driver's base if the prompt names one, otherwise that commit's parent (`e8bcacf1` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004 (held at planning,
   `builtAt` 2026-11-21T05:47:58Z). Otherwise rebuild with `tools/oracle/build.sh` and journal it (stop 8). Check
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.{core,alg.radial,alg.disco}`
   (empty at planning) and journal it.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract, service dependency or `src/` change. Docs, one new recorder, one new ref and one new test.

| File | Action | Task |
| ---- | ------ | ---- |
| The journal, the README batch table | Modify | T1, T4, T5 (orchestrator) |
| `tools/vectors/last-ulp-inputs.txt` (the divergent-call inputs, hex) | Create | T1 |
| `plans/elk-engine-skeleton/decisions.md` (appended section only), `CLAUDE.md` (one bullet), `docs/conformance.md` § 2 rule paragraph | Modify | T2 |
| `tools/vectors/LastUlpVectors.java`, `tools/vectors/last-ulp-vectors.sh` (new); `test/golden/refs/java/last-ulp.json` (new, by script) | Create | T3 |
| `test/golden/last-ulp-divergences.test.ts` (new); `docs/conformance.md` (entries table, the three #74 sentences, the 8a and 8b entries) | Create / Modify | T4 |
| `plans/roadmap.md` (appended section), `.agent-notes/last-ulp-bar.md` | Modify / Create | T5 |

No package, env var or database change.

## Quality gates

After T2-T4: `npm run typecheck`, `npx prettier --check <changed files>`, `npm run complexity` (read the report), and
`npx vitest run test/golden/last-ulp-divergences.test.ts src/alg/disco/DiscoVectors.test.ts test/architecture`. T5 runs
queue gates 1-7 ([T5](batch-3/T5-close-out.md)). Before a JVM run, check `uptime`, wait while it is above 12, and run
under `nice -n 10`. Start the full suite detached with `nohup ... ; echo "exit $?"` and poll for at most 9 minutes.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire are stop 3 (the recorder's oracle runs never
reproduce the sweep's HotSpot value for the radial entry) and stop 4 (an entry measures above 0.01 px).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Audit, inputs and measurement | T1 | — | [x] |
| [2](batch-2/overview.md) | Amendment text; mechanism vector (parallel) | T2, T3 | 1 | [x] |
| [3](batch-3/overview.md) | Pinning test and entries table; close-out and squash | T4, T5 | 2 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns T1, T4 and T5, every commit, every `gh` call, `plans/` and
`.agent-notes/`. T2 and T3 have disjoint write-sets and may run as two subagents (`claude`, sonnet), each prompted with
its task file and T1's audit rows; a headless session may run them one after another, T3 first. Commit after T1, T2, T3
and T4. T5 squashes.

**Time:** about 3 h. T1 60 min, T2 20 min and T3 60 min in parallel, T4 50 min, T5 50 min.

## Landing

1. Tag the tip `last-ulp-bar/pre-squash`.
2. `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>` with the message of T5 step 7.
   The footer is `Refs: #74`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md) (D0-D7 and the auto-confirmed record), [stop-conditions.md](stop-conditions.md),
  [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md).
- Entries at planning: `docs/conformance.md:2002-2008` (8a, `sloppy_overlaps_2`), `:2137-2142` (8b, `getOrthogonalPoints`),
  `:2163` (8b, `Math.log` on x86_64), `:231-298` (the 36 call sites), `:2475-2478` (TS sweep), `:201-207` (policy bullet), `:283-284` (call-site audit sentence).
- Evidence at planning: `plans/alg-force-disco/decision-journal.md:52` (the 491-input experiment; inputs not committed),
  `plans/alg-force-disco/decisions.md:76-84` (`Math.log`), `tools/vectors/ForceVectors.java:1670-1700` (the `Math.log`
  against `StrictMath.log` rows: the precedent for D4), the oracle sweep row
  `~/git/knowvah/elk-oracle/sweep/8bca22f4…-ac5af2ba…/results.jsonl` (`retarget/radial/default/…/sloppy_overlaps_2`,
  verdict `ok`, 3 ms: a warm JVM).

## Mission summary (2026-11-24)

Completed 2026-11-24: 5 of 5 tasks. No halt. One partial (AD-13, stops 5 and 6): the new ref carries no pin stamp, #173
(`needs-ruling`). No entry failed the bar, so no `needs-ruling` issue for an entry (D7, stop 4) and stop 3 did not fire.

- **Result.** AD-4 has its amendment; every documented last-ulp entry has a class, a recorded mechanism, a measured
  maximum positional delta and a pin. E1 (radial `sloppy_overlaps_2`) is `accepted` at 4.55e-13 px; E2 (disco
  `getOrthogonalPoints`) is inside 1e-6 at 8.53e-14 px; E3, E4 and E5 have no divergence
  ([decision-journal.md](decision-journal.md), T1 `audit`, T4 `gate`).
- **Landed.** `## AD-4 amendment (2026-11-13)` appended to `plans/elk-engine-skeleton/decisions.md`; the `CLAUDE.md` bullet;
  the rule, the entries table and the audit result in `docs/conformance.md`; `tools/vectors/last-ulp-inputs.txt`,
  `LastUlpVectors.java`, `last-ulp-vectors.sh`; the new ref `test/golden/refs/java/last-ulp.json`;
  `test/golden/last-ulp-divergences.test.ts` (19 tests); one row in `docs/architecture/elk-upgrade.md`; the roadmap
  revision; `.agent-notes/last-ulp-bar.md`. No file under `src/`, no existing ref, no landed test and no comparator
  changed.
- **Not as planned.**
  - T2 and T3 were done by the orchestrator, T3 before T2, not by two subagents.
  - `last-ulp.json` has no `oracle` field: the stamp through `elkCommit()` would make a landed fitness count 42 instead
    of 41 (T3 `STOP`, #173).
  - `docs/architecture/elk-upgrade.md` is outside the planned write-set: the runbook inventory test requires the row.
  - E1 has three divergent `sin` inputs, not one, and its delta is 4.55e-13, not "within 1e-13"; the call-site table has
    31 "none observed" rows, not 34.
  - The pinning test has a `cause` test per entry beyond D5: substituting HotSpot's recorded bits makes the port's
    output bit-identical to the oracle's.
  - HotSpot's `Math.sin` differs from `StrictMath` cold, warm, interpreted and compiled alike, so the cold-against-warm
    question of the planning note has the answer "no difference".
- **Decisions.** D0-D7 as planned; the header contract of T3 lost one field (above).
- **Gates.** Queue gates 1-7 green on the final tree (T5 `gate`): coverage 1,220 files, 50,664 tests passed,
  83 skipped, 98.81 / 97.01 / 98.57 / 98.86 (baseline 1,219 files, 50,645 passed: one file and 19 tests added); CodeQL
  with no new accepted entry; refs against the base untouched apart from the added `last-ulp.json`.
- **Issues.** #173 (`needs-ruling`, the stamp count), #174 (`follow-up`, stale TS lines and the 1e-13 note). The wording
  note on rule point 2 is in the report comment on #74.
