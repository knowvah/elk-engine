<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: runbook § 10 and the Java-baseline paragraphs

## Context

Seven architecture pages tell a reader to make a scratch copy of `java-tests.sh`, and the runbook's section 10 runs
only two bundles. See [D4](../decisions.md#d4-the-class-list-includes-the-xtend-suites-143-at-planning-not-124) (the
commands) and [D6](../decisions.md#d6-docs-scope) (the paragraphs).

## Read-set

- `docs/architecture/elk-upgrade.md:143-150` (§ 5 step 1) and `:457-483` (§ 10)
- `docs/architecture/alg-trees.md:336-346`, `alg-force-disco.md:354-364`, `alg-packing.md:517-523`,
  `alg-layered-pipeline.md:125-133`, `alg-layered-compound.md:385-390`, `text-sizing-seam.md:74-82`
- T1's journal rows (measured totals and wall time)

## Write-set

The seven files above (those line ranges only, plus a line or two either side if a sentence wraps),
`plans/java-tests-bundles/decision-journal.md`.

## Steps

1. § 10: replace the three commands with D4's two, verbatim. Say the script carries every test bundle a TS test cites
   (the fitness test keeps it so), give "143 classes, <runs> runs, about <n> minutes at the `8bca22f4` pin" from T1,
   and drop the "32 ported classes … scratch copy" sentence. Keep the `diff "$B/java-tests.txt" …` comparison and the
   TS half unchanged. Note once that an old-oracle file recorded with the previous two-bundle commands has only the
   layered rows, so the other 43 rows show as additions the first time.
2. § 5 step 1: "the three commands of section 10" → "the commands of section 10".
3. Each Java-baseline paragraph: replace "lists only the layered and `alg.test` bundles. Use a scratch copy …" and the
   `sed` recipe with a direct `MODELS_REPO=$ELK_MODELS_DIR nice -n 10 bash tools/oracle/java-tests.sh <classes>` call;
   keep its expected counts and its link to the mission's `java-baseline.md` as history ("the recipe of the mission",
   not "the recipe").
4. `npx prettier --check` on the seven files; `npx vitest run test/docs/elk-upgrade-runbook.test.ts`.
   `grep -n 'scratch copy' docs/architecture/*.md` lists none of the replaced sentences (other uses of "scratch" stay).
5. Journal a `note` row with the changed line ranges; commit.

## Acceptance criteria

- Given § 10, when a reader runs its commands on the pinned oracle, then they are exactly T1's after-run commands.
- Given `grep -n 'TEST_BUNDLES\|scratch copy of' docs/architecture/*.md`, then no page tells a reader to copy the
  script for a run.
- Given `test/docs/elk-upgrade-runbook.test.ts` and prettier, then both pass.
- Given `git diff <base> -- plans/ ':!plans/java-tests-bundles' docs/conformance.md`, then it is empty.

## Observability

N/A: documentation.

## Rollback

Reversible: revert the commit.
