<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-stress-cases: decisions

Standing decisions carried in: AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`), H13 (`plans/layered-compound/`),
G8 (label metrics append-only, `test/helpers/layout-test-labels.append-only.test.ts`), the reference platform of #52
(macOS arm64, JDK 21.0.1), and the maintainer ruling in the body of #58 (2026-11-13, option 1).

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended` on 2026-11-21. Each decision below names the rejected options and the evidence
so the maintainer can audit it.

### D1

**Where `elk.stress` is registered: in the shared layout-test runner.** `test/helpers/layout-test-runner.ts` gains
`registerTestAlgorithms()` (name free, push-forward), called next to `registerLayered()` in `realize`. It registers
`new ForceMetaDataProvider()` and `new StressMetaDataProvider()` once each, guarded by a probe the way
`registerLayered` (`test/helpers/layered-framework-replay.ts:167`) and `registerForce`
(`test/helpers/force-replay-dump.ts:67`) are.

- Evidence: in Java the runner's bundle registers the providers, not the suites.
  `org.eclipse.elk.alg.test/.../PlainJavaInitialization.java:42-53` registers every provider, `Force` and `Stress`
  included, for every runner suite. `org.eclipse.elk.alg.test` requires `alg.force`; `org.eclipse.elk.alg.layered.test`
  does not (both `META-INF/MANIFEST.MF`). `test/helpers/` is this port's `alg.test`.
- Force is registered with stress because stress's algorithm names the category `org.eclipse.elk.force`
  (`src/alg/force/options/StressOptions.ts:200`), and 8b's evidence (`plans/alg-force-disco/decision-journal.md`, row
  `T12 note`) ran with both registered. Both TS providers already apply their `*Options` (`ForceMetaDataProvider.ts:215`,
  `StressMetaDataProvider.ts:162`).
- Rejected: (a) registering inside the two suite files, which would put an `alg.force` import in an `alg.layered` test
  that the Java test bundle does not have. (b) Registering all ten providers of `PlainJavaInitialization`: no suite needs
  the other six, so that is new scope.
- Guard: re-registering a provider duplicates its algorithm in the category (#120), so the probe is required.

### D2

**The two suites list their sources inline, in the twin pattern of `Issue628Test.test.ts:20-24`**: the `compound/`
vendored path and the models-repository path, each with the Java filter. `test/helpers/stress-pending.ts` and its
test are deleted (ruling item 1). Nothing else imports them (grep at planning: only the two suites and the pin test).
Rejected: keeping `ISSUE665_GRAPHS`/`ISSUE700_GRAPHS`/`vendored()` in a renamed helper. They have no other caller.

### D3

**The `Issue700Test` non-vacuity counts move from 2 to 4, and `Issue665Test` loses its `it.skip` branch.** The 2 was
written as "the oracle runs minus the H13 cases" (`Issue700Test.test.ts:52`). The ruling sets done as "`Issue700Test` 4
of 4, as the oracle gives" (`plans/layered-compound/java-baseline.md:18`: runs 4). The new value is the oracle's, the
assertion gets stricter, and the ruling authorises it, so this is not an AD-13 loosening. The journal records it as a
ruling-authorised test change. `Issue665Test` gains a count test of 1 (the oracle's runs,
`java-baseline.md:17`) in the same form. Rejected: leaving the 2, which would fail once the hold-back goes, or
halting, which contradicts the ruling.

### D4

**The vendored-inputs inventory test gains a separate two-entry list.** `test/golden/algorithm-refs.test.ts:527`
asserts that the manifest holds exactly the listed inputs ("nothing else"). A new constant (for example
`STRESS_SUITE_INPUTS`) holds the two new paths and joins the expected union. The test title gains its count, and the
comment at `:478-484` no longer says the two are never vendored. `LAYERED_COMPOUND_INPUTS` stays the 31 inputs of
`LayeredCompoundVectors.java`: that recorder's `MODEL_TABLE` is explicit and does not walk `compound/`, so it reads
neither file, and on its classpath the two stay "out of scope (algorithm)". Ruling item 3 ("with their manifest rows")
authorises the inventory change. Rejected: adding them to `LAYERED_COMPOUND_INPUTS`, which would claim the recorder
reads them.

### D5

**Label metrics: append, record by script, then verify before installing.** Append the four texts, in the order the
ruling lists them (`insideOtherLayout`, `child1`, `child2`, `insideOtherDirection`), to the end of
`tools/vectors/layered-label-metrics-texts.txt`. Run `tools/vectors/layered-label-metrics-vectors.sh
"$TMPDIR/<scratch>"`. Install the output over the ref only if all of these hold:

- the scratch file differs from the ref only by a `,` after the old last entry and four new lines;
- the four values are exactly `[89.0, 11.77734375]`, `[29.0, 11.77734375]`, `[29.0, 11.77734375]`,
  `[101.0, 11.77734375]`;
- `"jdk": "21.0.1"`, and `uname -m` gives `arm64`.

Any other difference is stop 1. Note: the ruling says 2,258 existing entries. The table holds **2,317** at planning
(`9a92376d`, `13d02bd5` and `2cd3e876` appended). All 2,317 stay byte-identical, and the journal records the count
correction.

### D6

**Docs scope: every passage that states the hold-back as current.** That is `docs/conformance.md` (the 7h table rows
`:1693-1694`, `:1705`, the H13 bullet `:1707-1711`, `:1762`, and the 8b bullet `:2044-2046`) and
`docs/architecture/alg-layered-compound.md` (`:141`, `:311-318`, `:401`, `:408`). It also covers
`docs/architecture/alg-force-disco.md` (`:24`, `:311`), `docs/architecture/text-sizing-seam.md` (`:83-84`, `:93`),
and `docs/architecture/alg-packing.md:468`. Add one new row to `plans/layered-compound/decision-journal.md` (ruling
item 4; a new row, never an edit). The dated text-sizing-seam evidence in `conformance.md:2438-2452` is a record of
that mission and stays; append one sentence after it if it would otherwise read as current. Rejected: changing only
`conformance.md`. The architecture docs would then contradict it (#130 is the same class of stale text).

### D7

**Evidence beyond the suites' own run.** Run the oracle's JUnit counts for both classes with
`tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.issues.Issue665Test org.eclipse.elk.alg.layered.issues.Issue700Test`
(expected `runs=1 failures=0` and `runs=4 failures=0`). Run the TS suites in three modes: default (vendored),
`PIPELINE_SUITES_FULL=1` (models checkout), and `ELK_TEST_TEXT_MEASURER=fixed` (with `PIPELINE_SUITES_FULL=1`, as #41
T4 did). All three must give 1/1 and 4/4 passing. No oracle patch and no recorder change.

## Commit

### D8

Subject: `test(layered): run the three stress-dependent 7h cases`. Footer `Refs: #58`, no attribution lines (queue
rule). The body lists the ref append (4 keys, 2,317 old entries byte-identical), the two vendored files with their
sha256, the deleted hold-back, the D3 count change, and the D7 evidence.
