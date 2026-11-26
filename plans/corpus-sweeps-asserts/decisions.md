<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: corpus-sweeps-asserts (issue #116)

Locked for this mission. AD-1…AD-17 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules win over this file.

## D1. Scope: the thirteen vitest corpus sweeps, at the current tip

The sweeps are the files `test/corpus/*-sweep.test.ts` that lay out or parse corpus models:

- the nine layered family sweeps: `labels`, `loops`, `phase`, `pipeline`, `compound`, `order`, `placement`, `routing`,
  plus `label-sizing`;
- the four format sweeps: `json`, `elkj`, `elkt`, `dot-export`.

`test/corpus/sweep.test.ts` runs too, but it is the unit test of the sweep planner and lays nothing out, so it is not
evidence (#127 T6).

Mission `dev-assert-restore` (#127, T6, journal of 2026-11-20 23:04-23:24) already ran the ten layered sweeps at stride 1
with assertions on, and all were green after the #32 wrap. This mission reruns them because the tip has changed
since then: `fb4b906a` changed six self-loop assert arms, the graphviz-dot port landed with the `dot-export` sweep,
and the sweep results were re-recorded on 2026-11-24. It also runs the four format sweeps, which #127 left out.

**Not in scope:**

- `tools/corpus/ts-layout-compare.ts` and the non-layered algorithms. That is #137.
- The five sites that are still comments (`Not a devAssert yet`): #4 and #5 (`BoxLayoutProvider`, knowvah/elk#27), #114
  (`SingleEdgeGraphWrapper`, knowvah/elk#28), and `ThresholdStrategy.java:395` and `:403` (#128). They cannot fire.
  #116's "rerun after those rulings" was done by #127 for the ten sites it restored. These five wait on the fork and
  on #128, and this mission does not make them live.
- Narrowing the #32 end-label rule (#138), and the cache key (#139).

**Rejected:** treating #127's run as enough and closing #116 on paper. The tree has changed since that run, the four
format sweeps were never run with assertions on, and D3 shows a hole in how that run was read.

## D2. Assertions on, by the suite's default; stride 1 everywhere

The sweeps run under vitest with `test/setup/dev-assertions.ts` (assertions on unless `ELK_DEV_ASSERTIONS=off`).
Every sweep that has a stride variable gets `<NAME>_SWEEP_STRIDE=1`: `labels`, `loops`, `phase`, `pipeline`, `compound`,
`order`, `placement` and `routing`. The other five have no stride variable and run every case. A sweep that reports
`skipped` is not evidence (D5).

## D3. Collect `AssertionError`s from verdicts and from the throw pairs

There are two ways a firing assert can show up:

- **As a failure.** On an `ok` case the verdict reads `UNEXPECTED THROW AssertionError: …`. On a `throws` case of the
  sweeps that compare classes (`labels`, `phase`, `pipeline`, `order`, `placement`, `routing`) it reads
  `oracle threw X, port threw AssertionError`.
- **Hidden.** `loops` and `compound` match a `throws` case on presence alone (`throwsVerdict`, `loops-sweep.test.ts:92-103`,
  `compound-sweep.test.ts:88-99`). An `AssertionError` there, where the oracle threw something else, passes. Only
  the `throw-pairs:` summary shows it, as `X(frame)->AssertionError`. #127's journal gives no throw pairs, so its 76
  `loops` and 5 `compound` throws matches are unread for this purpose.

Read both. Write every `throw-pairs:` line into the journal verbatim. Run with `<NAME>_SWEEP_REPORT=<file>` where the
sweep supports it (`labels`, `loops`, `pipeline`, `compound`).

**Site.** A verdict carries a class and a message, and `devAssert`'s message is usually empty. To get the site (the first
`src/` frame under `src/java/lang/DevAssert.ts`), replay each `AssertionError` case through its family helper in a
**temporary probe test** under `test/corpus/`, as #127 T6 did. Run it with
`NODE_OPTIONS=--stack-trace-limit=300` (`.agent-notes/dev-assert-restore.md`). The probe is never committed: delete it
before the T3 gates.

**Rejected:** a committed site-census tool or a change to the sweeps' verdicts. That would be a new API with one caller,
and changing a sweep's pass rule is a test change under AD-13. If the presence-only rule should become a class rule,
file a `follow-up`.

## D4. Triage per dev-assert D7

Apply diagnosis mode to each firing site (mechanism, origin, causal chain, ruled out). Then run the same case on the
oracle with assertions on: `JAVA_TOOL_OPTIONS=-ea:org.eclipse.elk...`, through the family's `tools/oracle/*-sweep.sh`
`--dump` for the case (the #112 evidence used `loops-sweep.sh --dump`), or through `tools/oracle/run.sh` for a plain
input. Check `uptime` first, and use `nice -n 10`. Then:

- **Java throws the same `AssertionError` at the same line.** The site is Java-faithful. Put the site back to a comment
  that names a new `needs-ruling` issue. Use the same wording and form as the five existing `Not a devAssert yet`
  comments, as #45's stop 4 and the `ThresholdStrategy` fix did. The issue follows #112's form (rows, minimal input,
  Java stack, what was checked). If the site is one of #127's ten ruled sites, give it the same treatment: #127 stop
  4.
- **Java does not throw.** It is a port defect. Instrument the oracle and the port, and find where the state first
  differs. Fix it at the mechanism if the fix stays inside the site's directory and changes no expected value. Add a
  test whose expected value comes from the oracle or the Java source, written red first. Otherwise put the site back to a
  comment naming a `follow-up` issue that carries the whole diagnosis artifact.
- **The same site fires on many cases.** Triage one representative case per distinct Java stack. Journal the full list
  of case ids.

No sweep case is wrapped in `withAssertions(false, …)`. Wrapping is a test change, and the AD-13 approval for it covered
only #127's named rows.

## D5. Sweep data: use what is recorded, refresh only through its script

At planning, every sweep's oracle data was present:

- `test/corpus/.{compound,labels,loops,order,phase,pipeline,placement,routing}-sweep/results.jsonl`, all of 2026-11-24.
- `test/corpus/.json-sweep/` (2026-11-18).
- `$ELK_ORACLE_DIR/sweep/{label-sizing,dot-export,elkj-8bca22f4…-ac5af2ba…,elkt-8bca22f4…-ac5af2ba…}`.

Patch 0004 changes only `alg.spore`, which no sweep in D1 lays out, so none of this data is stale by #139. If a sweep
skips because its stamp is stale or its directory is missing, rerun only that sweep's `tools/oracle/*-sweep.sh`
(detached, `nice -n 10`), journal it, and rerun the sweep. A recorder run that changes a committed ref is stop 2.

## D6. One commit on the queue branch; the issue stays open

The mission squashes onto the base with `Refs: #116` and keeps the per-task history under the tag
`corpus-sweeps-asserts/pre-squash`. If nothing fires, the commit holds only `plans/`, the roadmap and `.agent-notes/`:
`docs(plans): run the corpus sweeps with assertions on`. If a site changes, use `fix(<scope>): …` or `test(corpus): …`
as fits. The squash commit closes nothing; the issue closes when the branch merges. T3 comments on #116 with the
per-sweep results.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
| -------- | ------ | -------- | -------- |
| D1 scope | 13 vitest sweeps at the tip | Close #116 on #127's run; also run `ts-layout-compare` | #127 journal rows 22-24 (format sweeps not run; tree changed since); #137 owns the workers |
| D3 collection | Verdicts + `throw-pairs:` + uncommitted probe | Committed census tool; class-compare change in `loops`/`compound` | `loops-sweep.test.ts:92-103` and `compound-sweep.test.ts` `throwsVerdict` match on presence; #127 journal lists no throw pairs |
| D4 triage | dev-assert D7 (`-ea` oracle check), comment + issue for Java-faithful | Wrap firing cases with assertions off | `plans/dev-assert/decisions.md` D7; #112 maintainer fix for `ThresholdStrategy`; #113 ruling limits wrap approval to its rows |
| D5 data | Recorded sweep data, script refresh only on skip | Re-record every sweep first | `oracle-build.json` = pin + 0001-0004; 0004 touches `alg.spore` only (#139) |

No change is Irreversible. The mission changes no published API, data contract, ref, vector, golden, oracle patch or
`ELK_COMMIT`.
