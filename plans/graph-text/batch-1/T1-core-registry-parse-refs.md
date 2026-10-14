<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — `ORACLE_REGISTRY=core` oracle mode and ~30 curated `.elkt` parse refs

**Agent:** tooling-engineer · **Commit:** `test(T1): add core-registry oracle mode and elkt parse refs`

## Context
G3: the oracle's default classpath registers every algorithm, so option lookups made by the `.elkt`
property converters (`PropertyKeyValueConverter`, `PropertyValueValueConverter`) and the validator differ
from the CoreOptions-only TS registry (C8). This task adds an opt-in registry mode to the oracle and
records, in that mode, the oracle's `parse` output of ~30 curated elk-models `.elkt` files (G7). T22 /
T18 compare the TS `ElkGraphText.load` + JSON export against these refs in CI; T23's local sweep reuses
the same per-model output format, so the format fixed here is a contract.

## Task
1. **Harness switch.** In `tools/oracle/harness/ElkOracle.java`: read system property
   `elk.oracle.registry` (constant next to `VARIANTS_PROPERTY`, `ElkOracle.java:45-46`; values `core`,
   absent). When it is `core`, `main` calls
   `LayoutMetaDataService.getInstance(new ClassLoader(null) { })` **before**
   `registerMetaDataProviders()` (`ElkOracle.java:72,173-190`) and then **skips**
   `registerMetaDataProviders()`: that method registers every algorithm provider explicitly, so skipping
   it is what keeps the registry core-only. Mechanism: `LayoutMetaDataService.java:74-88` registers
   `new CoreOptions()`, and its ServiceLoader pass over the parentless loader finds nothing (pattern:
   `tools/vectors/MetaDataVectors.java:126-130`). Every later no-arg `getInstance()` (Xtext converters,
   validator) returns that singleton. An unknown property value exits 1 with a usage message. Also add
   flag `--list-options` (prints the sorted JSON array of `LayoutMetaDataService.getOptionData()` ids, same
   style as `listAlgorithms`, `ElkOracle.java:112-119`); it is the parity evidence of step 5.
   Edit only `ElkOracle.java` (add `ElkModelReader.java` to the edit set only if the singleton must be
   established inside `readElkt`, `ElkModelReader.java:47-49`; the singleton must exist before
   `ElkGraphStandaloneSetup.doSetup()`).
2. **`run.sh` switch.** `tools/oracle/run.sh`: env `ORACLE_REGISTRY` (default `default`; accepted `default|core`,
   else `die`). In `oracle_java` (`run.sh:91-97`) append `-Delk.oracle.registry=core` **only** when core;
   the default command line stays textually identical. Document the variable in the header comment.
   Core mode is meant for `parse` cases and `--list-*`; do not add guards for `layout`.
3. **Curated list `test/corpus/elkt-curated.json`:** `{ "models": [ { "id": "<category>/<sub>/<name>",
   "path": "<same>.elkt", "covers": ["<tag>", …] } ] }`, ~30 entries, ids are paths under
   `$ELK_MODELS_DIR` without extension (`/` becomes `__` in the ref file name, `CaseRunner.java:31-33`).
   Selection (record the evidence as `covers` tags and verify by `grep` before choosing; prefer sources
   ≤ 20 KB, total refs ≤ ~1.5 MB). The set must cover: every grammar rule of
   `ElkGraph.xtext:20-120` (root with and without `graph <id>`; node with and without `{}`; label with and
   without `id :`; port; `ShapeLayout` position-only, size-only, both; edge with and without id,
   several sources/targets, with `layout [...]`; `ElkSingleEdgeSection` **and** the `section <id> ->
   <ids> [...]` form, `bends`; qualified edge endpoints `a.b.c`; every `Property` value kind present in the
   corpus); unknown option keys (→ `Property<Object>` + `LayoutOptionProxy`, dropped from the export by
   `omitUnknownLayoutOptions`, `CaseRunner.java:71-78`); single- and double-quoted strings; `//` and `/* */`
   comments; `^`-escaped ids; signed numbers and floats. Hints from a scan of the pinned corpus
   (898 `.elkt`): `section ` keyword in 7 models (e.g. `tickets/layered/905_beginLableBellowEdge`,
   `724_includeChildrenModelOrder`, `476_multiLabelInHorizontalLayout`); `bends` in 2 (`724_…`,
   `701_portLabels`); `^` in 85; single quotes in 53; qualified edge endpoints in 41; `: null`, exponent
   floats and string escapes appear in **zero** models, so they are T2/T3 territory only (list them in
   `_meta.json` under `uncoveredByCorpus`). Run the candidate set through both modes (`ORACLE_REGISTRY`
   unset, then `core`) and include (a) at least 2 models whose export differs between modes (tag
   `registry-diff`; these are among the ~177 G3 models) and (b) every candidate the default oracle cannot
   parse, if any (tag `default-throws`). Record any model the oracle rejects even in core mode with its
   exception (tag `core-throws`): such a model has no ref file, only an `outcomes` entry.
4. **`tools/oracle/regen-elkt-refs.sh`** (structure of `regen-parse-refs.sh`: staging dir + atomic swap,
   scratch cases file, `die`, `shellcheck` clean, `ELK_ORACLE_DIR`/`ELK_MODELS_DIR` honoured, models commit
   checked against `test/corpus/manifest.json` as `regen-goldens.sh` does). For each curated entry write a
   `parse` case (`CaseSpec` shape: `{"id","input":"$MODELS_DIR/<path>","mode":"parse"}`,
   `CaseSpec.java:26-37`), run `ORACLE_REGISTRY=core tools/oracle/run.sh --cases` with `EXPORT_SEED=1`,
   and write `test/golden/refs/elkt-parse/<id with / → __>.json` (pretty export text, the file run.sh
   produced) plus `_meta.json`: `elkCommit`, `patches`, `modelsCommit` (from `manifest.json`), `registry:
   "core"`, `exportSeed`, `jdk`, `generatedBy`, `inputSha256` per model, `outcomes` (per id `{status,
   exception?{class,message}}` from the stdout JSON lines, `CaseResult.java:35-42`),
   `uncoveredByCorpus`, `optionIds` (output of `--list-options`) and `algorithmIds` (`--list-algorithms`).
   No timestamps; refs sorted by id.
5. **Parity check (stop 6 if it fails).** Compare `optionIds` with the TS
   `LayoutMetaDataService.getInstance()` option ids (a throwaway `tsx` one-liner, not committed): the sets
   must be equal; the only expected algorithm difference is `org.eclipse.elk.{fixed,box,random}` (present
   in `algorithmIds`, absent in TS: `src/graph/json/JsonMetaDataConverter.test.ts:30-38`). Journal the
   result in the task report.
6. Run `regen-elkt-refs.sh` twice; byte-identical. Run `regen-goldens.sh`, `regen-parse-refs.sh` and
   `regen-generated.sh`: `git status test/golden/refs` shows nothing outside `elkt-parse/`.

## Write-set
`tools/oracle/run.sh`, `tools/oracle/harness/ElkOracle.java`, `tools/oracle/regen-elkt-refs.sh`,
`test/corpus/elkt-curated.json`, `test/golden/refs/elkt-parse/*.json`,
`test/golden/refs/elkt-parse/_meta.json`. (No colocated test; `test/corpus/` and `test/golden/` are in
`.prettierignore`.)

## Read-set
- `tools/oracle/run.sh:58-97,123-146` (classpath, `oracle_java`, `main`), `tools/oracle/regen-parse-refs.sh`, `tools/oracle/regen-goldens.sh:1-40`
- `tools/oracle/harness/ElkOracle.java:45-131,173-190`, `ElkModelReader.java:44-64`, `CaseSpec.java:26-37`, `CaseRunner.java:30-84`, `CaseResult.java:35-42`
- `../elk/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutMetaDataService.java:60-100`
- `tools/vectors/MetaDataVectors.java:126-130`; `test/corpus/manifest.json`
- `../elk/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraph.xtext:20-120`
- `src/graph/json/JsonMetaDataConverter.test.ts:30-38`

## Decisions
- [G3](../decisions.md#g3--option-registry-for-refs), [G7](../decisions.md#g7--evidence-layout), [G5](../decisions.md#g5--diagnostic-fidelity)
- D3, D8, D10 (`plans/conformance-corpus/decisions.md`); AD-3, AD-5, AD-15

## Interface contract (consumed by T18/T22 tests, T23 sweep)
```json
// run.sh / ElkOracle
ORACLE_REGISTRY=core  ->  -Delk.oracle.registry=core ; ElkOracle --list-options -> ["org.eclipse.elk.…", …]
// test/golden/refs/elkt-parse/_meta.json
{ "elkCommit": "…", "modelsCommit": "ac5af2ba…", "registry": "core", "patches": ["…"], "exportSeed": 1,
  "jdk": "…", "generatedBy": "tools/oracle/regen-elkt-refs.sh", "inputSha256": { "<id>": "…" },
  "outcomes": { "<id>": { "status": "ok" } | { "status": "throws", "exception": { "class": "…", "message": "…" } } },
  "uncoveredByCorpus": ["null-value", "exponent-float", "string-escape"], "optionIds": ["…"], "algorithmIds": ["…"] }
```
`<id>.json` = the pretty ELK JSON export text of the oracle's `parse` mode (flags `CaseRunner.java:71-78`).

## Acceptance criteria
- Given `ORACLE_REGISTRY=core`, when `run.sh --list-algorithms` runs, then it prints the core-only
  registry's algorithms (`fixed`, `box`, `random` only) and `--list-options` equals the TS option-id set.
- Given the default mode, when the three existing regen scripts run, then `git diff test/golden/refs/{elk,elk-parse}`
  and `test/corpus/generated` are empty.
- Given the curated list, then its `covers` tags jointly name every grammar rule, both section forms,
  unknown keys, both quote styles, both comment styles, `^`ids, at least 2 `registry-diff` models.
- Given two runs of `regen-elkt-refs.sh`, then `elkt-parse/` is byte-identical.

## Quality bar
README gates; `shellcheck` clean on both scripts; javac of the harness warning-free as before; the
default-mode `oracle_java` command line is unchanged (diff of `bash -x` output, journal it).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No ELK patches, no other harness file (except the `ElkModelReader.java` clause above), no edits to existing
refs or regen scripts. Agents never commit; the orchestrator commits per task. No OpenJDK/Guava source.
Never edit a ref by hand (AD-5).
