<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Oracle retarget, variants, timeout, throw details

**Agent:** java-architect · **Commit:** `feat(oracle): add retarget, variants, and per-case timeout`

## Context
T3 gave the oracle `.elkt` input and id-keyed case files. The sweep (T8) needs to run any model
under any algorithm (D2) and variant (D6), bound each case's time (OR-2), and compare thrown
exceptions (D4). ELK resolves `elk.algorithm` per node; unset nodes fall back to layered
(`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutAlgorithmResolver.java:47-75`).

## Task
Extend the case file and harness with `algorithm`, `variant`, a timeout, normalized exception
details, and an algorithm listing; create the variants file.

## Write-set
`tools/oracle/harness/ElkOracle.java`, new `tools/oracle/harness/*.java` helpers,
`tools/oracle/run.sh`, `tools/oracle/README.md`, `test/corpus/variants.json`.

## Read-set
- `../decisions.md#d2--retarget`, `#d4--verdicts`, `#d6--variants`, `#or-2--timeout`
- `../batch-1/T3-oracle-elkt-casefile.md#interface-contract-output-consumed-by-t4-t5-t8`
- `tools/oracle/harness/` (as left by T3) · `tools/oracle/run.sh`
- `LayoutMetaDataService.getAlgorithmData()` / `getOptionDataBySuffix()` / `LayoutOptionData.parseValue()`
  in `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/`

## Interface contract (extends T3; consumed by T6, T7, T8)
- Case line gains `"algorithm"?: string` (full id) and `"variant"?: string` (key in variants.json).
- Result `status` gains `"timeout"`.
- `run.sh --list-algorithms` prints a JSON array of every registered algorithm id, sorted.
- `test/corpus/variants.json`: `{ [name: string]: { [optionId: string]: string | number | boolean } }`
  with exactly the D6 names; `"default": {}`.
- `exception.message` has every `@[0-9a-f]+` token replaced by `@<hash>`; `exception.class` is
  the fully qualified class name.

## Specification
- Order inside one case: parse → apply variant overlay at the root → apply retarget (every node
  with children gets the algorithm; root gets `org.eclipse.elk.randomSeed = 1`) → layout.
  Retarget wins over a variant that sets the algorithm (none in D6 does).
- Timeout: `ELK_SWEEP_TIMEOUT_MS` (default 30000) read by `run.sh` and passed as a system
  property. A case past the limit emits `timeout`; the JVM exits with a dedicated exit code;
  `run.sh` restarts a new JVM on the cases with no result line yet. Results stay one per case.
- An unknown `variant` or `algorithm` is `oracle-error` for that case, not a crash.

## Acceptance criteria
- Given `run.sh --list-algorithms`, then the array includes `org.eclipse.elk.layered`,
  `org.eclipse.elk.mrtree`, `org.eclipse.elk.radial`, `org.eclipse.elk.force`, and is sorted.
- Given a two-level hierarchical model and `algorithm: org.eclipse.elk.mrtree`, then the parse-mode
  output of the retargeted graph (add a debug flag or helper test) shows the algorithm on every
  node with children and `randomSeed` 1 on the root.
- Given `ELK_SWEEP_TIMEOUT_MS=1` and three cases, then each gets exactly one result line
  (`timeout` or `ok`) and the run exits 0.
- Given a case whose layout throws, then `exception.class` is fully qualified and no `@` followed
  by hex digits survives in `exception.message`.
- Given the four goldens, when `regen-goldens.sh` runs, then `git diff --exit-code test/golden/refs`
  is clean.

## Quality bar
README gates plus oracle gates; `shellcheck` clean; bash 3.2 compatible.

## Observability
Result lines carry `ms` and `status`; a restarted JVM prints one stderr line naming the case
that timed out.

## Rollback
Reversible — revert the commit.

## Boundaries
No generate mode (T6). No manifest or `regen-goldens.sh` changes (T7).
