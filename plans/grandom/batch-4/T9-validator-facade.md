<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `GRandomValidator` and the `GRandomText` facade

**Agent:** typescript-pro · **Commit:** `feat(T9): add the grandom validator and text facade`

## Context
D6. `GRandomValidator.xtend` (49 lines) holds a static list of three (predicate, (message, feature)) pairs and one
`@Check optionsRestrictions(Configuration)` that calls `error(message, feature)` for each matching pair, in list
order. Precedent: `src/graph/json/text/validation/` and `ElkGraphJsonText.validate` on
`src/xtext/validation/AbstractDeclarativeValidator.ts`. Xtend `Pair.of` / lambdas per translation-rules §8.

## Task
1. `validation/GRandomValidator.ts`: the `ERRORS` list (messages verbatim: `"maxDegree only defined on trees."`,
   `"maxWidth only defined on trees."`, `"Partition Fraction only defined on bipartite graphs."`) and the check, wired
   the way the 4c validator is (check registration, `CheckMode`).
2. `GRandomText.ts`: `parse(text)` (T8's result) and `validate(text)` (syntax + conversion + check issues in Xtext's
   `ResourceValidatorImpl` order), mirroring `ElkGraphJsonText`'s `load`/`validate` shapes. Not exported from
   `src/index.ts`.
3. Tests: replay every `grandom-validate.json` row (exact for check and conversion issues: severity, code, message,
   line, offset, length, feature; syntax issues by presence); facade unit tests for parse/validate on the corpus
   inputs (no issues).

## Write-set
`src/core/debug/grandom/validation/GRandomValidator.ts` (+ test), `src/core/debug/grandom/GRandomText.ts` (+ tests).

## Read-set
`GRandomValidator.xtend`, `xtend-gen/.../GRandomValidator.java`, `src/xtext/validation/*.ts`,
`src/graph/json/text/ElkGraphJsonText.ts` (facade shape), `src/graph/json/text/validation/`, T8's parser API.

## Interface contracts (outputs)
`GRandomText.parse(text)`, `GRandomText.validate(text): Issue[]`; consumed by T12–T14 (corpus test) and T15 (docs).

## Acceptance criteria
- Given each validate row, when `GRandomText.validate` runs, then check issues equal the recorded ones exactly and
  syntax issues are present where recorded.
- Given `generate 1 graphs { maxDegree = 2 maxWidth = 3 partitionFraction = 0.5 }`, when validated, then three errors
  in `ERRORS` order with features `mD`, `mW`, `pF` (matching the T2 row that records it).
- Given the nine corpus inputs, when validated, then no issues.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.

## Amendment (2026-10-22, option A, see decision-journal)

Write-set extended with `src/core/debug/grandom/parser/{GRandomParser,GRandomParserElements}.ts` (+ tests) for
recording positions. The validator is a plain class (no `AbstractDeclarativeValidator`); `validate` reproduces the
`ResourceValidatorImpl` order itself.
