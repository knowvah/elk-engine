<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent rules: ts-parity-dashboard (read these first)

You are a subagent of mission row 9 (`plans/ts-parity-dashboard/`). You work in the worktree
`/Users/scottseely/git/knowvah/elk-engine-queue` on the branch `chore/issue-queue`. You start with no context. Read, in this
order: the repository's `CLAUDE.md` (binding), this file, your task file, and the rows of `plans/ts-parity-dashboard/decisions.md`
that your task file names. If they disagree, these rules win, then `CLAUDE.md`, then the task file.

## What the project is

elk-engine is a faithful TypeScript port of Eclipse ELK. The Java at `../elk` (pinned `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)
is the specification. The oracle is ELK built from that source at `../elk-oracle`. Its `oracle-build.json` names the commit and
patches `0001` and `0002`; it is current, so do not rebuild it. This mission ports no ELK class. It builds tooling under
`tools/corpus/`, tests for that tooling under `test/corpus/` and `test/architecture/`, and documents. Every file starts with an
SPDX header: `// SPDX-License-Identifier: EPL-2.0` (`#` for sh, `<!-- -->` for md).

## Where you may write

- Inside the worktree, and scratch under `$TMPDIR/ts-parity-dashboard/<task>/`. Write to `../elk-oracle` only through the
  scripts in `tools/oracle/`.
- Never write to `../elk`, `../elk-end-label-*`, `../../eclipse-elk/elk-models`, `~/.claude`, the main checkout `../elk-engine`,
  or any other repository. If the work needs such a write, stop that part and report it.
- Your task's write-set is the plan. If you need another file, change it and name it and the reason in your report. Never edit
  `tools/oracle/{run.sh,sweep.sh}`, `tools/corpus/sweep.ts`, `test/corpus/{manifest,variants,census}.json`, anything under
  `test/golden/refs/`, or anything under `plans/` (report what the journal should say instead).
- Never read or copy OpenJDK source (AD-9).

## Git

Never commit, push, stash, rebase, reset, check out or switch branches; the orchestrator commits. Other agents write other files
in this same tree at the same time, so touch only your own files. Format only your files (`npx prettier --write <files>`), never
the whole repository.

## Tests are immutable (AD-13)

A landed test that can pass only if its expected value changes is a STOP for that part. Leave it red and report it. Expected
values for comparisons come from the oracle output, never from the TS result.

## Diagnosis

On any discrepancy, find the mechanism before any fix. Default stance: "my port differs: find where". Instrument the oracle (a
scratch harness under `$TMPDIR`, never an edit of `../elk`) and dump the actual values. A fix needs a mechanism, an origin
`file:line`, the causal chain, and what was ruled out with which evidence. If you cannot state the mechanism, report what you
ruled out and what you would instrument next.

## Limits and hooks

- A hook blocks `Write`/`Edit` of a TS file over 500 lines, a function over 30 NLOC, CCN over 10, or more than 5 parameters.
  `tools/corpus/ts-layout-compare.ts` is already 503 lines: split it before you add anything. `npm run complexity` is the gate.
- `tools/` may use Node built-ins; `src/` may not. No new dependency.
- Process children: every child you fork must be killed or exited before you return. Afterwards, check `ps` for tsx or
  vitest processes whose working directory is the worktree. A probe of an input that may never return runs as
  `timeout <s> npx tsx …`.

## Runs

- Run in the foreground only; nothing may still be running when you return. Before a JVM run, check `uptime`; if the 1-minute
  load is above 12, wait (sleep 30, check again), and run under `nice -n 10`.
- Run your own tests (`npx vitest run <files>`), `npm run typecheck`, `npx prettier --check <your files>`,
  `npm run complexity` and `npx vitest run test/architecture`. Never run `npm run coverage` or the whole `npm test`. A
  coverage run scoped to your own files is fine.

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
