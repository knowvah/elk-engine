<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: sweeps, ported Java suites, repo-wide checks

## Context

Runbook sections 9, 10 and 12. These are the fast oracle comparisons (the corpus sweep takes about 2 min; the TS sweep
under a minute) plus the per-phase sweeps, `java-tests.sh`, and the "To row 13" checks. They can run while T3's recorders
do, within the load rule.

## Task

In the clone, with `. "$R/env.sh"`:

1. Corpus (section 9, `parity-dashboard.md` § 7): run the oracle sweep, the TS sweep, `parity-report.ts` (not `--write`
   into the clone's committed report unless the runbook says so; journal), and the staleness check. Journal the counts
   next to the shared oracle's last recorded counts in `docs/parity-report.md` or `docs-site/parity.md`. Any verdict
   change goes to stop condition 5.
2. Every other `tools/oracle/*sweep*.sh`: run it against the scratch oracle, then its consumer test with the
   `*_SWEEP_DIR` variable pointed at the scratch output. Journal the indicator line of each (for example
   `elkj sweep: …=n/total`).
3. Ported Java suites (section 10): run `tools/oracle/java-tests.sh` against the scratch oracle (`P2_BUNDLES` and `M2_REPO`
   from `env.sh`), and `PIPELINE_SUITES_FULL=1` where the conformance notes require it. Journal the per-class results
   next to the last results on the pinned oracle.
4. Repo-wide checks (section 12): run `npx vitest run test/architecture/math-call-sites.fitness.test.ts`; run
   `npm run docs:build` and journal the typedoc warning count against 200; run
   `regen-goldens.sh --set examples` (if T3 has not already) followed by `npx vitest run test/docs/examples.test.ts`;
   and run `npm run pack:smoke` and `npm run pack:smoke -- --entry test/public-api/candidate-index.ts`.
5. Afterwards: `ps` shows no `ts-layout-worker` and no rehearsal JVM. Journal the oracle, JDK and Node versions.

## Write-set

In the scratch area: `$R/oracle/sweep/**`, `$R/oracle/census/**`, `$R/oracle/vector-cache/**`, and the clone's
`docs-site` build output and `dist/`. In the queue worktree: `plans/elk-upgrade-runbook/decision-journal.md` only.

## Read-set

`docs/architecture/elk-upgrade.md` §§ 9, 10, 12; `docs/architecture/parity-dashboard.md:131-160`;
`tools/oracle/java-tests.sh:1-30`; `docs/conformance.md` "Regenerate" paragraphs for the sweep sets;
`stop-conditions.md` items 5 and 7.

## Interface contracts

Input: `$R/env.sh` and the scratch oracle (T2). Output for T5: journal rows with one line per sweep, suite and check
(command, exit code, indicator, comparison with the pinned oracle), each classified as `same`, `stamp-only` or `diff`.

## Acceptance criteria

- Given the scratch oracle, when the corpus sweep, TS sweep and report run, then exit codes and counts are journaled, and
  any change from the pinned counts is classified.
- Given every `*sweep*.sh`, when each and its consumer test run, then each has a journaled indicator line, or a reason it
  cannot run.
- Given `java-tests.sh`, when it runs against `b715fb10`, then the per-class pass and fail counts are journaled next to
  the pinned run.
- Given the four repo-wide checks, when they run, then each has a journaled exit code (and the warning count for typedoc).

## Quality bar

Comparisons against the pinned oracle use numbers measured in this mission, or ones quoted with their source row; never
remembered ones.

## Observability requirements

N/A — journal rows only.

## Rollback notes

Reversible: scratch only, deleted by UP9.
