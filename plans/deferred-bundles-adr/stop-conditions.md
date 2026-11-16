<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: deferred-bundles-adr (auto-confirmed at planning, 2026-11-13)

Queue form. A stop that blocks part of the work: `gh issue create --label needs-ruling` naming the exact part, journal a
`ruling` row, finish the rest. A stop that blocks the whole mission: journal it, commit the work, end with the driver's halted
line. A write outside a task's write-set is not a stop; journal why.

1. **Outside the worktree.** Any write to `../elk`, `../elk-oracle` (beyond the queue's oracle scripts), `$ELK_MODELS_DIR`,
   `../dot-engine` or any other repository, `~/.claude`, or the main checkout → `needs-ruling`. dot-engine is read only.
2. **Scope creep into code.** The work seems to need a change under `src/`, `test/` (other than none), `tools/`,
   `test/architecture/bundle-deps.json`, or `tools/bundle-deps.ts` → stop that part (DB3, DB4); the ADR names it as follow-up.
3. **AD-13.** Any byte diff under `test/golden/refs/` or in a landed test → halt (this mission changes no test or ref).
4. **Unsupported verdict.** A bundle's recommendation that no evidence row in `evidence.md` supports, or evidence that splits
   evenly between options → write the ADR with that bundle's recommendation as "no recommendation: maintainer to choose",
   list the options and evidence, and say so in the `needs-ruling` issue. Do not guess.
5. **Locked decisions.** A recommendation that contradicts AD-1…AD-16 or CLAUDE.md (zero runtime dependencies,
   browser-safe `src/`, YAGNI, AD-14 frozen surface) is allowed **only** as a proposal that names the rule it would need
   amended; it never changes the rule here.
6. **Repeated failure.** The same gate fails twice in a row (a timeout under load does not count), or one location is
   edited three times in a row for the same check → halt that task with the diagnosis so far.
7. **Baseline red.** A queue gate fails at mission start on the untouched tree → journal the failing test names and halt as
   blocked; do not record a red baseline as known.

## Push-forward (decide and journal, do not stop)

- Wording and order inside the ADR and evidence file; the table layout; the issue title.
- Effort estimates, as long as the method (600-800 Java LOC per task, from the roadmap) is stated.
- Whether to use a read-only subagent for evidence gathering.
- Extra evidence rows beyond DB5, if they bear on a verdict.
- Re-running a gate that failed only on load or timeout. Known intermittent at planning: `ts-layout-shards.test.ts:173`
  (`childPids()` not empty) failed in 2 of 3 full coverage runs at load 30-47, passed alone every time (#87). If only that
  test fails, wait for a 1-minute load below 12 and rerun the gate once; journal both runs and cite #87. A second failure at
  low load is stop 6.
