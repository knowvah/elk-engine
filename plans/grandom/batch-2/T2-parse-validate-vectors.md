<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Parse and validate recorders

**Agent:** java-architect · **Commit:** `test(T2): record grandom parse and validate vectors`

## Context
`elkr-vectors.sh` (T1) runs every `Elkr*Vectors.java`. 4b precedent: `ElktParseVectors.java`,
`ElktValidateVectors.java` and their scenario dirs. The grammar has no cross-references, so there is no linking
stage. `GRandomValidator` has exactly three `@Check` errors on `Configuration`: `maxDegree` / `maxWidth` on a
non-`trees` form (`CONFIGURATION__MD` / `__MW`), `partitionFraction` on a non-`bipartite graphs` form
(`CONFIGURATION__PF`).

## Task
1. `ElkrParseVectors.java` over `elkr-parse-scenarios/*.elkr` (sorted) → `grandom-parse.json`. Row:
   `{id, input, syntaxErrors: [{message, line, offset, length}], conversionErrors: [...], model}` where `model` is a
   generic EMF dump of the `RandGraph` (class name, every feature in `eAllStructuralFeatures` order, value or `null`,
   and `isSet` for each unsettable feature; enums by literal; doubles as Java `Double.toString`). Rows with syntax
   errors keep `model` (presence-only on the TS side, D2) but record it anyway.
2. `ElkrValidateVectors.java` over `elkr-validate-scenarios/*.elkr` → `grandom-validate.json`. Row:
   `{id, input, issues: [{severity, code, message, line, offset, length, feature}]}` from the resource validator
   (`CheckMode.ALL`), syntax issues included.
3. Parse scenarios cover: every rule; every alternative of `DoubleQuantity` (`quant`, `min to max`, `mean +/- stddv`);
   every `Form`, `Side`, `FlowType`, `ConstraintType`, `Formats` literal; each unordered group in several member
   orders (including all members and none); repeated `Flow`s; optional `{ }` blocks present, empty and absent;
   `Integer` given `2.5` (conversion error) and `Double` given `2`; `filename` strings with escapes; several
   configurations in one file; `generate 0`; comments everywhere; and syntax errors (duplicate unordered member,
   missing `=`, unknown keyword, unterminated block).
4. Validate scenarios: each of the three conditions both triggered and not (e.g. `maxDegree` on `trees` vs on
   `graphs`), all three at once, plus one syntax-error file.
5. Run `tools/vectors/elkr-vectors.sh test/golden/refs/java`.

## Write-set
`tools/vectors/{ElkrParseVectors,ElkrValidateVectors}.java`, `tools/vectors/elkr-{parse,validate}-scenarios/**`,
`test/golden/refs/java/grandom-{parse,validate}.json`.

## Read-set
`tools/vectors/{ElktParseVectors,ElktValidateVectors}.java`, `GRandom.xtext`, `GRandomValidator.xtend`,
`model/generated/GRandom.ecore` (features, unsettable flags, defaults), T1's script.

## Interface contracts (outputs)
`grandom-parse.json` (consumed by T5's model shape check, T8), `grandom-validate.json` (consumed by T9).

## Acceptance criteria
- Given two script runs, when compared, then both files are byte-identical.
- Given the parse rows, when counted, then every `Form`/`Side`/`FlowType`/`ConstraintType`/`Formats` literal and
  every `DoubleQuantity` alternative appears in at least one error-free row.
- Given the validate rows, when filtered by message, then each of the three validator messages appears with its
  feature (`mD`, `mW`, `pF`) and at least one row has none of them.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
