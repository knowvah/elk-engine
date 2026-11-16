<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: docs-publish-prep (auto-confirmed at planning, 2026-11-13)

Queue form. A stop that blocks part of the work: `gh issue create --label needs-ruling` naming the exact part, journal a
`ruling` row, finish the rest. A stop that blocks the whole mission: journal it, commit the work, end with the driver's halted
line. A write outside a task's write-set is not a stop by itself; journal why.

1. **Outside the worktree.** Any write to `../elk`, `../elk-oracle` (beyond `tools/oracle/` scripts), `$ELK_MODELS_DIR`,
   `../dot-engine`, `~/.claude`, the main checkout or another repository → `needs-ruling`. dot-engine is read only.
2. **Publishing.** Anything that would run `npm publish`, `npm login`, `semantic-release` without `--help`, push a tag,
   create a GitHub Release, or trigger `release.yml` → halt that part (DP7, DP9). `npm pack` and installing a local
   tarball into `$TMPDIR` are allowed.
3. **Surface acceptance.** A step that needs `src/index.ts` to export anything, or CLAUDE.md to change → stop that part;
   it belongs to the surface ruling (DP1, DP9).
4. **AD-13.** A landed test, vector or ref that can pass only by changing its expected value (`locale-complete.test.ts`
   nav/sidebar rows are the known case: DP6) → `needs-ruling` naming the rows; leave them; finish the rest. Any byte diff
   under `test/golden/refs/` other than the new `elk-examples/` set → halt.
5. **Examples without the oracle.** An example whose expected output cannot come from the oracle (the harness cannot lay
   out its twin, or the twin cannot express the example's graph) → drop that example and journal why; never assert
   values the oracle did not produce. If no example has an oracle ref, halt T3 with the diagnosis.
6. **Port divergence.** The TS output of an example or of the pack rehearsal differs from the oracle beyond 1e-6 →
   diagnosis mode (mechanism, origin, causal chain, ruled out). A landed-port defect is fixed only with that artifact;
   otherwise file `needs-ruling` and drop the example.
7. **Toolchain.** TypeDoc on TypeScript 6.0.3 reports compile errors on the candidate that TypeScript 7.0.2 does not →
   journal them; do not edit `src/` to satisfy TS 6; file `needs-ruling` with the errors and finish the rest without
   `docs:api` in `docs:build`.
8. **Repeated failure.** The same gate fails twice in a row (a timeout under load does not count), or one location is
   edited three times in a row for the same check → halt that task with the diagnosis so far.
9. **Baseline red.** A queue gate fails at mission start on the untouched tree → journal the failing test names and halt
   as blocked.

## Push-forward (decide and journal, do not stop)

- Wording, order and layout of `public-api.md`, the getting-started page, `PUBLISHING.md` and the workflow comments.
- Which exports fall in which tier, within DP2's rules; the exact list of open questions.
- The number of examples (two or three) and their graphs, as long as each has an oracle ref.
- The linkinator flags beyond DP5's, the workflow schedule (weekly), and how extra roots are passed.
- Fixing a broken external link in a file this mission owns; any other external finding goes to a `follow-up` issue.
- Re-running a gate that failed only on load. Known intermittent: `ts-layout-shards.test.ts` (`childPids()` not empty,
  #87). If only that fails, wait for a 1-minute load below 12 and rerun once; journal both runs, cite #87.
