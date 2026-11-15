<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: runbook draft and inventory fitness test

## Context

Roadmap row 13 asks for a written process for moving the ELK pin (AD-2). The pieces already exist but are spread across
`tools/oracle/README.md` (build, run, patches, reset), `docs/architecture/parity-dashboard.md` § 7 (sweep runbook),
`docs/conformance.md` (each set's "Regenerate" paragraph), the vector scripts' headers, and the "To row 13" bullets of
`plans/roadmap.md` revisions (lines 1650, 1741, 1795, 1888 at planning). T1 collects them into one ordered procedure.

## Task

1. Write `docs/architecture/elk-upgrade.md` (SPDX header). Required sections, in order:
   1. **When and who.** The real move is the maintainer's decision (it regenerates refs, AD-13). The rehearsal mode
      (UP2-UP3) can be run by anyone.
   2. **Preconditions.** Load ≤ 12; Maven 3.9.x (`ELK_MVN`); JDK 21.0.1 on macOS arm64, the reference platform (memory
      `jvm-reference-platform`, #52); disk; the shared oracle stamp.
   3. **Choose the target and triage the net diff.** Use `git -C $ELK_SOURCE_DIR log --oneline <pin>..<new>` and
      `git diff --stat <pin> <new> -- plugins/ test/ build/`. Classify each changed path as an in-scope bundle (CLAUDE.md
      source map), deferred bundle (a revisit trigger of `docs/architecture/deferred-bundles-adr.md`), out-of-scope,
      build (Tycho or Maven version, check `MAVEN_SERIES` in `build.sh`), test bundle (ported JUnit to update), or prose
      (the carve-out: an "upstream typos" entry may close). Fetching upstream is the maintainer's step.
   4. **Patch series.** `git am --3way` at the new commit. A patch merged upstream is dropped, and a conflicting patch is
      rebased. Both are maintainer decisions (AD-3), with the patch id journaled.
   5. **Bump and rebuild.** Edit `tools/oracle/ELK_COMMIT`, run `git worktree remove` on the old oracle, run `build.sh`,
      and check `oracle-build.json`. Note the #85 staleness-filter quirk from `.agent-notes/text-sizing-seam.md`.
   6. **Metadata (`.melk`) diff.** Run `metadata-vectors.sh`, `npm run melk:generate` followed by `git diff src/`, and
      `test/melk/sources.test.ts`.
   7. **JVM vectors.** Every `tools/vectors/*-vectors.sh`, with its arguments, output ref and a cost column (filled by T5
      from T3's timings). Include `label-sizing-vectors.sh --remeasure-awt` and the TX1 re-proof (no plugin measures
      text, `docs/architecture/text-sizing-seam.md`). Cache note: the salt includes `oracle-build.json`, so every
      recorder runs cold.
   8. **Goldens.** Every `tools/oracle/regen-*.sh` and every `regen-goldens.sh --set` value (default, algorithms,
      layered, trees, force-disco, packing, examples).
   9. **Sweeps.** Link to `parity-dashboard.md` § 7 for the corpus sweep and the TS sweep, then list every other
      `tools/oracle/*sweep*.sh` with its consumer test and the `*_SWEEP_DIR` variable it feeds.
   10. **Ported Java suites.** `tools/oracle/java-tests.sh` (and `PIPELINE_SUITES_FULL=1` where the conformance notes
       say so).
   11. **Triage the diff (UP6).** Normalize the stamp, then sort changes into stamp-only, content or tool-side. Content
       diffs get diagnosis mode against both oracles. "Port Java diffs" happens here, and only on a real move.
   12. **Repo-wide checks.** Run the `Math.*` fitness test (`test/architecture/math-call-sites.fitness.test.ts`: a new
       call site fails until it is listed, see #74). Run `npm run docs:build` and compare the typedoc warning count with
       200, run `examples.test.ts` after `--set examples`, and run both `npm run pack:smoke` modes. Then run the queue
       gates.
   13. **Close-out on a real move.** Journal the regenerated refs with their patch ids. Update the AD-2 pin text, which
       needs a maintainer ruling because AD rows are locked, plus CLAUDE.md's pin line and the conformance entries the
       move closes.
   14. **Rehearsal mode.** Clone, scratch Maven repository and scratch oracle (UP2, UP3), the `~/.m2` marker check, and
       cleanup (UP9).
2. Link the runbook from `tools/oracle/README.md` with one line under a new `## Upgrading ELK` heading. Links from
   site-included pages are optional (UP4); if added, `docs:build` and `docs:linkcheck` must pass.
3. Write `test/docs/elk-upgrade-runbook.test.ts` (UP5), red first: write it before the runbook's script list exists, and
   see it fail on the missing names.

## Write-set

`docs/architecture/elk-upgrade.md` (create), `test/docs/elk-upgrade-runbook.test.ts` (create), `tools/oracle/README.md`
(modify: one heading and link). Optional: one link line in `docs/architecture/overview.md` or `docs/conformance.md` (UP4).

## Read-set

`tools/oracle/README.md`; `tools/oracle/build.sh:1-60`; `docs/architecture/parity-dashboard.md:131-160`;
`plans/roadmap.md:197-203` and the "To row 13" bullets (`grep -n "row 13" plans/roadmap.md`); the header comment of each
`tools/vectors/*-vectors.sh` and `tools/oracle/*.sh` (usage lines only); `docs/conformance.md` "Regenerate" paragraphs
(`grep -n "Regenerate" docs/conformance.md`); `test/docs/examples.test.ts` (test style); `decisions.md#up2` through
`#up9`.

## Interface contracts

Output for T2-T5: the runbook's section anchors. T3 and T4 follow sections 3-12 in order and journal any command that
fails as written. Use a script-inventory format the UP5 test can parse, for example one table row per script with the
script path in a code span.

## Acceptance criteria

- Given the runbook, when the UP5 test runs, then it passes, and it fails if one `*-vectors.sh` name is removed from the
  doc (shown once by a temporary edit, journaled).
- Given a script path in the runbook that does not exist, when the UP5 test runs, then it fails naming the path.
- Given the four "To row 13" bullets, when the runbook is read, then each has a step that names its command.
- Given the queue worktree, when `npm run docs:build` and `npm run docs:linkcheck` run, then both exit 0.

## Quality bar

Prettier-formatted Markdown (lines ≤ 120, as the other docs). Commands are copyable, with no placeholder that is not
defined above it. The test asserts specific missing names, not merely truthy values.

## Observability requirements

N/A — documentation and a test; no new observable operations.

## Rollback notes

Reversible: a revert removes a doc, a test and one README line.
