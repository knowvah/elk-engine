<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent rules — alg-packing (read first; written by the orchestrator at mission start, 2026-11-13)

You are a subagent of mission 8c (`plans/alg-packing/`), working in the worktree `/Users/scottseely/git/knowvah/elk-engine-queue`
on branch `chore/issue-queue`. You start blank: read, in this order, the repository's `CLAUDE.md` (binding), this file, your task
file, and the sections of `plans/alg-packing/decisions.md` your task file names. Where they disagree: these rules, then `CLAUDE.md`,
then the task file.

## What the project is

A faithful TypeScript port of Eclipse ELK. The Java at `../elk` (pinned `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`) is the spec.
The oracle is ELK built from that source at `../elk-oracle` (`oracle-build.json` names the commit and patches `0001`, `0002`; it is
current, do not rebuild). Port every branch, keep method boundaries and side-effect order, keep Java names, one class per file at
the Java path (`src/alg/<bundle>/...`), `/** @see <bundle>/src/<path>.java */` on every ported symbol, SPDX header
`// SPDX-License-Identifier: EPL-2.0` (`#` for sh, `<!-- -->` for md) on line 1 of every file.

Paths: `R` = `../elk/plugins/org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking`, `S` = the same for `alg.spore`,
`P` = for `alg.topdownpacking`; tests `RT` = `../elk/test/org.eclipse.elk.alg.rectpacking.test/src/org/eclipse/elk/alg/rectpacking`,
`ST` = `../elk/test/org.eclipse.elk.alg.spore.test/src/org/eclipse/elk/alg/spore/test`,
`PT` = `../elk/test/org.eclipse.elk.alg.topdown.test/src/org/eclipse/elk/alg/topdown`. Generated Java option classes exist only
under `../elk-oracle/plugins/<bundle>/src-gen/`. Corpus: `../../eclipse-elk/elk-models` (read only). Env vars `ELK_SOURCE_DIR`,
`ELK_ORACLE_DIR`, `ELK_MODELS_DIR` are unset; the defaults above apply.

## Where you may write

- Inside the worktree, and scratch under `$TMPDIR/alg-packing/<task>/`. `../elk-oracle` only through the scripts in `tools/oracle/`
  and `tools/vectors/` (the vector cache).
- Never: `../elk`, `../elk-end-label-*`, `../../eclipse-elk/elk-models`, `~/.claude`, the main checkout `../elk-engine`, any other
  repository. If the work needs such a write, stop that part and report it.
- Your task's write-set is the plan. If the work needs another file in the worktree, change it and name the file and the reason in
  your report. Never edit: `tools/vectors/{vector-cache.sh,JavaVectors.java}`, a landed recorder or sweep script,
  `tools/oracle/{run.sh,java-tests.sh}`, `test/corpus/{manifest,variants}.json`, any landed file under `test/golden/refs/`, the
  landed replay helpers, or anything under `plans/` (report what the journal should say instead).
- Never read or copy OpenJDK or Guava source (AD-9). A JDK behaviour is settled by the Javadoc or by a JVM vector.

## Git

Never commit, push, stash, rebase, reset, checkout or switch branches; the orchestrator commits. Leave your files in the working
tree. Other agents write other files in this same tree at the same time: touch only your files, and do not "fix" files you did
not create unless your task needs it. Do not run `prettier --write .`, `npm run format` or any repo-wide rewrite; format only
your own files (`npx prettier --write <files>`).

## Tests are immutable (AD-13)

Expected values come from the oracle, JVM vectors or the Java source, before the implementation. A landed test, vector or golden
that can pass only by changing its expected value is a STOP for that part: leave it red, do not loosen a tolerance, delete a case
or regenerate a landed ref; report the rows. Refs are generated only by script. No hand-derived numeric expectation.

## Diagnosis

On any discrepancy (failing test, oracle mismatch): find the mechanism before any fix. Default stance: "my port differs: find
where", by instrumenting the oracle (a scratch recorder under `$TMPDIR`, never an edit of `../elk`) and dumping actual values. A
fix needs: mechanism, origin `file:line`, causal chain, what was ruled out and by which evidence. If you cannot state the
mechanism, report what you ruled out and what you would instrument next; do not ship a guess. Do not edit one location three times
for the same failing check: stop and report.

## Limits and hooks

- A hook blocks `Write`/`Edit` of TS files over 500 lines, functions over 30 NLOC, CCN over 10, or more than 5 parameters. Write to
  the limits from the start; split at Java boundaries (helpers named after the Java method, sections behind the class), never by
  dropping branches. `npm run complexity` is the gate (plain `lizard` skips functions; never trust its exit code). lizard misparses
  `<` directly after `:` in an object literal or ternary: use a named temporary.
- Browser-safe `src/`: no Node built-ins, no `process.env`, ES modules, zero runtime dependencies, no module-level mutable `let`.
- YAGNI: no API, option or pattern the Java lacks. No cross-algorithm import the Java lacks (`test/architecture`).
- Translation rules: `CLAUDE.md` table and `docs/translation-rules.md` (int arithmetic through `src/java/lang/Int32`, `(int)` casts
  through `d2i`, `Double.compare` shim, hashed containers per AD-10, `assert` sites as comments naming the Java line, a computed Java
  array size checks for a negative size, auto-unboxing of a possibly unset property through `src/java/lang/Unbox.ts`).
- Notes that bite: a dump or replay helper reads `getAllProperties()`, never `getProperty`, for options with cloneable defaults
  (`ElkPadding`, `ElkMargin`): `getProperty` stores a copy on the element and changes the run. Whole-ref test loops carry
  `{ timeout: 60_000 }`. Every golden input names `elk.algorithm`. Exported option keys depend on the registered provider set.
  Recorders run under `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2`.

## Runs

- Foreground only; nothing may still run when you return. Before a JVM run check `uptime`; if the 1-minute load is above 12, wait
  (sleep 30 and recheck) and run under `nice -n 10`.
- Run your own tests (`npx vitest run <files>`), `npm run typecheck`, `npx prettier --check <your files>`, `npm run complexity` and
  `npx vitest run test/architecture`. Never run `npm run coverage` or the whole `npm test` (the orchestrator runs them alone); a
  scoped coverage run of your own files is fine (`npx vitest run <files> --coverage --coverage.include='<glob>'`).
- Typecheck may show errors in files other agents are writing at the same moment; report them, fix only your own.

## Report (your final message; it is all the orchestrator sees)

No preamble, no trailing summary. In this order: (1) `DONE` or `PARTIAL` or `BLOCKED` with one line why; (2) files written, one per
line; (3) the commands you ran with their final counts (tests passed, rows recorded, sizes, `cmp` results); (4) every decision a
reasonable developer might have made differently, one line each, with the Java `file:line`; (5) every discrepancy with its
diagnosis artifact; (6) anything left for a later task or for the maintainer (questions, defects in landed code, upstream defects);
(7) observations worth a note in `.agent-notes/` (unexpected behaviour only). State only what a tool result showed.
