<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformance: what "match" means

@knowvah/elk-engine is validated against upstream Eclipse ELK (Java) built from
source. A TypeScript layout is **conformant** with the oracle when, after both
are parsed as ELK JSON, the structure and every non-numeric value are exactly
equal and every finite number agrees within an absolute tolerance of `1e-6`.
The comparator is [`test/golden/compare-json.ts`](../test/golden/compare-json.ts);
this document describes what it implements. Port rules live in
[`docs/translation-rules.md`](translation-rules.md).

| # | Section | Answers |
|---|---------|---------|
| 1 | [Oracle](#1-oracle) | What is "correct", and at which commit? |
| 1a | [Conformance unit](#1a-conformance-unit) | What is one case, and which cases exist? |
| 2 | [Conformance bar](#2-conformance-bar) | What counts as equal? |
| 3 | [Goldens and corpus](#3-goldens-and-corpus) | Where do reference outputs come from? |
| 4 | [Seam patches](#4-seam-patches) | How do we change the oracle? |
| 5 | [Oracle operations](#5-oracle-operations-runbook) | What do I do when it breaks? |
| 6 | [Gates](#6-gates) | What must pass before a change lands? |

## 1. Oracle

The oracle (AD-3) is upstream ELK **built from source** in a detached git
worktree of `$ELK_SOURCE_DIR`, created at `$ELK_ORACLE_DIR` by
`tools/oracle/build.sh`. Both are outside this repository; neither is vendored.

| Item | Where |
|------|-------|
| Pinned ELK commit | `tools/oracle/ELK_COMMIT` (currently `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`) |
| Patch series | `tools/oracle/patches/*.patch`, applied in lexical order with `git am --3way` |
| Build | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho downloads p2 artifacts) |
| Batch runner | `tools/oracle/run.sh <outDir> <input>...` or `run.sh --cases <cases.jsonl> <outDir>` |
| Harness | `tools/oracle/harness/ElkOracle.java` |
| Build manifest | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patches, JDK, jar per bundle) |

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

| Patch | Effect | Paired TS seam |
|-------|--------|----------------|
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` resolves id collisions with `"_g" + Random.nextInt(1000000)`; the patch seeds that `Random` from the system property `org.eclipse.elk.graph.json.exportSeed` (unset = ELK behavior). `run.sh` passes `EXPORT_SEED=1` | Injectable `Random` in the `graph.json` port; pending that port (the TS `Random` shim already reproduces the stream: seed 1 gives 548985, 764588) |

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

| Tier | Algorithm | Models | Variants |
|------|-----------|--------|----------|
| native | the model's own `rootAlgorithm` | every census model | all seven |
| retarget | every listed algorithm except the model's own | every census model | `default` only (OR-1) |
| generated | the algorithm named by the file prefix | `test/corpus/generated/*.json` | all seven |
| ported JUnit | per algorithm mission | upstream JUnit cases (AD-13) | as ported |

`tools/oracle/run.sh --list-algorithms` is the list of algorithm ids (14 today).

**Retarget (D2).** The harness sets `org.eclipse.elk.algorithm` on **every node that has
children**, replacing any declared value, and `org.eclipse.elk.randomSeed = 1` on the root. ELK
resolves the algorithm per node, and an unset node falls back to layered. A root without
children gets only the seed. The retarget tier skips each model's own `rootAlgorithm` (the
native tier covers it).

## 2. Conformance bar

AD-4, exactly as `compareLayout(expected, actual, { tol })` implements it:

| Rule | Behavior |
|------|----------|
| Tolerance | Absolute, `DEFAULT_TOLERANCE = 1e-6`; finite numbers pass when `abs(e - a) <= tol` |
| Non-finite numbers | `NaN` and `±Infinity` must be exactly equal (`Object.is` or `===`), even with `tol: Infinity` |
| Strings, booleans, `null` | Strictly equal, else `value` |
| Kind mismatch | Different JSON kinds (`null`, array, object, number, string, boolean) give one `type` diff |
| Object keys | Key set must be identical: a key only in expected is `missing`, only in actual is `extra` |
| Arrays | Matched **by `id`** when every element on both sides is an object with a string `id` and ids are unique per side (an empty array counts as keyed); otherwise **positionally** |
| Keyed arrays | An id on one side only is a `structure` diff at `path[id=<id>]`; order is ignored |
| Positional arrays | A length difference is one `structure` diff and elements are not compared further |
| Diff kinds | `structure`, `value`, `type`, `missing`, `extra`; `path` is JSON-path-like (`children[id=n1].x`) |

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
- **Time-seeded `Random`.** With `randomSeed = 0` ELK seeds from the clock
  (`core/Core.melk:608`), so output is not reproducible. Golden inputs must
  leave the seed unset or non-zero (layered default seed is `1`).

Concrete entries (add one only with the user's approval):

| # | Divergence | Cause | Scope | Approved |
|---|------------|-------|-------|----------|
| 1 | Parse-error message text | ANTLR messages are artifacts of the generated parser, which is never ported | Invalid grammar input (`.elkt`, `.elkj`, `.elkr`): only the *presence* of a parse failure must match, not the message. Valid input must match exactly | D8, user, 2026-10-11 |

**Verdicts.** Each case gets one verdict from two separate JVM runs of the oracle (D4, D5, OR-2):

| Verdict | Meaning |
|---------|---------|
| `ok` | Both runs laid out the model and the output files are byte-identical |
| `throws` | Both runs threw the same exception: exact class, and exact message after `@[0-9a-f]+` becomes `@<hash>` (the message may be null, e.g. `StackOverflowError`) |
| `nondeterministic` | The runs disagree (output bytes, exception, or one `ok` and one `throws`) |
| `oracle-error` | Harness fault (unreadable input, unknown variant/algorithm/option, lost result line); never acceptable |
| `timeout` | A run exceeded `ELK_SWEEP_TIMEOUT_MS` |

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

| Item | Where |
|------|-------|
| Pinned corpus | `eclipse-elk/elk-models` at the `commit` in `test/corpus/manifest.json` (not vendored) |
| Models directory | `$ELK_MODELS_DIR`, default `../../eclipse-elk/elk-models` relative to this repo |
| Curated set | `golden[]` in `test/corpus/manifest.json`: `{ id, path, note }` |
| Refs | `test/golden/refs/elk/<id>.json`, one per manifest `id` |
| Provenance | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

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

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Tycho build fails (p2 unreachable, JDK, Maven version) | `tools/oracle/build.sh` exits non-zero; full Maven output in `.oracle-build.log` at the repo root. Exit `1` is a missing tool or wrong Maven; exit `3` means a bundle jar was not produced | Maven must be **3.9.x**: Tycho 4.0.12 fails on Maven 3.10 (Homebrew's 3.10.0) with `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. A local 3.9.11 lives at `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Use JDK 21, or JDK 17 via `JAVA_HOME`. Check network (first run downloads p2 artifacts), then rerun. `build.sh --record-only` skips Maven and only rewrites `oracle-build.json` from jars already built. Exit `2`: remove the worktree (section 4 step 4) and rebuild. Otherwise escalate with the log tail |
| `build.sh` exits `2` right after applying a patch | Worktree reported stale | `build.sh` unfolds wrapped patch subjects (`git format-patch` folds those over about 78 chars) and ignores the untracked `census/` and `sweep/` caches; other dirt or an unlisted patch still gives exit `2`: fix the worktree (section 4) |
| Golden drift after a patch or commit bump | `tools/oracle/regen-goldens.sh` followed by `git diff --exit-code test/golden/refs` is non-empty; `test/golden/oracle-refs.test.ts` fails on a stale `_meta.json` (`elkCommit`, `modelsCommit`); a TS conformance test, once present, fails with a `formatDiffs` report | Rebuild (`build.sh`), run `regen-goldens.sh`, review the diff, journal the patch id. Never hand-edit a ref or loosen `tol` |
| Xtext/ANTLR jar missing from the p2 cache (`.elkt`, `.elkr`, or any `run.sh` start) | `run.sh` exits non-zero with `bundle <name> not in p2 cache <dir>` (e.g. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`) | Set `P2_BUNDLES` to the Tycho p2 cache that holds it, or run `build.sh` with network access so Tycho fetches it; rerun `run.sh`. Do not substitute jars from elsewhere |
| Sweep hang or OOM | A case runs to the timeout and reports `timeout` (a stderr line names it); a run with no result line gives `oracle-error` and `sweep: shard <n> run <A or B> exited <code>` on stderr; the machine swaps under 8 concurrent JVMs | Lower concurrency and batch size: `sweep.sh --shards 2`, narrow with `--filter` or `--limit`. Raise `ELK_SWEEP_TIMEOUT_MS` only for a model that is slow but correct. A reproducible `timeout` is a finding: journal the case id, do not widen the limit to hide it |
| Census drift after a pin bump (`ELK_COMMIT` or models `commit`) | `npx tsx tools/corpus/census.ts` exits `1` and lists the differing models; `test/corpus/census.test.ts` fails | Confirm the clone and oracle are at the new pins, rerun `census.ts --write`, review `git diff test/corpus/census.json`, journal the cause, then rerun `sweep.sh` and regenerate the parity report. Never hand-edit the census |
| elk-models missing or wrong sha | Corpus tests skip with a message naming the expected sha; `regen-goldens.sh` exits `1` (`elk-models at <sha>, expected pinned <sha>`) | Run `test/corpus/fetch.sh` (clones and checks out the pinned commit). It exits `2` if an existing clone is at another commit and does not touch it: fix that clone yourself or point `ELK_MODELS_DIR` at a fresh path. Never move an existing clone's HEAD from a script |

Other `run.sh` failures: `oracle-build.json missing` or `oracle jar missing`
means run `build.sh` first; `bundle <name> not in p2 cache` means set
`P2_BUNDLES` to the Tycho p2 cache or rerun `build.sh` with network access.

## 6. Gates

Every change:

| Gate | Command | Bar |
|------|---------|-----|
| Types | `npm run typecheck` | exit 0 |
| Tests and coverage | `npm run coverage` | all tests pass; 90% statements, branches, functions, and lines over `src/**` |
| Architecture | `test/architecture/*.fitness.test.ts` (run by `npm test`) | module boundaries, module globals, no Node builtins in `src/`, SPDX headers |
| Oracle refs | `test/golden/oracle-refs.test.ts` | committed refs consistent with manifest and `ELK_COMMIT` |

Changes to `tools/oracle/`, the manifest, or the patch series also need:

| Gate | Command | Bar |
|------|---------|-----|
| Oracle build | `tools/oracle/build.sh` | exit 0 |
| Oracle run | `tools/oracle/run.sh <outDir> <input.json>...` | exit 0, no `ERROR` lines |
| Golden stability | `tools/oracle/regen-goldens.sh`, then `git diff --exit-code test/golden/refs` | no diff, unless the change is meant to move refs and is journaled |
| Shell | `shellcheck tools/oracle/*.sh` | clean |

Changes to `tools/oracle/` or `tools/corpus/` also need:

| Gate | Command | Bar |
|------|---------|-----|
| Census | `npx tsx tools/corpus/census.ts` | exit 0 (no drift) |
| Generated stability | `tools/oracle/regen-generated.sh`, then `git diff --exit-code test/corpus/generated` | no diff |
| Sweep | `tools/oracle/sweep.sh` (or `--filter`/`--limit` for a sample) | exit 0: no `oracle-error` |
| Parity report | `npx tsx tools/corpus/parity-report.ts` | exit 0 (committed report current); regenerate with `--write` |
