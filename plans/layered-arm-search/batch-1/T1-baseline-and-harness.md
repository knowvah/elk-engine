<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: baseline run A and the shared search harness

## Context

The 25 arms were measured on `679df4b` (2026-11-10). Missions since then appended rows to the loops, compound and
order-adjacent refs (#55 and others), so some arms may already be taken: class E of the 7h map. Search only what is
still open. 7h's scratch tools (`$TMPDIR/7h/T12/`) are gone, so rebuild the measurement as a committed script.

## Steps

1. **`tools/arm-search/coverage.sh [<vitest test files>...]`.** Run `npx vitest run --coverage` with the v8 provider,
   `--coverage.reporter=json`, zero thresholds, and a scratch `reportsDirectory`. The include list is the 9 arm files
   of [arms.md](../arms.md). Then print, per arm of arms.md, its count from `coverage-final.json`, keyed as
   `compound-site-arms.mjs` keys arms (`armCount`). With no arguments, the test files are every `Layered*Vectors.test.ts`,
   `LayeredCompoundSites.test.ts`, `LayeredCompoundTwins.test.ts`, the two layered golden tests, and every
   `src/alg/layered/**/*Test.test.ts`. That is run A, B1 and B2 of the 7h map together: the arms any landed evidence
   takes.
2. Run it once. For each arm, record in [arms.md](../arms.md) whether it is taken (then outcome E, with the test that
   takes it, found by one per-file run) or untaken. An arm that is taken needs no search; the T8 section lists it as
   "taken by landed evidence since 7h". Confirm the line of every untaken arm against the source: the two Forster arms
   moved, see arms.md.
3. **`tools/arm-search/instrument.sh`** (D2). It copies the named Java sources out of the oracle worktree, compiles
   them with `javac` against the classpath of `layered-order-vectors.sh`, and prints the prepended classpath. Prove it
   with a no-op copy of `ModelOrderNodeComparator.java` plus one `System.err.println` at `:384`. Run one filtered order
   recorder build, or a single-file probe, with the printed classpath, and check that the line prints. Quote the
   output in the journal.
4. **`tools/arm-search/README.md`.** State the D3 outcome rule, the D2 rules (scratch only; the oracle is never
   changed), the scripts' usage, the TS screen (a scratch vitest config outside the repo that replays a pseudo-row
   through `runSteps`/`runOrderPrefix` or the compound site replay), and how to confirm a candidate on the oracle.
5. Record the timing of a cold `layered-order-vectors.sh` and `layered-compound-vectors.sh` run into scratch. The
   output goes to `$TMPDIR/layered-arm-search/baseline/`, and `cmp` with the committed refs must exit 0. This is the
   recorders' reproducibility baseline for T5 and T6.

## Write-set

`tools/arm-search/README.md`, `tools/arm-search/instrument.sh`, `tools/arm-search/coverage.sh`,
`plans/layered-arm-search/arms.md`, the journal.

## Read-set

`plans/layered-compound/unreached.md` § Measurement; `tools/vectors/compound-site-arms.mjs`;
`tools/vectors/layered-order-vectors.sh` (`build_classpath`); `tools/vectors/java-program.sh` (`jp_run`);
`test/helpers/layered-order-replay-*.ts`; `test/helpers/layered-phase-replay-ops.ts`.

## Acceptance criteria

- Given today's refs, when `coverage.sh` runs, then every arm of arms.md has a count, and the untaken set is
  journaled with its size.
- Given a copied Java source with one logging line, when `instrument.sh` runs and a probe uses the printed
  classpath, then the line appears on stderr, and `git -C ~/git/knowvah/elk-oracle status --porcelain` is empty.
- Given a cold run of the order and compound recorders into scratch, then both outputs are byte-equal to the committed
  refs.

## Observability

N/A (test tooling). The scripts print their scratch paths.

## Rollback

Reversible: new files only.
