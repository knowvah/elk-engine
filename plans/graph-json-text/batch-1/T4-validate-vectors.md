<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Validate vectors

**Agent:** java-architect · **Commit:** `test(T4): record elkj validator issues from the jvm`

## Context
Mirror 4b's `ElktValidateVectors.java` (row keys `id, input, covers, issues, mutations`; issues sorted by line,
severity, code, message). `ElkGraphJsonValidator.xtend` is an empty template, so `validate` reports what the Xtext
pipeline adds: syntax, linking (lazy, D11), conversion diagnostics and EMF `EObjectValidator` constraints. No
`LayoutOptionValidator` checks run for `.elkj` (unlike `.elkt`) — the rows must show that.

## Task
1. `ElkjValidateVectors.java` over `tools/vectors/elkj-validate-scenarios/*.elkj`, each file carrying a
   `// @covers` directive as 4b's (JSON allows comments here because the grammar's Terminals include them).
2. Scenarios: an invalid option value and an unknown option (expect no validator issue, as recorded), unresolved and
   ambiguous references, duplicate identifiers, conversion errors, syntax errors (presence only), and an edge whose
   source is a label (type mismatch through scoping).
3. Record `issues` and `mutations` exactly as 4b (`mutations` should be `[]`; journal if not).

## Write-set
`tools/vectors/ElkjValidateVectors.java`, `tools/vectors/elkj-validate-scenarios/**`,
`test/golden/refs/java/graph-json-text-validate.json`.

## Read-set
`tools/vectors/ElktValidateVectors.java`, `validation/ElkGraphJsonValidator.xtend` (upstream),
`src-gen/.../validation/AbstractElkGraphJsonValidator.java`, `decisions.md#d11`.

## Interface contracts (outputs)
`graph-json-text-validate.json` = `{elkCommit, xtextVersion, registry:"core", cases:[{id, input, covers, issues,
mutations}]}`. Consumed by T14.

## Acceptance criteria
- Given an invalid option value, when validated, then the recorded issues match the JVM (expected: none from the
  empty validator) and the row says which pipeline stage reported anything.
- Given an unresolved reference, when validated, then the linking diagnostic appears with its line and code.
- Given the recorder run twice, when compared, then the outputs are byte-identical.

## Observability / Rollback
N/A — tooling only. Reversible: revert the commit.
