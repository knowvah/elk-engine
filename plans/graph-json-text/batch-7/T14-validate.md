<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — `ElkGraphJsonValidator` (empty, as upstream) and `ElkGraphJsonText.validate`

**Agent:** typescript-pro · **Commit:** `feat(T14): add elkgraphjsontext.validate on the xtext pipeline`

## Context
`ElkGraphJsonValidator.xtend` is a template with every check commented out; the generated
`AbstractElkGraphJsonValidator` registers the ElkGraph `EPackage`, so `validate` = Xtext's resource validation: the
resource diagnostics (syntax, conversion, linking — including D11's deferred ones) plus `EObjectValidator`
constraints. No `LayoutOptionValidator` checks (the `.elkt` validator's `@Check`s do not exist here). 4b precedent:
`src/graph/text/ElkGraphText.ts` `validate` and `ElkGraphValidator.test.ts` `validateModel` (registrar, composite,
`ResourceValidatorImpl`, sorted issues).

## Task
1. `validation/ElkGraphJsonValidator.ts`: the empty declarative validator class (keeping the upstream file's shape,
   with the commented template noted, not ported), registered like 4b's.
2. `ElkGraphJsonText.validate(root)`: run the pipeline with the load result's resource diagnostics and T12's deferred
   linking diagnostics; issues in the oracle's order and shape.
3. Tests: replay every T4 row (issues exact except syntax by presence, `mutations` `[]` as recorded) through
   `load` + `validate`; a test that an invalid option value yields no validator issue (as recorded).

## Write-set
`src/graph/json/text/validation/**` (+ tests), `src/graph/json/text/ElkGraphJsonText.ts` (+ its test).

## Read-set
Upstream `validation/*.xtend`, `src-gen/.../validation/AbstractElkGraphJsonValidator.java`,
`src/graph/text/ElkGraphText.ts` (validate), `src/graph/text/validation/ElkGraphValidator.test.ts:100-160`,
`src/xtext/validation/**`, T4/T12/T13 contracts.

## Interface contracts (outputs)
`ElkGraphJsonText.validate(root): readonly Issue-like[]` (the 4b `ElkTextIssue` shape). Consumed by T17.

## Acceptance criteria
- Given every T4 row, when loaded and validated, then the issues equal the recorded ones.
- Given a document with an unresolved reference, when validated, then the deferred linking diagnostic appears exactly
  once, at the recorded line and code.
- Given an invalid option value, when validated, then no issue is reported (empty validator, as recorded).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
