<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: rectpacking-next-row-arm (issue #107, 2026-11)

## Observation: ast-grep reads a bare `X.Y` Java pattern as a type name

- **Context**: enumerating every access of `InternalProperties.ROWS` in alg.rectpacking at `8bca22f4` (ast-grep 0.51.3).
- **Finding**: the patterns `InternalProperties.ROWS`, `$A.ROWS` and `foo(InternalProperties.ROWS)` match nothing, while
  `$R.getProperty(InternalProperties.ROWS)` finds `EqualWhitespaceEliminator.java:45`. `--debug-query=pattern` shows the bare
  pattern parsed as `scoped_type_identifier`, so it can only match type names, never a field access.
- **Impact**: enumerate a constant through the calls that take it (`$R.getProperty(K)`, `$R.setProperty(K, $A)`,
  `$R.hasProperty(K)`), plus a text search, and never count a zero from a bare `X.Y` pattern as evidence.
- **Confidence**: High

## Observation: since #1239 the next-row guards of compaction follow from invariant I alone

- **Context**: proving the false arm of `rows.size() > nextRowIndex` dead (`Compaction.java:325`, `:416`).
- **Finding**: both guards run only under `wasFromNextRow`. With invariant **I** of #81, that flag means `getNextBlock` took
  its next-row arm (`:217`, `:219`). The list is never written between there and the guards: `:132` is followed by `continue`,
  and `placeBelow` writes only on its `return true` path. Neither the flag `rowHeightReevaluation` nor any number enters the
  argument. With `CompactionPlacement.ts:176` removed, the two `staleParentRow` inputs reach the arm again, which makes a cheap
  mutant control.
- **Impact**: any later arm that depends on `wasFromNextRow` or on the row list can start from **I** and N2
  (`plans/rectpacking-next-row-arm/evidence.md` § 2). Both arms of `Compaction.java:127` are reached by #81's generator
  (491,141 false with the flag on), so that guard needs no proof.
- **Confidence**: High
