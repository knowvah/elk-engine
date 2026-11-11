<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — `trees` golden set

**Agent:** build-engineer (sonnet) · **Commit:** `test(T4): add the trees golden set` · Scratch: `$TMPDIR/alg-trees/T4/`

## Context

Mission 8a, TR2. `tools/oracle/regen-goldens.sh` has three sets (`default`, `algorithms`, `layered`); all read inputs from
`$ELK_MODELS_DIR`, and the `layered` set exports `-XX:hashCode=2` through `JAVA_TOOL_OPTIONS` (`:25-48`) and records it as
`jvmFlags` in `_meta.json`. No elk-models model uses mrtree, radial or vertiflex (`docs/parity-report.md`). The TS test of these
refs is T18's: it cannot pass before the providers are wired (7h T3 precedent).

## Task

1. Add `--set trees` to `regen-goldens.sh`: manifest `test/golden/trees.json` (same shape as `layered.json`: `id`, `path`,
   `algorithm`, `variant: "default"`, `note`), refs `test/golden/refs/elk-trees/`, inputs read from `test/golden/trees-inputs/`
   in the repository instead of `$ELK_MODELS_DIR`, `-XX:hashCode=2` as for `layered`. Keep the other three sets' behaviour and
   output byte-identical; update the usage header.
2. Write the inputs as ELK JSON under `test/golden/trees-inputs/`, each carrying `org.eclipse.elk.algorithm` and its option set at
   the root (and per-node values where TR2 says so). Enumerate the option sets from `tools/melk/sources/{Tree,Radial,VertiFlex}.melk`
   per TR2: per algorithm `default`, each non-default enum value, each boolean flipped, one non-default value per numeric option;
   mrtree also the four directions and `separateConnectedComponents=false`. Use designed trees large enough to exercise the option
   (a CONSTRAINT input with `positionConstraint` per node; a radial input whose next level spans several parents; a vertiflex input
   with `verticalConstraint` per node). Add the three generated corpus inputs (`test/corpus/generated/{mrtree,radial,vertiflex}-tree-small.json`)
   copied byte-identical, ids `<alg>-generated`. Name ids `<alg>--<option>-<value>`.
3. Run `tools/oracle/regen-goldens.sh --set trees`; run it twice and confirm byte-identical refs. Run the same cases without the
   flag into scratch and journal any differing id (TR2 evidence).
4. Rerun `--set default`, `--set algorithms`, `--set layered`: `git diff --exit-code test/golden/refs/elk test/golden/refs/elk-algorithms test/golden/refs/elk-layered`.

## Write-set

`tools/oracle/regen-goldens.sh`, `test/golden/trees.json`, `test/golden/trees-inputs/**`, `test/golden/refs/elk-trees/**`.

## Read-set

`tools/oracle/regen-goldens.sh`, `test/golden/layered.json`, `tools/oracle/harness/CaseSpec.java` (case fields),
`tools/melk/sources/{Tree,Radial,VertiFlex}.melk`, `docs/conformance.md` § "Generated corpus", `decisions.md` TR2.

## Interface contract (consumed by T18)

`trees.json` entries `{ id, path, algorithm, variant, note }` with `path` relative to `test/golden/trees-inputs/`; one ref
`refs/elk-trees/<id>.json` per entry plus `_meta.json` with `jvmFlags: "-XX:hashCode=2"`.

## Acceptance criteria

- Given `regen-goldens.sh --set trees` run twice, then the refs are byte-identical and `_meta.json` names the oracle stamp and flag.
- Given each algorithm, then `trees.json` has a `default` entry and one entry per TR2 option value (journal the enumeration and count).
- Given the other three sets regenerated, then `git diff --exit-code` over their ref dirs is clean.
- Given an oracle throw for an option set, then the entry is dropped from the set and listed in the journal (a throwing option set
  is a `throws` row in T1–T3, not a golden).

## Observability / Rollback

N/A — no new observable operations. Reversible (an additive set; the landed sets are unchanged).
