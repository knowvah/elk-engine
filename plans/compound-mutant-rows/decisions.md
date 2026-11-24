<!-- SPDX-License-Identifier: EPL-2.0 -->

# compound-mutant-rows: decisions

Carried in unchanged: AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`), the arm keying of
`plans/layered-compound/unreached.md` § Measurement, the reference platform (macOS arm64, JDK 21.0.1), and the
maintainer ruling on #156 (2026-11-23, "Extend by the 10 ids above").

## Auto-confirmed (unattended)

`/plan-mission --unattended next --branch chore/issue-queue` planned this on 2026-11-23 at base `e30d1c5c`. Each
decision gives the options it rejected and the evidence, so the maintainer can audit it.

### D1: the twins list may take this issue's ids (the #156 ruling, applied to #60)

**Decision.** `DIFFERING_ROWS['post crossHierarchyMap.keySet() (:89)']` in
`src/alg/layered/LayeredCompoundTwins.test.ts:126-146` is extended by the ids of this mission's new rows whose reversed
replay differs. This is option 1 of the question on #60.

- Evidence:
  - The parking comment on #60 (2026-11-23T21:22Z) asked exactly this question. It called it "the same question as
    #156 option 1, for the same list", and ended: "When #156 is ruled, replace `needs-ruling` with `queue:ready` to
    queue this issue again."
  - The maintainer ruled #156 option 1 at 21:46:34Z. They removed `needs-ruling` from #60 and added `queue:ready` at
    21:46:58Z, 24 seconds later (issue timeline).
  - The list is an inventory: its comment (`:127-129`) gives the mechanism, and 7h extended it for its own `sites` rows
    (`:138`). The twin loop (`:286-293`) still checks four conditions for each listed row: the Java-order replay equals
    the oracle, the reversed replay differs, both runs export the same layout, and the size is under the treeification
    bound.
- Guard rails:
  - The extension is its own task commit (T2 step 6), with one journal row naming every added id. The ready comment on
    #60 says so, so the maintainer can veto it before the branch merges.
  - An id is added only when its reversed replay differs **and** the four per-row checks pass. A row that fails any
    check is a stop (stop 2 or 4), not a list entry.
  - **No other pinned list may change.** If any other test needs a new expected value (an id list, a count, a first
    row), that is stop 4: a partial with a `needs-ruling` issue.
- Rejected:
  - (a) Park again. The maintainer has already done what the parking comment asked.
  - (b) Option 2, landing only the rows the list does not select. That throws away 11 of 13 graphs, contradicts the
    #156 ruling on the same list, and repeats #59's withheld patch.

### D2: rows go into the existing recorder and ref, and every existing row stays byte-identical

- New `sites` rows: a new constant array `EVIDENCE_ROWS` (same shape as `SITE_ROWS`: id, mode, inline ELK JSON) in
  `tools/vectors/LayeredCompoundVectors.java`. `siteSpecs` iterates it **last**, after the two `hierarchicalPort*`
  rows. New `models` rows: a new `evidenceModelSpecs(out)` called after the last existing models spec, through
  `modelSpec`'s inline-input form (`:2688`).
- The ref is `test/golden/refs/java/layered-compound.json`. "Byte-identical" means **every existing row**
  byte-identical and in its order. The D5 id-keyed diff proves it. Only appended rows and `rowCounts` change. This is
  how #55 (`plans/layered-loops-evidence/decisions.md` D3) and #59 read the same constraint, and queue gate 7 allows a
  ref the brief names.
- Why the replays need no new code (except D4): `LayeredCompoundSites.test.ts`, `LayeredCompoundVectors.test.ts` and
  the twins test replay every row of each group. `CompoundGraphPreprocessor.test.ts:15` uses `.find`, so its row does
  not change as long as new models rows come after the existing ones. `rowCounts` is checked against the file
  (`compoundRowCountsDifference`), not pinned.
- Why a new array and not the end of `SITE_ROWS`: #156's withheld patch (`plans/layered-arm-search/withheld/record-rows.patch`)
  appends its four rows at the end of `SITE_ROWS`. A separate array keeps the two edits in different hunks. Its expected
  SHA-256 will not hold after this mission; T6 says so on #156.
- Headroom: 12,237,513 bytes against the 16 MiB cap (`LayeredCompoundVectors.java:322`). About 15 rows of about 30 KB
  each fit easily.
- Rejected:
  - (a) A new ref file, as `tree-recorder-gaps` did. There the counts were pinned. Here they are not, and a new file
    means a new loader path through more than 20 compound test files.
  - (b) A separate recorder. It would duplicate the 3,678-line recorder (#143).

### D3: the two `models` rows (I3, I6) use the existing stop machinery, unchanged

- I3 (D15) is a `models` row because the thickness is a property of the dummy edge, gone after the postprocessor. A
  models run records **every** stop; all stops of the run land, and the row that kills D15 is stop 0.
- I6 records the run of a root without `INCLUDE_CHILDREN`. On that run `StopRecorder` also sees the root's flat P3
  sweep (`stopProcessor`, `:2258-2263`: `IHierarchyAwareLayoutProcessor && isRoot`). T3 records the run as the
  existing code does, then checks the stop list against the header's definition ("The stops are exactly", items 1-4).
- If the stop list matches the header and the TS replay (`runToStop`) replays every stop, the rows land.
- If it needs **any** change to `StopRecorder`, `stopProcessor`, the dump, or `runToStop`'s stop matching, that is a
  change to the stop contract. Stop 1: I6 becomes a partial with a `needs-ruling` issue, and the mission goes on.
- Fallback before stop 1: a `sites` run row of the same graph. Its tree is the last stop (after the postprocessor).
  If the shifted dummy positions survive there (T3 checks this on both the oracle and the port), it kills the R group
  with no stop-contract question. T3 tries this first because it is cheaper. It takes the models row only if the
  sites tree does not show the difference.
- Rejected: changing `StopRecorder` to drop the flat stop. That is a dump-contract change, and the maintainer decides
  those.

### D4: K9 gets a `worked` site mode, as the issue asks

- The issue names it: "needs a recorder aid that logs monitor work, not a graph".
- Recorder: in `runSiteLayout`, mode `worked` runs the engine under `WorkRecorder extends BasicProgressMonitor`. It
  overrides the protected `doBegin(String name, float newTotalWork, boolean topInstance, int maxHierarchyLevels)`
  (Java `BasicProgressMonitor.java:237`). It also overrides `doSubTask(float work, int maxHierarchyLevels)` (`:363`),
  which returns a `WorkRecorder` child so that sub-monitors are recorded too. It records `expected.work`: one
  `{task, work}` entry per `begin`, depth first in creation order. The Java work is a `float`. It is recorded as a JSON
  number only when it is integral (the counts of processors that `ElkLayered` passes), and any other value throws
  `Bug`. Everything else is recorded as in mode `run`.
- TS replay: `test/helpers/layered-compound-replay-sites.ts` gains a `worked` arm. When `expected.work` is present, it
  replays as a run row under a TS subclass of the ported `BasicProgressMonitor`, which overrides the protected
  `doBegin` (`src/core/util/BasicProgressMonitor.ts:162`) and `doSubTask` (`:254`), and compares `work` exactly. `isSiteRunRow` still classifies the row, so the kind check at
  `LayeredCompoundSites.test.ts:46-51` holds without edit.
- T4 checks the exact override signatures against the pinned Java and the TS port before writing. If the TS port has
  no override point that matches the Java's, that is stop 1 (a production `src/` change).
- Rejected: logging monitor work for every row. That re-records every row (stop 3).

### D5: mutants are rebuilt, run in a scratch copy, and never applied in the worktree

- Each mutant is one token at the arm its graph targets ([items.md](items.md)), marked *reconstructed*. They are run in
  a scratch copy (`git worktree add --detach $TMPDIR/compound-mutant-rows/wt <sha>`) or with the copy-and-restore
  harness of `tree-recorder-gaps` T1 (`.agent-notes/tree-recorder-gaps.md`). After each run, `git diff --quiet -- src/`
  holds in the queue worktree (stop 10). 7h's in-place `sed -i` incident (journal T15, `:178`) is the reason.
- A mutant is **killed** when one of these fails: `LayeredCompoundVectors.test.ts`, `LayeredCompoundSites.test.ts`,
  `LayeredCompoundTwins.test.ts`, or the class tests of the mutated file. It **survives** at base when all of them pass.

### D6: one outcome per item

1. **recorded**: the new row lands, replays at the AD-4 bar, and kills the item's mutants (D5 run against the new
   ref).
2. **equivalent**: a written argument that no input can tell the mutant apart, journaled (as 7h did for G1, D41).
3. **diverging**: the row replays differently in TS than on the oracle. Diagnosis artifact, `follow-up` issue, row
   kept out of the ref (stop 2).
4. **unkilled**: the row lands but the mutant still survives, or no row could be built within the item's 40 min
   budget. Give the closest approach.
5. **already killed**: T1 finds the mutant killed at base. No row is needed.

### D7: I8 (R1…R12) is conditional

The 7h journal (T15, `:174`, `:178`) says the class tests already kill this group. T1 rebuilds the group's mutants
and runs D5. If all are killed, I8 is outcome 5 and gets no row. If one survives, T2 adds one non-square-port `run`
row (budget 30 min).

### D8: execution is sequential, and the orchestrator owns the ref

T2, T3 and T4 all write the recorder, the ref and (T2, T3) the twins list, so they run one after another. The
orchestrator may give the I5 search (graph tuning in TS, no file writes outside `$TMPDIR`) to one background subagent
while T2 records I1-I4. That is the only parallel step. Recorder runs take about 11 s cold
(`docs/architecture/elk-upgrade.md:284`), so they run in the foreground after an `uptime` check.
