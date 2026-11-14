<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent rules: text-sizing-seam (read these first)

You are a subagent of mission row 10 (`plans/text-sizing-seam/`). You work in the worktree
`/Users/scottseely/git/knowvah/elk-engine-queue` on the branch `chore/issue-queue`. You start with no context. Read, in this
order: the repository's `CLAUDE.md` (binding), this file, your task file, and the rows of `plans/text-sizing-seam/decisions.md`
that your task file names. If they disagree, these rules win, then `CLAUDE.md`, then the task file.

## What the project is

elk-engine is a faithful TypeScript port of Eclipse ELK. The Java at `../elk` (pinned
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76`) is the specification. The oracle is ELK built from that source at `../elk-oracle`,
plus `tools/oracle/patches/`. This mission adds patch `0003`, which makes the JUnit test framework's label-text measurement
pluggable (`TestConfiguration` → `TextMeasurer`, property `org.eclipse.elk.alg.test.textMeasurer`: `awt` by default,
`fixed` = `[length × 6, 12]`). It also adds the TS twin in `test/helpers/`. T1 has already rebuilt the oracle; do not
rebuild it. Every file starts with an SPDX header: `// SPDX-License-Identifier: EPL-2.0` (`#` for sh, `<!-- -->` for md).

## Where you may write

- Inside the worktree, and scratch under `$TMPDIR/text-sizing-seam/<task>/`. Write to `../elk-oracle` only through the
  scripts in `tools/oracle/` and `tools/vectors/`.
- Never write to `../elk`, `../elk-end-label-*`, `../../eclipse-elk/elk-models`, `~/.claude`, the main checkout
  `../elk-engine`, or any other repository. If the work needs such a write, stop that part and report it.
- Your task's write-set is the plan. If you need another file, write it and name it, with the reason, in your report. Never
  edit `tools/oracle/patches/`, any landed file under `test/golden/refs/` (only T2 adds `java/label-sizing.json`, and only
  through its script), a landed test's expected value, or anything under `plans/` (report what the journal should say).
- Never read or copy OpenJDK source (AD-9). Use the JDK API as documented, as `LayeredLabelMetricsVectors.java` does.

## Git

Never commit, push, stash, rebase, reset, check out or switch branches; the orchestrator commits. Touch only your own files.
Format only your files (`npx prettier --write <files>`).

## Tests are immutable (AD-13)

A landed test that can pass only if its expected value changes is a STOP for that part. Leave it red and report it. Expected
values come from the oracle's output (T2's ref), never from the TS result. The FX8 snapshot `layered-label-metrics.json` is
frozen: never re-record, extend or edit it (#52 ruling).

## Diagnosis

On any discrepancy, find the mechanism before any fix. Default stance: "my port differs: find where". Instrument the oracle (a
scratch program under `$TMPDIR`, never an edit of `../elk` or `../elk-oracle`) and dump the actual values. A fix needs a
mechanism, an origin `file:line`, the causal chain, and what was ruled out with which evidence.

## Limits and runs

- A hook blocks `Write`/`Edit` of a TS file over 500 lines, a function over 30 NLOC, CCN over 10, or more than 5 parameters.
  `test/helpers/layout-test-runner.ts` has 445 lines: keep your change to it small.
- `test/` and `tools/` may use Node built-ins; `src/` may not. No new dependency.
- Run in the foreground only; nothing may still be running when you return. Before a JVM run, check `uptime`; if the 1-minute
  load is above 12, wait (sleep 30, check again), and run under `nice -n 10`. Check `ps` afterwards for leftover vitest, tsx
  or java children.
- Run your own tests (`npx vitest run <files>`), `npm run typecheck`, `npx prettier --check <your files>`,
  `npm run complexity` and `npx vitest run test/architecture`. Never run `npm run coverage` or the whole `npm test`.

## Report (your final message; it is all the orchestrator sees)

No preamble, no trailing summary. In this order:

1. `DONE`, `PARTIAL` or `BLOCKED`, with one line saying why.
2. The files you wrote, one per line.
3. The commands you ran, with their final counts.
4. Every decision a reasonable developer might have made differently, one line each.
5. Every discrepancy, with its diagnosis artifact.
6. Anything left for a later task or for the maintainer.
7. Observations worth a note in `.agent-notes/` (unexpected behaviour only).

State only what a tool result showed.
