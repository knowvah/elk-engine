<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformance: what "match" means

@knowvah/elk-engine is validated against upstream Eclipse ELK (Java) built from
source. A TypeScript layout is **conformant** with the oracle when, after both
are parsed as ELK JSON, the structure and every non-numeric value are exactly
equal and every finite number agrees within an absolute tolerance of `1e-6`.
The comparator is [`test/golden/compare-json.ts`](../test/golden/compare-json.ts);
this document describes what it implements. Port rules live in
[`docs/translation-rules.md`](translation-rules.md).

| #   | Section                                           | Answers                                  |
| --- | ------------------------------------------------- | ---------------------------------------- |
| 1   | [Oracle](#1-oracle)                               | What is "correct", and at which commit?  |
| 1a  | [Conformance unit](#1a-conformance-unit)          | What is one case, and which cases exist? |
| 2   | [Conformance bar](#2-conformance-bar)             | What counts as equal?                    |
| 3   | [Goldens and corpus](#3-goldens-and-corpus)       | Where do reference outputs come from?    |
| 4   | [Seam patches](#4-seam-patches)                   | How do we change the oracle?             |
| 5   | [Oracle operations](#5-oracle-operations-runbook) | What do I do when it breaks?             |
| 6   | [Gates](#6-gates)                                 | What must pass before a change lands?    |
| 7   | [ELK Text](#elk-text-elkt)                        | How is `.elkt` proven?                   |
| 8   | [ELK Textual JSON](#elk-textual-json-elkj)        | How is `.elkj` proven?                   |
| -   | [Core layouts](#core-layouts-fixed-box-random)    | How are `fixed`, `box`, `random` proven? |
| -   | [alg.common](#alg-common)                         | How is `alg.common` part a proven?       |
| -   | [alg.common nodespacing](#alg-common-nodespacing) | How is `alg.common` part b proven?       |
| -   | [Temporary gaps](#temporary-gaps)                 | What differs from the Java for now?      |

## 1. Oracle

The oracle (AD-3) is upstream ELK **built from source** in a detached git
worktree of `$ELK_SOURCE_DIR`, created at `$ELK_ORACLE_DIR` by
`tools/oracle/build.sh`. Both are outside this repository; neither is vendored.

| Item              | Where                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| Pinned ELK commit | `tools/oracle/ELK_COMMIT` (currently `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)     |
| Patch series      | `tools/oracle/patches/*.patch`, applied in lexical order with `git am --3way`        |
| Build             | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho downloads p2 artifacts)         |
| Batch runner      | `tools/oracle/run.sh <outDir> <input>...` or `run.sh --cases <cases.jsonl> <outDir>` |
| Harness           | `tools/oracle/harness/ElkOracle.java`                                                |
| Build manifest    | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patches, JDK, jar per bundle)           |

**Build.** `build.sh` runs `mvn -P elk-meta clean install -DskipTests` (the melk
compiler) and then `mvn clean install -DskipTests -Dmaven.test.skip=true` from
`build/` in the worktree, then records the jar of each in-scope bundle
(`core`, `graph`, `graph.json`, `alg.common`, and the `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`,
`vertiflex` algorithms) in `oracle-build.json`. An existing worktree is reused
only if it descends from `ELK_COMMIT`, carries exactly the patch subjects in
`tools/oracle/patches/`, and is clean apart from build output; otherwise
`build.sh` exits `2` and leaves it untouched.

**Run.** `run.sh` compiles `ElkOracle.java` against the bundle jars plus the
third-party bundles (Gson, Guava, EMF, Xtext/Xtend libs) from the Tycho p2
cache (`P2_BUNDLES`, default `~/.m2/repository/p2/osgi/bundle`; the newest
version of each is used). One JVM lays out every input with
`RecursiveGraphLayoutEngine` and writes `<outDir>/<input basename>.json`
with layout, zero dimensions, and zero positions included and unknown layout
options omitted. A failing input prints `ERROR <input>: <message>`; the
JVM exits `1` if any input failed. Input basenames must be unique within one
run, since the output name is the basename.

**Patch series semantics.** The series holds one patch today:

| Patch                                                                   | Effect                                                                                                                                                                                                                              | Paired TS seam                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` resolves id collisions with `"_g" + Random.nextInt(1000000)`; the patch seeds that `Random` from the system property `org.eclipse.elk.graph.json.exportSeed` (unset = ELK behavior). `run.sh` passes `EXPORT_SEED=1` | Optional `random` parameter of the `JsonExporter` constructor (J4, [elk-json.md](architecture/elk-json.md#exporter-random)); tests pass `new Random(1)` (the TS `Random` shim reproduces the stream: seed 1 gives 548985, 764588) |

Patches exist only to add narrowly scoped seams that make JVM and JS behavior comparable;
each is paired with a TS-side seam (section 4).

**Why not elkjs?** elkjs is ELK compiled by GWT. It cannot carry our patch
series, and GWT emulation of the JRE differs from the JVM we are porting from.
It is not consulted as an oracle.

## 1a. Conformance unit

A **case** is `(algorithm, model, variant)` (D1). The parity dashboard has one row per
layout algorithm; the elk-models folder and census features are filters, not rows.

**Case id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, for example
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` is the algorithm id
without `org.eclipse.elk.`. For generated models `modelId` is `generated/<name>`.

**Model id and source (D3).** The model id is the path in elk-models without the extension.
A case reads the `.json` when one exists, else the `.elkt`; `.elkg` (EMF XMI) is never read.

**Variants (D6).** Named option overlays in `test/corpus/variants.json`, applied at the root:
`default` (none), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algorithm                                     | Models                         | Variants              |
| ------------ | --------------------------------------------- | ------------------------------ | --------------------- |
| native       | the model's own `rootAlgorithm`               | every census model             | all seven             |
| retarget     | every listed algorithm except the model's own | every census model             | `default` only (OR-1) |
| generated    | the algorithm named by the file prefix        | `test/corpus/generated/*.json` | all seven             |
| ported JUnit | per algorithm mission                         | upstream JUnit cases (AD-13)   | as ported             |

`tools/oracle/run.sh --list-algorithms` is the list of algorithm ids (14 today).

**Retarget (D2).** The harness sets `org.eclipse.elk.algorithm` on **every node that has
children**, replacing any declared value, and `org.eclipse.elk.randomSeed = 1` on the root. ELK
resolves the algorithm per node, and an unset node falls back to layered. A root without
children gets only the seed. The retarget tier skips each model's own `rootAlgorithm` (the
native tier covers it).

## 2. Conformance bar

AD-4, exactly as `compareLayout(expected, actual, { tol })` implements it:

| Rule                      | Behavior                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerance                 | Absolute, `DEFAULT_TOLERANCE = 1e-6`; finite numbers pass when `abs(e - a) <= tol`                                                                                            |
| Non-finite numbers        | `NaN` and `±Infinity` must be exactly equal (`Object.is` or `===`), even with `tol: Infinity`                                                                                 |
| Strings, booleans, `null` | Strictly equal, else `value`                                                                                                                                                  |
| Kind mismatch             | Different JSON kinds (`null`, array, object, number, string, boolean) give one `type` diff                                                                                    |
| Object keys               | Key set must be identical: a key only in expected is `missing`, only in actual is `extra`                                                                                     |
| Arrays                    | Matched **by `id`** when every element on both sides is an object with a string `id` and ids are unique per side (an empty array counts as keyed); otherwise **positionally** |
| Keyed arrays              | An id on one side only is a `structure` diff at `path[id=<id>]`; order is ignored                                                                                             |
| Positional arrays         | A length difference is one `structure` diff and elements are not compared further                                                                                             |
| Diff kinds                | `structure`, `value`, `type`, `missing`, `extra`; `path` is JSON-path-like (`children[id=n1].x`)                                                                              |

Consequences: element ids, element counts, edge-section topology, and
bend-point counts are exact because ids and array lengths are exact;
coordinates and sizes get `1e-6`. `formatDiffs` prints at most 20 diffs.

**Known-divergences policy.** A divergence is never absorbed by raising `tol`
or editing a golden (AD-13). Each one is recorded here with its cause and the
test or fixture it affects. Accepted classes:

- **ulp-level `Math.*` differences.** V8 and the JVM may differ in the last bit
  of `sin`, `cos`, `exp`, `log`, `pow` and friends; Java's `StrictMath` is
  specified bit-exact, `Math` is not. The case already hit: `nextGaussian`
  is specified to use `StrictMath.log`, so `src/java/util/Random.ts` carries a
  `StrictMath.log`-exact implementation instead of `Math.log`. Prefer a
  bit-exact port of the `StrictMath` algorithm over widening tolerance.
- **Identity-hash iteration (AD-10).** Iterating a `HashMap`/`HashSet` keyed by
  identity-hashed objects is non-deterministic in Java itself. Journal the site
  and port with insertion order; goldens must not depend on it. Value-hashed
  keys (String, Integer) must reproduce Java order.
- **Upstream typos in human-readable text.** A defect in ELK's own prose (a
  description, label, or message string nothing branches on) is corrected
  proactively rather than reproduced, with a comment at the site naming the
  upstream text. Each case is listed here; the ported test asserts the
  corrected string. Behaviour, identifiers, and oracle-compared values are
  never in this class (policy set 2026-10-12, `CLAUDE.md` carve-out).
  - `GraphFeature.COMPOUND` description: upstream concatenates
    `"...hierarchy levels" + "and are..."` with no space ("levelsand");
    the port reads "levels and". Decided 2026-10-12 on PR 3; fix proposed
    upstream as [eclipse-elk/elk#1202](https://github.com/eclipse-elk/elk/pull/1202).
- **Time-seeded `Random`.** With `randomSeed = 0` ELK seeds from the clock
  (`core/Core.melk:608`), so output is not reproducible. Golden inputs must
  leave the seed unset or non-zero (layered default seed is `1`).

Concrete entries (add one only with the user's approval):

| #   | Divergence               | Cause                                                                       | Scope                                                                                                                                                 | Approved             |
| --- | ------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | Parse-error message text | ANTLR messages are artifacts of the generated parser, which is never ported | Invalid grammar input (`.elkt`, `.elkj`, `.elkr`): only the _presence_ of a parse failure must match, not the message. Valid input must match exactly | D8, user, 2026-10-11 |

**Verdicts.** Each case gets one verdict from two separate JVM runs of the oracle (D4, D5, OR-2):

| Verdict            | Meaning                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ok`               | Both runs laid out the model and the output files are byte-identical                                                                                         |
| `throws`           | Both runs threw the same exception: exact class, and exact message after `@[0-9a-f]+` becomes `@<hash>` (the message may be null, e.g. `StackOverflowError`) |
| `nondeterministic` | The runs disagree (output bytes, exception, or one `ok` and one `throws`)                                                                                    |
| `oracle-error`     | Harness fault (unreadable input, unknown variant/algorithm/option, lost result line); never acceptable                                                       |
| `timeout`          | A run exceeded `ELK_SWEEP_TIMEOUT_MS`                                                                                                                        |

Precedence: `oracle-error`, then `timeout`, then `ok`/`throws` when equal, else
`nondeterministic`. Before the byte comparison, every `@[0-9a-f]+` token in both outputs is
replaced by `@<hash>`, as in exception messages (D5a; `sameOutput` in `tools/corpus/sweep.ts`).
Cause: disco's programmatic `debug.discoGraph` option exports `...DCGraph@<identity hash>`,
which no seed can pin. The TS comparator applies the same replacement. Nondeterministic cases
are reported separately and excluded from pass counts, in line with the identity-hash policy above.

Genuine remaining sources of `nondeterministic` (ELK behavior, not harness faults; counts are in
the parity report): spore (`ElkGraphImporter.java:169` jitters with `Math.random`) and `random`
(default `randomSeed` 0 is unseeded on nested composites; retarget seeds only the root, D2,
kept by user decision). The exporter's `_g<random>` id renames are not a source: the seam
patch fixes them.

## 3. Goldens and corpus

AD-5. Reference outputs are committed so CI needs no JVM.

| Item             | Where                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Pinned corpus    | `eclipse-elk/elk-models` at the `commit` in `test/corpus/manifest.json` (not vendored)          |
| Models directory | `$ELK_MODELS_DIR`, default `../../eclipse-elk/elk-models` relative to this repo                 |
| Curated set      | `golden[]` in `test/corpus/manifest.json`: `{ id, path, note }`                                 |
| Refs             | `test/golden/refs/elk/<id>.json`, one per manifest `id`                                         |
| Provenance       | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Id to path mapping.** `golden[].path` is relative to `$ELK_MODELS_DIR`, and
the input is `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` runs the harness on
those inputs and stages each `<basename>.json` output as `refs/elk/<id>.json`.
Example: id `ptolemy-scrambler` is
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regeneration** (`tools/oracle/regen-goldens.sh`):

1. Requires the models clone to be at exactly the manifest commit (else exit `1`).
2. Requires a built oracle (`run.sh` needs `oracle-build.json`).
3. Stages all refs and `_meta.json` in `test/golden/refs/.elk-staging.*`, then
   swaps the directory in two renames, so a failed run leaves the old refs.
4. `_meta.json` has no timestamps (`builtAt` stays in `oracle-build.json`), so a
   regeneration with no inputs changed is a byte-for-byte no-op in git.

**When to regenerate:** after changing `ELK_COMMIT`, the patch series, the
manifest `golden[]` set or `commit`, or the harness. Never otherwise.

**Journaling rule.** Every regeneration that changes a ref is journaled with the
cause (the patch id, or the commit bump). Refs are never hand-edited. If a TS
assertion or golden can only pass by being changed, stop and journal (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` lays out nothing: it runs the oracle in parse mode
over every model and compares the result with the committed `test/corpus/census.json` (898
models: id, formats, source, root algorithm, feature counts). Exit `0` when equal, `1` on drift;
`--write` rewrites the file. It runs only in the pinned models clone and aborts on a harness
fault.

**Generated corpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` holds a seeded
grandom config; its sibling `.json` is the oracle-generated, unlaid-out input. Nine configs cover
the algorithm ids no elk-models model uses: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Each has at most 50 nodes and
no edge labels (`BlindTextGenerator` is unseeded). The harness names the generated root `root`,
because ELK's `JsonExporter` resolves an id collision with an unseeded random suffix. Regenerate
only with `tools/oracle/regen-generated.sh` (staging directory and rename; a failing config
leaves the old files); a rerun with nothing changed is a git no-op. The TS grandom port must
reproduce these `.json` files byte for byte; algorithm goldens never depend on it.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` plans every case, runs each twice in separate JVMs (shards default
to `min(cpus, 8)` concurrent `run.sh` processes), and writes
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` prints case counts per tier and runs nothing; `--filter` keeps case ids containing
the substring; `--limit` takes an even-stride sample. Exit `0` unless a case is `oracle-error`
(`1`); a tool failure exits `2`. Per-case outputs stay local (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(default `30000`, read only by `tools/`) bounds each case; `run.sh` restarts a JVM after a
timeout (JVM exit code 75) on the cases without a result line.

**Parity report (D9).** `docs/parity-report.md` is generated from the sweep cache and committed:
counts per algorithm and verdict, with the ELK and models commits and no timestamps. Regenerate
with `npx tsx tools/corpus/parity-report.ts --write`; without `--write` the command exits `1`
when the committed report is stale. Never edit it by hand.

**Corpus tests.** `resolveModelsDir()` in `test/corpus/corpus.ts` returns a
`skip` reason when the clone is missing or at another commit; tests that need
it skip with the pinned sha in the message. Today `test/golden/oracle-refs.test.ts`
checks the committed refs only: one per manifest id, geometry on every node,
port, label, and edge, self-comparison, and that `_meta.json` matches
`ELK_COMMIT`, the manifest, and the generator. There is no TS-vs-oracle layout
test yet; it arrives with the first ported algorithm.

## 4. Seam patches

Seam patches change the oracle; they are rare and always paired with a TS seam.

1. Edit and commit in the oracle worktree (`$ELK_ORACLE_DIR`), or author the patch in a scratch
   clone at `ELK_COMMIT`. To add a finished patch to the existing worktree in place (keeps the
   `census/` and `sweep/` caches, which removing the worktree deletes), apply it with
   `build.sh`'s identity:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` then verifies the series and rebuilds in place (about 3 minutes), so steps 4-5
   can be skipped.
2. Export:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (or only the new commits). Files are named `NNNN-<slug>.patch`; the numeric
   prefix fixes the apply order.
3. Add the matching TS seam (same behavior, injectable, in `src/`), with tests
   whose expected values come from the patched oracle (AD-13).
4. Otherwise remove the worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (add `--force` if build output makes it dirty).
5. Rebuild: `tools/oracle/build.sh` (re-applies the series from scratch).
6. Regenerate: `tools/oracle/regen-goldens.sh`; review `git diff test/golden/refs`.
7. Journal an entry naming the patch (`NNNN-<slug>.patch`) and listing every
   ref that changed. `_meta.json` `patches` records the series automatically.

Never leave an uncommitted edit in the worktree: `build.sh` treats it as stale
(exit `2`). Never edit `ELK_SOURCE_DIR` itself.

## 5. Oracle operations (runbook)

| Failure                                                                             | Detection                                                                                                                                                                                                                                                               | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho build fails (p2 unreachable, JDK, Maven version)                              | `tools/oracle/build.sh` exits non-zero; full Maven output in `.oracle-build.log` at the repo root. Exit `1` is a missing tool or wrong Maven; exit `3` means a bundle jar was not produced                                                                              | Maven must be **3.9.x**: Tycho 4.0.12 fails on Maven 3.10 (Homebrew's 3.10.0) with `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. A local 3.9.11 lives at `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Use JDK 21, or JDK 17 via `JAVA_HOME`. Check network (first run downloads p2 artifacts), then rerun. `build.sh --record-only` skips Maven and only rewrites `oracle-build.json` from jars already built. Exit `2`: remove the worktree (section 4 step 4) and rebuild. Otherwise escalate with the log tail |
| `build.sh` exits `2` right after applying a patch                                   | Worktree reported stale                                                                                                                                                                                                                                                 | `build.sh` unfolds wrapped patch subjects (`git format-patch` folds those over about 78 chars) and ignores the untracked `census/` and `sweep/` caches; other dirt or an unlisted patch still gives exit `2`: fix the worktree (section 4)                                                                                                                                                                                                                                                                                                                                                                                    |
| Golden drift after a patch or commit bump                                           | `tools/oracle/regen-goldens.sh` followed by `git diff --exit-code test/golden/refs` is non-empty; `test/golden/oracle-refs.test.ts` fails on a stale `_meta.json` (`elkCommit`, `modelsCommit`); a TS conformance test, once present, fails with a `formatDiffs` report | Rebuild (`build.sh`), run `regen-goldens.sh`, review the diff, journal the patch id. Never hand-edit a ref or loosen `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Xtext/ANTLR jar missing from the p2 cache (`.elkt`, `.elkr`, or any `run.sh` start) | `run.sh` exits non-zero with `bundle <name> not in p2 cache <dir>` (e.g. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                           | Set `P2_BUNDLES` to the Tycho p2 cache that holds it, or run `build.sh` with network access so Tycho fetches it; rerun `run.sh`. Do not substitute jars from elsewhere                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Sweep hang or OOM                                                                   | A case runs to the timeout and reports `timeout` (a stderr line names it); a run with no result line gives `oracle-error` and `sweep: shard <n> run <A or B> exited <code>` on stderr; the machine swaps under 8 concurrent JVMs                                        | Lower concurrency and batch size: `sweep.sh --shards 2`, narrow with `--filter` or `--limit`. Raise `ELK_SWEEP_TIMEOUT_MS` only for a model that is slow but correct. A reproducible `timeout` is a finding: journal the case id, do not widen the limit to hide it                                                                                                                                                                                                                                                                                                                                                           |
| Census drift after a pin bump (`ELK_COMMIT` or models `commit`)                     | `npx tsx tools/corpus/census.ts` exits `1` and lists the differing models; `test/corpus/census.test.ts` fails                                                                                                                                                           | Confirm the clone and oracle are at the new pins, rerun `census.ts --write`, review `git diff test/corpus/census.json`, journal the cause, then rerun `sweep.sh` and regenerate the parity report. Never hand-edit the census                                                                                                                                                                                                                                                                                                                                                                                                 |
| elk-models missing or wrong sha                                                     | Corpus tests skip with a message naming the expected sha; `regen-goldens.sh` exits `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                   | Run `test/corpus/fetch.sh` (clones and checks out the pinned commit). It exits `2` if an existing clone is at another commit and does not touch it: fix that clone yourself or point `ELK_MODELS_DIR` at a fresh path. Never move an existing clone's HEAD from a script                                                                                                                                                                                                                                                                                                                                                      |

Other `run.sh` failures: `oracle-build.json missing` or `oracle jar missing`
means run `build.sh` first; `bundle <name> not in p2 cache` means set
`P2_BUNDLES` to the Tycho p2 cache or rerun `build.sh` with network access.

## 6. Gates

Every change:

| Gate               | Command                                                   | Bar                                                                          |
| ------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Types              | `npm run typecheck`                                       | exit 0                                                                       |
| Tests and coverage | `npm run coverage`                                        | all tests pass; 90% statements, branches, functions, and lines over `src/**` |
| Architecture       | `test/architecture/*.fitness.test.ts` (run by `npm test`) | module boundaries, module globals, no Node builtins in `src/`, SPDX headers  |
| Oracle refs        | `test/golden/oracle-refs.test.ts`                         | committed refs consistent with manifest and `ELK_COMMIT`                     |

Changes to `tools/oracle/`, the manifest, or the patch series also need:

| Gate             | Command                                                                       | Bar                                                               |
| ---------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Oracle build     | `tools/oracle/build.sh`                                                       | exit 0                                                            |
| Oracle run       | `tools/oracle/run.sh <outDir> <input.json>...`                                | exit 0, no `ERROR` lines                                          |
| Golden stability | `tools/oracle/regen-goldens.sh`, then `git diff --exit-code test/golden/refs` | no diff, unless the change is meant to move refs and is journaled |
| Shell            | `shellcheck tools/oracle/*.sh`                                                | clean                                                             |

Changes to `tools/oracle/` or `tools/corpus/` also need:

| Gate                | Command                                                                              | Bar                                                          |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Census              | `npx tsx tools/corpus/census.ts`                                                     | exit 0 (no drift)                                            |
| Generated stability | `tools/oracle/regen-generated.sh`, then `git diff --exit-code test/corpus/generated` | no diff                                                      |
| Sweep               | `tools/oracle/sweep.sh` (or `--filter`/`--limit` for a sample)                       | exit 0: no `oracle-error`                                    |
| Parity report       | `npx tsx tools/corpus/parity-report.ts`                                              | exit 0 (committed report current); regenerate with `--write` |

## 7. ELK Text (`.elkt`) {#elk-text-elkt}

Port: `src/graph/text` over `src/xtext` (internal entry point `ElkGraphText`: `load`, `validate`,
`serialize`; design and runbook in [elk-text.md](architecture/elk-text.md)). Evidence is two-tier (G7):
the committed JVM vectors and 31 curated refs (inputs vendored in `test/corpus/elkt-curated/`) run in
CI, and the sweep below measures the whole corpus locally, because elk-models is not vendored.

**What is compared.** Every `.elkt` model under `$ELK_MODELS_DIR` (898) and every realworld `.json`
model (550), each with the oracle's output at the pinned ELK commit, every case in two separate JVM runs
compared byte for byte (a differing case would be `nondeterministic` and excluded; none occurred):

- `parse`: `exportLikeOracle(load(elkt).root)` against the oracle's parse, `compareLayout` at 1e-6. Where
  the oracle throws, the port must report at least one error (presence only, D8 #1).
- `validate`: `ElkGraphText.validate` issues against Xtext's `IResourceValidator` (`severity`, `message`,
  `line`, `code`), exactly and in emission order.
- `write`: `ElkGraphText.serialize` against `EcoreUtil.copy` plus `ISerializer.serialize(format())`, byte for
  byte, for the 898 `.elkt` (parsed, then written) and the 550 `.json` (via `ElkGraphJson`). Failures match by
  presence.
- `reparse`: `load(serialize(g))` equals `g` (`canonGraph`, properties sorted by id); where it cannot, it must
  equal the oracle's own reparse of the same text and the oracle's round trip must be lossy too.
- `D3`: a realworld `.json` and its `.elkt` give the same graph except for port positions (D3 as amended by
  D3a, user 2026-10-14).

**Registry mode.** The sweep always runs the oracle with `ORACLE_REGISTRY=core` (G3): the CoreOptions-only
registry, which is the TS registry (94 option ids on both sides). The default oracle registry changes the
export of 182 of the 898 models (layered and other algorithm keys), so default-mode output is not the
comparison. Missions 5 and 7 register more algorithms and regenerate these refs and this sweep; the
`MISSION5_ALGORITHMS` filter and the `mission5` vector rows go away then.

**Result** (oracle ELK `8aaa3c1`, elk-models `ac5af2b`, 2026-10-14; counts equal the graph-text decision
journal):

| Indicator                 | Bar         | Measured    | Deferred | Diffs |
| ------------------------- | ----------- | ----------- | -------- | ----- |
| parse-equal               | 898/898     | 898/898     | 0        | 0     |
| validate-equal            | 898/898     | 898/898     | 0        | 0     |
| writer byte-exact         | 1,448/1,448 | 1,448/1,448 | 0        | 0     |
| reparse-equal after write | 1,448/1,448 | 1,448/1,448 | 0        | 0     |
| D3 `.json` equals `.elkt` | 550/550     | 550/550     | 0        | 0     |

Validate-equal (2026-10-15): the 4 models that name `fixed` or `box` (G3: in the oracle's core registry, not
yet in the TS one) are validated with stand-ins registered (`test/helpers/mission5-stand-ins.ts`, the option
support of `Core.melk`, no layout code) and match exactly; without them they differ only by "No layout algorithm
with identifier … can be found". Mission 5 drops the stand-ins.

No case was nondeterministic and the oracle threw on none (all 898 `.elkt` parse, validate and write; all 550
`.json` import and write). Reparse: 1,447 reload equal to the written graph; 1 (`examples/user-hints/layered/reverseEdge.elkt`)
reloads as the oracle reloads it: `priority.direction` is a layered option, unknown under the core registry, and
the writer emits the short key `direction`, which is an ambiguous suffix on re-reading (the oracle's round trip is
lossy identically). The largest model (`realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt`,
253 KB) loads in about 110 ms (budget 1 s) and the TS side of the sweep runs in well under the 2 minute budget.

**Deferrals.**

- G3, mission 5 (4 validate models): the core oracle registers the algorithms `fixed`, `box` and `random`,
  the TS registry defers them, so the port adds "No layout algorithm with identifier ... can be found." The
  models name them as `algorithm`: `tickets/core/457_boxLayouterIgnoresMinimumSize` (`box`),
  `tickets/core/475_fixedLayoutWithLongLabels` (`fixed`), `tickets/core/489_paddingAndMinSize_Large` and
  `_Small` (`org.eclipse.elk.box`). Closed by mission 5 (the same filter as the validator vectors).
- D3 port positions (D3a, all 550 realworld pairs): the `.elkt` of a realworld model carries port positions of
  a laid-out Ptolemy graph and its `.json` has none, and the oracle's two parses differ in exactly `ports[].x` and
  `ports[].y` for every pair. The user amended D3 on 2026-10-14 to "equal except port positions". Rule:
  `canonGraphWithoutPortPositions` trees equal (`test/helpers/elkt-canon.ts`: `canonGraph` with every port's x and
  y blanked), no tolerance, nothing else excluded — and only while those positions cannot change a layout: in both
  graphs every port has an explicit side and `port.index` and no node has `FIXED_POS`/`FIXED_RATIO` constraints
  (`portsWithLayoutRelevantPosition` empty; otherwise ELK infers side or order from the position). All 48,858
  realworld ports meet it.
- D8 #1, syntax-error text: matched by presence only. No corpus model has a syntax error, so no sweep row uses
  it; the vectors cover it.

**Writer quirk kept (G1).** `ElkGraphSemanticSequencer.isQuotingNecessary` always returns `false` (the
`map` result is unused, so the compiler drops the call), so property string values are never quoted or escaped:
a value such as `say "hi"` is written bare and does not re-parse. The port reproduces this (ELK behaviour kept);
the T5 vectors and the sweep agree byte for byte.

**Converter rows and diagnostic lines (text-follow-ups T2, T8).** The `.elkt` converter service replays 33 more
lexer rows (the `SIGNED_INT`, `FLOAT`, `ML_COMMENT`, `SL_COMMENT`, `ANY_OTHER` and `WS` terminals) through
`DefaultTerminalConverter` and the `EcoreFactoryImpl` EInt/EDouble/EString arms. Diagnostic lines of `.elkt` now
follow Xtext's node model like `.elkj` (a lone CR counts as a line break): the parser passes
`nodeModelLineSource(text)` and the reference lines in `ElkGraphParserEdges.ts` use `cursor.lineOf`. Evidence: 4 new
JVM scenarios (`link-cr-line-numbers`, `link-crlf-line-numbers`, `err-syntax-cr-line-number`,
`err-syntax-crlf-line-number`); `graph-text-parse.json` 301 to 305 cases (syntax-error cases 99 to 101), linking
diagnostic cases in `ElkGraphLinker.test.ts` 47 to 51, no existing row changed. Property keys
(`ElkGraphParser.ts`, `#parsePropertyKey`) followed in vector-cache-and-key-line T1 (F7): two JVM validate scenarios
(`checkPropertyKey-line-lone-cr`, `checkPropertyKey-line-crlf`), `graph-text-validate.json` 76 to 78 cases, no
existing row changed; before the fix the lone-CR row reported both key issues on line 2, the oracle on lines 3 and 5.

**Regenerate.** `tools/oracle/elkt-sweep.sh [--force]` writes `$ELK_ORACLE_DIR/sweep/elkt-<elkCommit>-<modelsCommit>/`
(`parse/`, `parse-json/`, `validate/`, `write/`, `results.jsonl`, `summary.json`; never in the repo, AD-5) and
skips when the stamp (oracle build, harness and tool sources, models commit, input hashes) is fresh. Then
`npx vitest run test/corpus/elkt-sweep.test.ts` (skipped with a message without elk-models or the sweep) logs
`elkt sweep: <indicator>=<n>/<total> deferred=<d> diffs=<k>` (validate adds `standIns=<s>`) for each indicator and fails with the per-model
report. A mismatch outside the deferrals above is a defect to diagnose against the oracle, never a number to
adjust.

## 8. ELK Textual JSON (`.elkj`) {#elk-textual-json-elkj}

Port: `src/graph/json/text` over `src/xtext` and the EMF proxy subset in `src/emf` (internal entry point
`ElkGraphJsonText`: `load`, `validate`, `serialize`; design and runbook in
[elk-json-text.md](architecture/elk-json-text.md)). Evidence is two-tier (D8), as for `.elkt`: the committed JVM
vectors (lexer 554 rows, parse 439, validate 28, write 126, inverse-state 69 cases) and 34 curated entries (15
parse refs, inputs vendored in `test/corpus/elkj-curated/`) run in CI; the sweep below measures the corpus
locally. The pinned elk-models holds no `.elkj`, so the oracle produces them (D2).

**What is compared** (always `ORACLE_REGISTRY=core`, D4; every case in two JVM runs compared byte for byte):

- Tier 1, `tier1-parse-equal` / `tier1-validate-equal`: ELK's own `.elkj` conversion of an elk-models `.elkt` or
  realworld `.json` (the oracle's `convert` mode, `ConvertGraphHandler` steps, identifier seed 1, D12) read by the
  `.elkj` language. Parse is compared as ELK JSON at 1e-6; validate as `IResourceValidator` issues, exactly.
  Where the oracle rejects the file the port must report an error (presence, D6).
- Tier 2, `tier2-parse-equal`: every realworld `.json` and the repo's ELK JSON read as `.elkj` text.
- Writer, `writer-byte-exact`: `ElkGraphJsonText.serialize` against `EcoreUtil.copy` plus
  `serialize(format())`, byte for byte; where the oracle fails the port throws `ElkGraphJsonSerializationError`.
- `reparse-equal`: the port's own text read again gives what the oracle's reparse of its text gave.

**Size-capped selection** (D2 amendment, user 2026-10-16). The oracle's Xtext serializer needs 30 to 1,100
CPU-seconds per graph (9-graph sample: 113 to 678 s each, 57 min single-JVM), so converting and writing all
1,448 graphs twice is days of CPU. Tier 1 and the writer run on every corpus graph of at most 5 KB (345) plus 40
graphs sampled from the 1,103 larger ones in five size bands that double from the cap (11/16/7/4/2 graphs in
[5, 10), [10, 20), [20, 40), [40, 80) and [80, ∞) KB; 6.1 to 207 KB) = 385 graphs; tier 2 runs on all 666 ELK JSON
inputs; determinism is double-run on 30. The first run (graph-json-text T17) sampled only 6 graphs of 5 to 37 KB
(`--sample 6 --sample-max 40000`); the fuller sweep (text-follow-ups T11, follow-up F5) runs `--sample 40` with no
size limit. A full run is a parameter change (`--cap 100000000`).

**Result** (oracle ELK `8aaa3c1` plus patches `0001`, `0002`, elk-models `ac5af2b`; counts equal the
text-follow-ups decision journal, row T11, and the graph-json-text one, row T17):

| Indicator            | Bar     | 40 sampled (2026-10-20) | Exact | Presence / both reject                              | 6 sampled (2026-10-16) | Diffs |
| -------------------- | ------- | ----------------------- | ----- | --------------------------------------------------- | ---------------------- | ----- |
| tier1-parse-equal    | 378/378 | 378/378                 | 144   | 234 (syntax errors; oracle cannot reparse own file) | 344/344 (200 presence) | 0     |
| tier1-validate-equal | 378/378 | 378/378                 | 144   | 234                                                 | 344/344                | 0     |
| tier2-parse-equal    | 666/666 | 666/666                 | 591   | 75 rejected by both                                 | 666/666                | 0     |
| writer-byte-exact    | 385/385 | 385/385                 | 349   | 36 oracle failures matched                          | 351/351 (315 exact)    | 0     |
| reparse-equal        | 349/349 | 349/349                 | 139   | 210                                                 | 315/315                | 0     |
| nondeterministic     | 0       | 0 of 1,482 double runs  |       |                                                     | 0                      |       |

Cost of the fuller sweep: oracle 7 h 34 min wall on 6 serial-GC JVMs at `nice 10` (the convert, write and
tier-2 parse queue; parse 27 s, validate 9 s), with 21.9 h of summed per-graph `convert` time and 21.6 h of
`write` time; the largest sampled graph (207 KB) alone takes 4.5 h to convert and 4.3 h to write. The TS side
runs in 5.7 s. The first run took 2 h 04 min on 8 JVMs, TS side 4.2 s. 7 graphs, all at most 5 KB, fail `convert` in
the oracle (edge sections, a value the grammar cannot convert; the first run also counted 7), hence 7 fewer for
tier 1; 29 more fail `write` (missing or duplicate ids: that path has no id generator), part of the 36 matched
oracle failures. None of the 40 sampled graphs fails. Determinism needed one merge fix: Xtext error messages embed the
output URI, and `ElkjSweep.java` normalises the directory. Largest curated model (712 KB ELK JSON) loads in about
100 ms.

### Accepted divergences {#elkj-divergences}

- **D6, syntax errors, presence only.** The port stops at the first syntax error; ANTLR recovers. The JVM keeps
  recovered edges in 16 syntax rows, and recovered null-valued entries cause its NPE rows (the 5
  null-property-value rows); the port never builds them. A recorded conversion diagnostic that comes from ANTLR
  recovery after a syntax error (`err-syntax-cr-line-number`) is a presence row.
- **Unresolved-reference export** (extends the unknown-endpoint entry under "Behavioural divergences"). The
  `.elkj` exporter hits an unresolved proxy and the oracle throws a message-less `NullPointerException`; the port
  throws a message-less `IllegalArgumentException`, with the single recorded diagnostic left on the resource
  (30 parse rows, 1 curated entry). Linking diagnostics themselves are exact.
- **Converter rows: 5 not replayed.** Closed for the SIGNED_INT/FLOAT/comment/`ANY_OTHER` terminals (follow-up F1,
  text-follow-ups T4 and T8): `DefaultTerminalConverter` and the `EcoreFactoryImpl` datatype arms are ported
  (D6), so 43 of the 45 new `.elkj` rows now replay through the services (78 new rows in all: 33 `.elkt`, 45
  `.elkj`; 76 replay). The skipped set (`UNREPRESENTABLE_ROWS`) is 5 rows, each needing a Java box type a `number`
  cannot carry: `Number.toString(int:1)`, `StringValue.toString(float:2.0)` as in `.elkt`,
  `INT.toString(double:1.5)`, and, by user decision in T8, `FLOAT.toString(float:1.5)` (a `Float` is not `equals`
  the reparsed `Double`) and `FLOAT.toString(int:1)` (an `Integer` prints `1`, which lexes as `SIGNED_INT`).
- **Diagnostic lines versus token lines.** Diagnostics follow Xtext's node model (LF, lone CR, CRLF;
  `InternalNodeModelUtils.computeLineBreaks`); token rows follow ANTLR (LF only). Both languages pass the node-model
  `LineSource` (`.elkt` since text-follow-ups T2, F2, and its property-key lines since vector-cache-and-key-line T1, F7; see section 7). Where Java's `charAt(offset)` would throw at a text-final `\r`, the
  port treats the character as not `\n`.
- **`EObjectValidator` once.** `.elkj` has no registry default, so the registrar's `validator == null` branch
  builds a fresh composite holding one `EObjectValidator`, and each EMF constraint is reported once (code
  `org.eclipse.emf.ecore.14` per map-key collision); `.elkt` reports twice. No `LayoutOptionValidator` runs.
- **Round-trip lossy classes** (281 loadable inputs: 193 equal, 88 in asserted classes, 0 divergences): 34
  quoted unknown keys unwritable, 1 keyword string, 1 list value, 14 bare dotted keys, 4 empty elements written
  `{ "" : }`, 27 unresolved endpoints dropped by the copy (oracle-verified, see below), 1 copy failure, 5 int32 saturation or `-0.0`, 1 bare key that gains
  quotes. Each class is asserted per case in `test/golden/elkj-roundtrip.test.ts`.
- **Round-trip oracle vectors (T16b, 2026-10-18; re-recorded 2026-10-20, text-follow-ups T10).** `test/golden/refs/java/graph-json-text-roundtrip.json` holds
  281 rows from `tools/vectors/ElkjRoundTripVectors.java` (the oracle's loadable set equals the TS round trip's
  281: 16 curated + 265 T3 scenarios). Replay: 244/244 written texts byte-equal (226 reparse exact plus export
  equal, 18 presence), 37/37 error rows (36 serializer `RuntimeException` against
  `ElkGraphJsonSerializationError` by class, message text not comparable because Xtext embeds the object and
  URI; 1 copy failure `IndexOutOfBoundsException: targetIndex=1, size=1` with a byte-equal message) and 27/27
  unresolved-endpoint drops. The claim that the copy drops unresolved endpoints moved from source-derived
  (EMF `Copier.copyReference`) to oracle-verified; the class count is 27, not 28, because `ElkGraphCopy` now
  ports the bidirectional many-valued arm and `sources: ["a","a"]` throws like the JVM (the 28th, now
  `copy-failure`).
- **Lone surrogates reload as written (text-follow-ups T1/T10, F6).** The recorder reloads each written text
  from the `String` (`LazyStringInputStream`, which `XtextResource.createReader` reads through a `StringReader`),
  no longer via `getBytes(UTF_8)`, which turned a lone surrogate into `?`. The 2026-10-20 re-record changed one
  row of 281 (`input-lone-surrogate-escape`: reparse id `\ud800`, was `?`); the replay reloads every text as
  written, with no test-side transport.
- **Oracle conversions mostly do not reparse in the oracle itself.** Its serializer writes bare dotted option
  keys, `null` values, NaN, `4.9E-324` and unescaped quotes, and fails on edge sections and KVectorChain/List
  values; hence the 200 presence rows of `tier1-parse-equal`.
- **Proxy `toString` (text-follow-ups T3, F4; amends elkgraph-model D10).** The generated `toString` arms
  (`if (eIsProxy()) return super.toString();`, 9 `*Impl` classes including `ElkNodeImpl`) print EMF's
  ` (eProxyURI: <uri>)` suffix after the hashless class name; Java also prints `@<identityHash>`, which the
  vector recorder strips (`@<hex>` before `(eProxyURI:`) so the rows compare exactly. Evidence: scenarios
  `proxy-to-string` and `proxy-to-string-edge-with-proxy-source` in `graph.json` (42 scenarios, 674 steps).

No ELK prose typo was corrected in this mission, so nothing is listed under "upstream typos".

**Regenerate.** `tools/oracle/elkj-sweep.sh [--force] [--cap] [--sample] [--sample-max] [--determinism] [--jobs]`
writes `$ELK_ORACLE_DIR/sweep/elkj-<elkCommit>-<modelsCommit>/` (never in the repo, AD-5), resumable and skipped
when its stamp is fresh; then `npx vitest run test/corpus/elkj-sweep.test.ts` logs
`elkj sweep: <indicator>=<n>/<total> deferred=<d> diffs=<k> nondeterministic=<m>`. A mismatch is a defect to
diagnose against the oracle, never a number to adjust.

## 9. grandom (`.elkr`) {#grandom-elkr}

Port: `src/core/debug/grandom` over a hand-written lexer and parser on `src/xtext` primitives (internal facade
`GRandomText`: `parse`, `validate`; generation through `RandomGraphGenerator`; design and runbook in
[grandom.md](architecture/grandom.md)). Evidence is the committed JVM vectors plus the nine generated corpus files;
there is no sweep (the inputs are small and fully enumerated).

**What is compared.** Vectors are recorded by `tools/vectors/elkr-vectors.sh` into
`test/golden/refs/java/grandom-*.json` (AD-13):

- `grandom-lexer.json`: 433 token rows, all exact.
- `grandom-parse.json`: 142 rows: 77 error-free rows compare the full model dump exactly, 65 syntax-error rows by
  presence (D8 #1); 9 rows carry conversion errors, compared exactly (message, offset, length).
- `grandom-validate.json`: 23 rows: 20 exact, 3 presence-only for the parser syntax issue (their check issues are
  still exact).
- `grandom-generate.json`: 58 seeded rows holding 62 graphs, each compared byte for byte as the JSON export of
  `CaseRunner.export` (`omitLayout(false)`, `omitZeroDimension(false)`, `omitZeroPositions(false)`,
  `omitUnknownLayoutOptions(true)`, `prettyPrint(true)`) plus a trailing newline; 6 unseeded rows holding 7 graphs,
  compared by count invariants only; 12 `RandVal` rows (20 draws each of `val`, `intVal`, `floatVal`), exact.

**Exit (D1).** All nine `test/corpus/generated/*.elkr` regenerate their sibling `.json` byte for byte
(`src/core/debug/grandom/GRandomCorpus.test.ts`), and every vector row above replays. This is the gate D7 of the
conformance corpus set for the generated tier; algorithm goldens never depend on it.

**Unseeded by contract (never compared exactly).** `BlindTextGenerator` edge-label text (a fresh `new Random()` per
call; masked, the 38 to 49 character length bound asserted), `RandomGraphGenerator.sample()` through the
one-argument `Collections.shuffle(list)` (cross-hierarchy edges), and a configuration without `seed`.

**Upstream typos.** None found in the grandom bundle's human-readable text, so nothing is listed under "upstream
typos".

**Regenerate.** `tools/vectors/elkr-vectors.sh <outDir>` (`ELK_VECTORS_CACHE=off` for a cold run) and
`tools/oracle/regen-generated.sh` for the corpus; a differing rerun is a defect to diagnose against the oracle,
never a ref to accept.

## Core layouts (fixed, box, random)

The three core algorithms are proven against the oracle over the corpus retargeted to each of them
(`tools/corpus/ts-layout-compare.ts`; the overlay and export flags are those of `layout-goldens.test.ts`:
`applyOverlay`, `RecursiveGraphLayoutEngine`, `omitLayout(false)`, `omitZeroDimension(false)`,
`omitZeroPositions(false)`, `omitUnknownLayoutOptions(true)`, `prettyPrint(true)`). Nothing from the sweep is
committed (AD-5): the oracle outputs stay under `$ELK_ORACLE_DIR/sweep/`, the summary under a path of your choice.

**Result** (oracle commit `8aaa3c1`, models `ac5af2b`; run A outputs; `random` has 7 extra generated-tier cases):

| Algorithm | Planned | ok  | mismatch | both-throw | ts-only-throw | oracle-only-throw | excluded |
| --------- | ------- | --- | -------- | ---------- | ------------- | ----------------- | -------- |
| `fixed`   | 898     | 687 | 175      | 29         | 7             | 0                 | 0        |
| `box`     | 898     | 710 | 181      | 0          | 7             | 0                 | 0        |
| `random`  | 905     | 388 | 141      | 0          | 4             | 0                 | 372      |

Every one of the 497 `mismatch` cases differs only in `layoutOptions` entries: no coordinate, size, section, bend
point or label differs (NaN included). So the port matches the oracle's geometry on all 2,282 cases that both sides lay
out (`ok` plus `mismatch`); the other 18 throw on the TS side only. Both groups are explained under "Known divergences
found" below and close when the layered bundle and the other algorithm bundles are registered (mission 7h). The 29
`both-throw` cases of `fixed` are the oracle's `IllegalArgumentException` "The edge needs to have exactly one edge
section. Found: 0"; the port throws the same class.

**Wall time** (sum over the cases; one local run on a loaded machine, indicative only). The oracle figure is the
harness's per-case time in a warm JVM (JVM start-up and the second determinism run excluded); the TS figure covers
import, overlay, layout and export of a case (file reads excluded):

| Algorithm | TS (ms) | Oracle (ms) |
| --------- | ------- | ----------- |
| `fixed`   | 4,836   | 4,839       |
| `box`     | 5,447   | 6,077       |
| `random`  | 3,469   | 5,064       |

**Excluded (372 `random` cases).** `random` with the default `randomSeed` (0) is unseeded: the algorithm draws from a
fresh `new Random()`. The retarget overlay seeds only the root (`randomSeed = 1`), so every nested composite stays
unseeded, and the oracle's two JVM runs disagree (`nondeterministic` in the sweep). Those cases cannot be compared and
are not run on the TS side. The 526 settled retarget cases and the 7 generated `random` cases compare normally.

**Reproduce.**

- `tools/oracle/sweep.sh` — the oracle sweep (all algorithms, about 2 minutes, needs the oracle build).
- `npx tsx tools/corpus/ts-layout-compare.ts --out /tmp/core-layouts.json` — the comparison.
- `npx tsx tools/corpus/ts-layout-compare.ts --algorithms box --filter examples/ --out /tmp/box-examples.json` — a
  subset.

The tool reads `$ELK_MODELS_DIR` and the sweep under `$ELK_ORACLE_DIR` (`--sweep-dir` overrides it), prints the counts
and the wall times, writes the per-case findings (first differences) to `--out`, and exits `1` while findings exist.
`optionsOnlyMismatches` in the summary counts the mismatches whose differences are all `layoutOptions` entries.

**Known divergences found.** None is a port defect; the first two are properties of the registry, not of a layout.

- **Short option key `direction` (295 entries, all three algorithms; 62 cases differ in nothing else).** The oracle exports `elk.direction`, the port
  `direction`. `JsonExporter.getShortOptionKey` (`JsonExporter.xtend:451-479`) shortens an id only while the suffix
  resolves to one option; layered's `priority.direction` (`Layered.melk:732`) makes the suffix `direction` ambiguous
  in the oracle's registry (`LayoutMetaDataService.getOptionDataBySuffix` returns `null` for a non-unique suffix,
  `:326-344`), so it writes `elk.direction`. The CoreOptions-only registry has one match. Every difference is the pair
  "missing `elk.direction`, extra `direction`" at the same node (295 pairs, none unpaired). Closes with layered (7h);
  same mechanism as the J10 note under "Temporary gaps".
- **Layout options of unported bundles (435 mismatches, 1,122 entries).** Options the model sets that belong to
  layered, force, mrtree, rectpacking and similar bundles (for example `layering.layerConstraint`,
  `crossingMinimization.strategy`, `edgeLabels.sideSelection`, `nodePlacement.strategy`, `spacing.nodeNodeBetweenLayers`,
  `desiredEdgeLength`) are written by the oracle and omitted by the port: `omitUnknownLayoutOptions(true)` drops options
  absent from the registry. All 43 distinct missing keys other than `elk.direction` resolve to no option in the port's
  registry (`getOptionDataBySuffix` returns `null`); no `value` or `type` difference exists. Closes as the bundles are
  registered.
- **TS-only throws (18 cases: 7 `fixed`, 7 `box`, 4 `random`).** All are
  `UnsupportedConfigurationException: Unable to load default layout algorithm org.eclipse.elk.layered for unconfigured
node ...` on the models `examples/edges/insideSelfLoops`, `tickets/core/562_insideSelfLoopAlgorithmResolving`,
  `tickets/layered/273_insideSelfLoopsWithLabels` and `tickets/layered/548_NPEWithInsideSelfLoops`. A childless node
  with inside self loops enters the algorithm resolver (`RecursiveGraphLayoutEngine.java:148-151`, ported at
  `RecursiveGraphLayoutEngine.ts:140-144`); the retarget overlay sets the algorithm only on nodes with children, so that
  node resolves to the default `layered`, which the oracle has and the port does not yet. Closes with layered (7h).
- **Bare `NaN` in `fixed` outputs.** 261 `fixed` oracle outputs (and 5 `box`/`random`) contain bare `NaN`, not valid JSON
  (Gson is lenient); the tool reads them with a `NaN`/`Infinity` tolerant parser and the port produces the same values.
  Mechanism: `ElkUtil.resizeNode` (`ElkUtil.java:257-306`) computes `heightRatio = newSize.y / oldSize.y`; the
  retargeted hierarchical models have a parent of size 0 x 0, the ratio is `Infinity` or `NaN`, and a west or east port
  without fixed port constraints gets `y = y * ratio`, so `0 * Infinity = NaN`. The port reproduces it
  (`ElkUtilSizing.ts:98-119,193`).
- **Last-ulp `Math.*` differences.** None found in these cases (every coordinate is within 1e-6).

**Upstream quirks of `core` kept (mission 5).** Each is read from the Java and reproduced; all are "kept: upstream
behaviour". Detail: [core-engine.md](architecture/core-engine.md).

- `TestController.removeLayoutExecutionListener` adds the listener instead of removing it
  (`TestController.java:180-182`).
- `FixedLayoutProvider` and `RandomLayoutProvider` call `sections.remove()` without `next()`, so an edge with more than
  one section throws `IllegalStateException`.
- `RandomLayoutProvider` reads the edge target from `getSources().get(0)` (`:167`), so every edge is treated as a
  self-edge; it adds the port parent's x twice (`:159-160`, `:175-176`) and offsets y by `padding.getLeft()` (`:113`).
- `ElkUtil.determineJunctionPoints` checks the main edge's section count inside the loop over the other edges
  (`ElkUtil.java:537-541`), so an other edge without sections throws `IndexOutOfBoundsException`, never the
  documented `IllegalArgumentException`.

## Core remainder (mission 5b) {#core-remainder}

Mission 5b completed the `core` bundle (R1). Its evidence is JUnit ports, JVM vectors and oracle scenarios; there is
no corpus sweep, because nothing in 5b lays out a graph on its own.

**Evidence.**

- The JUnit ports are green: `LayoutConfiguratorTest`, `SpacingConfigurationTest`, `AlgorithmAssemblerTest`,
  `LayoutProcessorConfigurationTest`, `BezierSplineTest`, `CubicSplineInterpolatorTest` and the full `ElkMathTest`,
  including its 4 rectangle cases. The `.elkt` harness uses `LayoutConfigurator` (T12), and both golden sets
  regenerate byte-identical.
- Comments (R6): `tools/vectors/comment-vectors.sh` records 18 tie-free `CommentAttacher` scenarios in
  `test/golden/refs/java/comments.json` (best-minus-second margin 0.14 to 1.0, each run twice by the recorder). All 18
  replay equal as sorted `[commentId, targetId]` sets (R6 asked for about 10). `NodeReferenceMatcher` builds all 5,044
  `regex.json` pattern strings and flags exactly.
- JDK shims: `awt.json` (2,842 rows), `regex.json` (5,044), `character.json`, `regex-boundary.json` and
  `stream-sum.json` (1,035) replay with no row skipped. Recording is byte-stable (re-recorded by the orchestrator;
  the earlier vector files are unchanged).

**Known divergences found.** None numeric. The two behavioural differences below are open by design.

- `WrappedException(cause)` uses `String(cause)` as its message (`Name: message`); Java prints the qualified class
  name. Nothing branches on it (T1).
- `ElkGraphDataProvider(null)` and the other `Objects.requireNonNull` sites throw `TypeError` where Java throws
  `NullPointerException`; the Javadoc of `ElkGraphDataProvider` says `IllegalArgumentException`, the code does not (T13,
  T15).

Upstream prose typos corrected in this mission: none found.

### Upstream quirks kept (mission 5b) {#core-remainder-quirks}

Each is read from the Java and reproduced; all are "kept: upstream behaviour".

- `ElkSpacings.DOUBLE_EQ_EPSILON` is `10e-5` (that is `1e-4`) and the method is spelled `getDependendSpacingOptions`
  (identifier, kept verbatim) (T7).
- `ElkSpacings.ELK_OPTION_TARGET_FILTER` tests `property instanceof ElkGraphElement` (the property, never an element),
  so it accepts every option and never delegates to `LayoutConfigurator.OPTION_TARGET_FILTER`. `build()` with
  overwrite off pushes a `NO_OVERWRITE_HOLDER` onto the filter list on every call (T7).
- `IDataProvider.cached()`: the first `provideTargetsFor` call returns the uncached collection and later calls the
  multimap's set; an empty result never becomes a key, so it is recomputed every call (T13).
  `IBoundsProvider.cached()` checks `has()` first, so null results are cached.
- `Triple` and `Quadruple` `equals` cast without checking the type: a non-instance throws `ClassCastException`; their
  `hashCode` is the `Arrays.hashCode` formula (T1).
- `NodeReferenceMatcher.fuzzyRegexpFor`/`strictRegexpFor` size their buffers from the untrimmed target name
  (`targetName.length() * 2`) while reading the trimmed name (`NodeReferenceMatcher.java:337-339`); the port drops
  the capacity argument, which has no observable effect (T19).
- `DistanceMatcher.distance`: a comment touching the target's right edge with partial vertical overlap returns -1
  (the `else if` after the horizontal-overlap branch is never reached); the left side adds the comment width
  (left 110 vs gap 50) (T15).
- `CubicSplineInterpolator` closed splines: `even` selects `INTERP_COEF_ODD` (`CubicSplineInterpolator.java:82`) (T11).
- EMF `AbstractTreeIterator.hasAnyChildren()` shadows `nextPruneIterator` with a local, so pruning before the first
  `next()` with `includeRoot=false` has no effect (T18).
- `ElkMath.binomiall`'s `n == 0` branch is unreachable (the `k == 0` test matches first); `maxl()`/`minl()` start from
  `Integer.MIN_VALUE`/`MAX_VALUE` (T3).
- Matcher results in `CommentAttacher` are keyed by matcher class, so two matchers of one class overwrite each other;
  with explicit attachments and keep-heuristics off, `edgeify` drops every heuristic attachment (T14, T16).
- JDK 21 `\b` treats a combining mark after a word character as word, beyond its Javadoc definition; the port replays
  the recorded table (`regex-boundary.json`, T9). The JDK `\b` never matches before a non-ASCII leading letter.

## alg.common, part a (mission 6a) {#alg-common}

Mission 6a ported `alg.common` except `nodespacing/**` and `NodeMicroLayout` (AC1; design and runbook in
[alg-common.md](architecture/alg-common.md)). Its evidence is four JUnit ports, a new oracle recorder
(`tools/vectors/alg-common-vectors.sh`, AC3) for the packages without Java tests, and the vendored ticket model of
`Issue475Test`. No corpus sweep applies: nothing in 6a lays out a graph on its own.

**Evidence.**

- The JUnit ports are green: `RectilinearConvexHullTest` (T8), `NetworkSimplexTest` (T7), `OneDimensionalCompactorTest`
  (17 of 17, T9) and `Issue475Test` (T5).
- `test/golden/refs/java/alg-common.json` (234,053 bytes, seeds 7001, 7101, 7201, 7301, 7401; recorded twice,
  byte-identical, every scenario also run twice inside the recording). Every scenario replays exactly:

| Section         | Rows | Replayed equal | Notes                                                                                |
| --------------- | ---- | -------------- | ------------------------------------------------------------------------------------ |
| `triangulation` | 22   | 22             | edge iteration order and both cost trees, incl. the all-ties `constant` cost (V6-V8) |
| `polyomino`     | 108  | 108            | 3 rows expect `IndexOutOfBoundsException` and the port throws it                     |
| `overlaps`      | 34   | 34             | includes 8 deterministic `tie-*` rows                                                |
| `spore`         | 18   | 18             | 8 scanline, 10 depth-first compaction                                                |

- `Issue475Test` runs the vendored `tickets/core/475_fixedLayoutWithLongLabels.elkt` (elk-models `ac5af2ba`, SHA-256 row
  in `test/golden/inputs/manifest.json`); `TICKET_INPUTS` in `test/golden/algorithm-refs.test.ts` lists four ticket
  models (AC5, an AD-13 change approved by the user).
- Landed vectors, goldens and corpus are unchanged: `git diff --name-status main -- test/golden/refs/ test/corpus/` shows
  only the added `refs/java/alg-common.json`.

**Known divergences found.** None numeric. The differences below are open by design.

- **No debug file output (AC4).** `SVGImage.save`/`isave` (`SVGImage.java:252-301`), the `DebugUtil` writer and
  `NGraph.writeDebugGraph` keep their logic and write nothing, because `src/` is browser-safe. Every `/*d*/` call stays,
  because some compute values (`BowyerWatsonTriangulation.java:101-102`).
- **Iterative traversals (AC6).** `NetworkSimplex.tightTreeDFS` and `postorderTraversal` are explicit-stack loops; the
  behaviour is identical and proven against a verbatim recursive reference (`NetworkSimplexTree.test.ts`).
- **Exception class where Java dereferences null.** `SVGImage.addElementStr` after `removeGroup` of the current group:
  `IllegalStateException` (Java NPE; T2). Disconnected input to `NetworkSimplex` (`feasibleTree`): `TypeError` (Java
  NPE; T7). A null quadrant or `xMin` in `RectilinearConvexHull` and a null `lastX` in its event handler:
  `IllegalStateException` or `TypeError` (T8). Each site is unreachable from valid input; only an invalid input or a use after removal reaches it.
- **`CNode.toString`** without a delegate prints the shim's identity hash, which differs from the JVM's (debug only; T9).
- **Omitted `assert false` defaults** in `RectangleStripOverlapRemover` (`importRectangle`), kept as commented `default`
  arms, following the `KVector.ts` precedent; no dev-assert helper exists (T10).
- **Prose typos corrected:** none found in this mission.

### Upstream quirks kept (mission 6a) {#alg-common-quirks}

Each is read from the Java and reproduced; all are "kept: upstream behaviour".

- `PlanarGrid.weaklyIntersectsArea` is not bounds tolerant, so `PolyominoCompactor.packPolyominoes` throws
  `IndexOutOfBoundsException` when an extension leaves the grid (3 of 108 recorded rows, aspect ratio 2.5; T4, T12).
- `RectangleStripOverlapRemover.computeOverlaps` keeps a `TreeSet` ordered by right border, so a rectangle with an equal
  right border is dropped from the scanline set; `exportRectangle` for `DOWN` adds `startCoordinate` to a `y` the
  strategy already wrote on the same rectangle. The `tie-*` rows pin both (T10).
- `exportRectangle(node, stripSize)` keeps its unused `stripSize` parameter (T10).
- `QuadraticConstraintCalculation` clears every node's constraints first (`QuadraticConstraintCalculation.java:30-32`),
  so only the scanline algorithm keeps predefined constraints (T9).
- `ScanlineConstraintCalculator.insert` reports an overlap on `System.err`, but `floor`/`ceiling` right after `add` return
  the node itself, so the message never fires (T9).
- `TwoBitGrid` words are Java `long` (cell 31's weak bit is the sign bit); reads past the width inside the last word
  return 0 while writes throw (T6).
- `NGraph.makeConnected` and `isAcyclic` overwrite `NNode.internalId` with the position in `nodes` (T3).
- `NetworkSimplex` guards a cut-value array with `cutvalue == null`; Java-null arrays are empty arrays here, so the test
  folds into the length check and the reuse `else` is unreachable but kept (T7).
- `PolyominoCompactor` compares polyominoes with `equals`, which is identity (no override in Java) (T12).
- `ElkMath.distance` traces rays of length `|v|`, so a vector shorter than the gap returns Infinity; spore callers pass a
  vector scaled to the underlap (T11).
- `UniqueTriple` declares no `equals`/`hashCode` (identity) but nothing hashes it (T6, T12).

### Deferred JUnit files (P5) {#alg-common-deferred}

Four of the eight `alg.common.test` files need algorithms that are not ported. Each is ported unchanged when its
algorithm exists.

- `InsidePortLabelTest`: needs layered; closed by mission 7a.
- `NextToPortLabelPlacementTest`: needs layered; closed by mission 7a.
- `PortLabelPlacementVariantsTest`: needs layered; closed by mission 7a.
- `NodeMicroLayoutTest`: needs layered, force, stress, mrtree, radial and rectpacking; closed by mission 8x.

## alg.common, part b: nodespacing (mission 6b) {#alg-common-nodespacing}

Mission 6b ported `nodespacing/**` and `NodeMicroLayout`, which closes `alg.common` (design and runbook in
[alg-common.md](architecture/alg-common.md#nodespacing)). The package has no runnable Java tests: its 4 JUnit files
need layered (P5, [deferred](#alg-common-deferred)). The evidence is therefore an oracle sweep of `NodeMicroLayout`
(AC2, refined by NS1-NS6 in `plans/alg-common-nodespacing/decisions.md`): a new recorder,
`tools/vectors/node-micro-layout-vectors.sh`, stores each prepared input graph as ELK JSON inside the vector row (NS1),
and TS replays it through `ElkGraphJson` and the ported `NodeMicroLayout`, bottom-up over every node with children
(NS3). No model is vendored.

**Evidence.**

- `test/golden/refs/java/node-micro-layout.json` (1,118,635 bytes; JDK 21.0.1; oracle `8aaa3c14`): recorded twice,
  byte-identical, and every row built twice inside one recording. Each row's re-imported input gives the same output as
  the prepared original (the NS1 round-trip check). Every row replays within 1e-6 on the first run
  (`src/alg/common/NodeMicroLayoutVectors.test.ts`); identifiers, element counts and exceptions match exactly.

| Group      | Rows | Replayed equal | Source and configuration                                                                                                           |
| ---------- | ---- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `corpus`   | 16   | 16             | the 8 `tests/core/{node_size,label_placement}` models of elk-models `ac5af2ba`, as written; each `raw` and `sized`                 |
| `curated`  | 70   | 70             | the 31 `test/corpus/elkt-curated` models and the 4 vendored `tickets/core` models, as written; each `raw` and `sized`              |
| `variants` | 4    | 4              | `port_labels/variants.elkt` with `PORT_SIDE` on every port: `west`, `east` (the upstream providers) plus `north`, `south` (below)  |
| `sweep`    | 236  | 236            | synthetic node, 11 factors covered pairwise (`Random(6101)`); rows 233-235 each add one rejected placement and expect an exception |

- 23 rows expect an exception and the port throws it with the Java class name and message: 20 `IllegalArgumentException`
  ("Label and node size calculator can only be used with ports that have port sides assigned.": 10 models whose
  `.elkt` ports declare no `port.side`, `raw` and `sized` each) and 3 `UnsupportedConfigurationException` ("Invalid
  port label placement: [OUTSIDE, INSIDE]", "… [OUTSIDE, INSIDE, ALWAYS_SAME_SIDE, SPACE_EFFICIENT]", "Invalid node
  label placement: [H_CENTER, INSIDE, OUTSIDE]"; the sets print in enum-ordinal order).
- **Label sizes (NS4).** The JUnit framework sizes labels with AWT font metrics (`TestConfiguration.computeLabelSize`),
  which depend on the platform, so they cannot serve as an oracle. In `sized` rows every label with text and a 0×0
  size gets `width = 6.5 * text.length()` (UTF-16 code units) and `height = 13.0`; explicit sizes are kept. `raw` rows
  keep the sizes as written, so both the empty-label and the sized paths are recorded.
- **`variants` NORTH and SOUTH.** `PortLabelPlacementVariantsTest` only activates the WEST and EAST providers upstream
  (the other two are commented out). The oracle records all four; the NORTH and SOUTH rows complete without an
  exception and replay exactly, so the port covers configurations the upstream test does not run.
- Landed vectors, goldens and corpus are unchanged: `git diff --name-status main -- test/golden/refs/ test/corpus/
test/golden/inputs/` shows only the added `refs/java/node-micro-layout.json`.

**Known divergences found.** None numeric. The differences below are open by design.

- **Exception class where Java dereferences null.** `LabelCell.setHorizontalAlignment/setVerticalAlignment(null)`:
  `TypeError` with the Java `Objects.requireNonNull` message (T2). Fields Java leaves null until the algorithm sets
  them (`NodeContext.insideNodeLabelContainer`, `insidePortLabelCells.get(side)`, `PortContext.portLabelCell`) are
  non-null-asserted; calling a calculator before its cells exist throws `TypeError` where Java throws NPE (T3-T5). A
  `LabelCell` built from `NodeLabelLocation.UNDEFINED` would NPE in Java's `switch(null)` and leaves the coordinate at 0
  here; unreachable, because `NodeLabelCellCreator.java:80` returns first (T2). Each site is unreachable from
  `NodeMicroLayout`.
- **Omitted `assert` sites (NS5).** `NodeContext.java:277`, `HorizontalPortPlacementSizeCalculator.java:212` and
  `PortLabelPlacementCalculator.java:208` are comments naming the line, following the `KVector.ts` precedent; the oracle
  runs without `-ea`, so they never fire there either. No dev-assert helper exists.
- **Prose typos corrected:** none found in this mission.

### Upstream quirks kept (mission 6b) {#alg-common-nodespacing-quirks}

Each is read from the Java, reproduced, and pinned by a unit test and the oracle replay; all are "kept: upstream
behaviour".

- `NodeMicroLayout` throws `IllegalArgumentException` on any port without a side (`PortContextCreator.java:50`), so
  `.elkt` models that leave sides unassigned (layered normally assigns them) are recorded and replayed as throws (T1,
  T3).
- `NodeContext.portContexts` is a `TreeMultimap` whose value comparator reads only `getVolatileId()`
  (`NodeContext.java:257-282`): two contexts on one side with equal ids collapse to one. `PortContextCreator` assigns
  unique ids `0..n-1`, so the collapse is reachable only by inserting contexts directly (T3).
- `GridContainerCell.applyWidthToColumn` (non-tabular) loops over all rows, so the END row pass overwrites every
  column's x and width; tabular mode shares one `colWidths` array across its three row passes and adds the gaps into it
  each time (T2).
- `ContainerCell.minWidthOfCell`/`minHeightOfCell` return 0 for an `AtomicCell` with zero content size even when its
  padding is non-zero, while `StripContainerCell`'s cross-axis minimum counts the padding (T2, T6).
- `CellSystemConfigurator.java:118-119` sets `nodeContainerMiddleRow.setContributesToMinimumHeight(true)` twice and
  never the width flag; with `MINIMUM_SIZE` plus `MINIMUM_SIZE_ACCOUNTS_FOR_PADDING` alone the node width comes out 0
  (T6).
- With `OUTSIDE_NODE_LABELS_OVERHANG`, the outside label containers stop contributing on both axes, so N/S containers
  have height 0 and E/W containers width 0 and the labels are laid out in zero-size containers (T6).
- `setupPortMargins` treats a side with exactly 2 ports as space-efficient
  (`HorizontalPortPlacementSizeCalculator.java:276-277`) and also zeroes the first port's inner margin when its labels
  are not next to it (`:305`) (T4).
- One free, non-overhanging port whose space is too small falls back to CENTER and divides by `size() - 1 = 0`; the
  resulting −Infinity spacing is never read for a single port (`PortPlacementCalculator.java:110-209`) (T4).
- `constrainedOutsidePortLabelPlacement` calls `withGap(portLabelSpacingVertical, portLabelSpacingHorizontal)`, swapped
  relative to the inside variant (`PortLabelPlacementCalculator.java:459` vs `:250`) (T5).
- In simple outside placement a port without labels is skipped before `placeFirstPortDifferently` is reset
  (`:371-374`, `:437`), so the flag carries over to the next labelled port (T5).
- `ElkNodeAdapter.getOutgoingEdges/getIncomingEdges` include edges attached to the node's ports
  (`ElkGraphAdapters.java:303-311`), so `NodeMarginCalculator` processes a port edge's head/tail label twice: once
  relative to the port, once as a node edge (T5).
- `JsonExporter` writes a label `id` only when it is non-empty, so unnamed labels round-trip with a null identifier;
  the vectors record `null` and the replay compares it exactly (T1, T7).

## Temporary gaps

Known differences from the Java after mission 3 (core metadata), each with the mission that closes
it. Generator background: [melk-codegen](architecture/melk-codegen.md).

**Held-back registrations (C1).** Their providers are not ported, so the generator skips them;
the registry check subtracts them (`test/melk/held-back.ts`).

- Algorithm `org.eclipse.elk.fixed` (`FixedLayouterOptions`): closed by mission 5.
- Algorithm `org.eclipse.elk.box` (`BoxLayouterOptions`): closed by mission 5.
- Algorithm `org.eclipse.elk.random` (`RandomLayouterOptions`): closed by mission 5.
- Dependency `topdown.sizeCategories` requires `sizeApproximator == FIXED_INTEGER_RATIO_BOXES`
  (`Core.melk:920`): closed by mission 5.
- Derived backup category `""`/`"Other"` that `Registry.applyDependencies` creates for the three
  category-less algorithms: absent from the TS service, closed by mission 5.

**Deferred JUnit cases (C10).** Ported unchanged once the algorithms above are registered.

- `LayoutDataContentAssistTest.Other.testAlgorithmSpecificKnown`: closed by mission 5.
- `LayoutDataContentAssistTest.Other.testAlgorithmSpecificUnknown`: closed by mission 5.

**Deferred graph.json JUnit cases (J6).** `transferLayout` is covered meanwhile by the JVM replay
`test/graph-json/transfer-replay.test.ts` (13 cases); 31 of the 36 upstream methods are ported.

- `EdgeCoordsTest` (whole file, one method): needs the layered algorithm; closed by mission 7h.
- `IndividualSpacingsTest.importIndividualSpacingsTest`: needs layered; closed by mission 7h.
- `SectionsTest.preserveSectionIdsTest`: needs the `random` algorithm; closed by mission 5.
- `TransferLayoutTest.transferLayoutEdgeSectionExistsTest`: needs the `random` algorithm; closed by
  mission 5.
- `LayoutOptionsTest.exportLayoutOptions`: layered's `priority.direction` (`Layered.melk:732`) makes
  the suffix `direction` ambiguous on the JVM, so `getShortOptionKey` writes `elk.direction`; the
  CoreOptions-only port (J10) writes `direction`; closed by mission 7h.
- Converter rows for the algorithms `fixed`, `box`, `random` and the `""`/"Other" category
  (`MISSION5_PROVIDERS`; `CoreOptions.ts` withholds them): closed by mission 5.
- Parse inputs strip `layering.layerId` and `crossingMinimization.positionId` (J7 amendment,
  `STRIP_KEYS`): closed by mission 7h. `resolvedAlgorithm` is stripped permanently (see the quirks).

**Deferred graph.text cases (G3).** The sweep and the validator vectors skip what needs the algorithms
above.

- `ElkGraphValidator` rows tagged `mission5` (11 vector rows) and 4 sweep models naming `fixed`/`box`:
  `MISSION5_ALGORITHMS` filter; closed by mission 5, which also regenerates the core-registry refs.
- Layered options (for example `priority.direction`) are unknown properties in the CoreOptions-only
  registry; `.elkt` refs regenerate in missions 5 and 7.

**Behavioural divergences.**

- `GraphIssue.hashCode` uses a WeakMap-and-counter identity hash, not the JVM's `identityHashCode`
  (T5): values differ from the JVM, equal issues still hash equal; open.
- `IElkProgressMonitor.getDebugFolder()` returns `string | null` for `java.nio.file.Path` (C8): open
  by design.
- `BoxedComparable.toString` prints a `Double` bound `0.0` as `0` (T8): fix when
  `LayoutOptionValidator` is ported (its only `toString` consumer); open.
- Service collection getters (`getAlgorithmData()`, `getOptionData()` and kin) return snapshot arrays, not live
  unmodifiable views (T14): open.
- `LayoutMetaDataService.getKnownOptionIds()` returns a snapshot `Set` in `JavaHashMap` key order,
  not a live `keySet()` view (T10): open.
- Identity-hash order (AD-10): `ok-sections-linked` section 44 `outgoingSections` is filled by the
  JVM from a `HashMultimap` of identity-hashed `ElkEdgeSection` (`JsonImporter.xtend:313-314`) and
  varies between runs; the port uses insertion order and the vectors record the id lists sorted.
- JDK helpful-NPE messages embed compiled local names, so NPE vector rows compare by class only
  (`TypeError`, D10).
- Unknown export endpoint (user decision 2026-10-14): the exporter calls `formatError(...)` without
  `throw` (`JsonExporter.xtend:183,196`), so an edge endpoint outside the exported graph reaches
  `toJson(null)`. The oracle (Gson 2.11) throws a message-less `NullPointerException` from
  `JsonPrimitive(null)`; the port throws a message-less `IllegalArgumentException`, what Gson 2.8.x's
  `JsonPrimitive(null)` threw. 48 export rows (3 fixture/mod sets x 16 flag sets, `foreignTarget`
  and `foreignSource`) record the NPE and are expected to throw the IAE (`UNKNOWN_ENDPOINT_IAE` in
  `ElkGraphJson.test.ts`, `JsonExporter.test.ts`); the `gson.json` rows of `JsonPrimitive` keep the
  2.11 NPE.
  The same mapping covers the `.elkj` export of an unresolved proxy reference (mission 4c, D13; section 8).

- Gson subset gaps: writer rows with `Long`/`Float`/`Short`/`Byte`/`BigDecimal`/`BigInteger`
  numbers are not modelled (graph.json never builds them); `JsonWriter` writes parsed-number text
  without the validation `JsonPrimitive.toString` applies; `JsonReader` misuse-error texts are
  unrecorded.

**Upstream quirks of `graph.json` (J5).** Each is vector-proven on the JVM and reproduced; all are
"kept: upstream behaviour". Detail: [elk-json.md](architecture/elk-json.md).

- A missing section or bend-point coordinate is a null-unboxing NPE; a missing shape coordinate is
  0; kept: upstream behaviour.
- Duplicate ids overwrite earlier map entries; kept: upstream behaviour.
- `HashBiMap` rejects equal JSON node objects (`{"id":3}` equals `{"id":3.0}`) with
  `IllegalArgumentException` "value already present"; kept: upstream behaviour.
- Exporting an imported graph with linked sections throws an NPE whenever sections are exported
  (`incomingSections +=` back-links a not-yet-registered section); `omitLayout` succeeds; kept:
  upstream behaviour.
- A lenient trailing comma in an array yields a null element, then `IllegalStateException` "Not a
  JSON Object: null"; kept: upstream behaviour.
- `transferLayout` only adds keys (stale keys stay); `sections` is removed and re-added, so it moves
  to the end; a layout-created label throws an NPE; a layout-created section that is linked raises
  `implementationError` ("Severe implementation error in the Json to ElkGraph importer."); kept:
  upstream behaviour.
- An input containing `resolvedAlgorithm` (any layout export) fails on import with
  `IllegalStateException` "IDataType class expected for layout option
  org.eclipse.elk.resolvedAlgorithm"; kept: upstream behaviour.
