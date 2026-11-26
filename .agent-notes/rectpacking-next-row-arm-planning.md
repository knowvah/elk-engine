<!-- SPDX-License-Identifier: EPL-2.0 -->

# rectpacking-next-row-arm: planning observations (issue #107)

## Observation: the two next-row guards sit only on wasFromNextRow paths

- **Context**: planning #107 from `Compaction.java` at `8bca22f4`.
- **Finding**: `:325` is inside `if (wasFromNextRow)` (`:322`), and `placeBeside`'s only call (`:158`) is inside
  `if (wasFromNextRow)` (`:152`). The list `rows` is written only at `:132`, `:328` and `:419`; `:132` is on the
  empty-`nextBlock` path that ends in `continue` (`:126-137`) before either call. So both guards reduce to invariant **I** of
  `plans/rectpacking-open-arm/evidence.md` § 2 L4 plus "the list is not shortened between `:217` and the call".
- **Impact**: the proof needs no numeric case analysis and must hold for both values of `rowHeightReevaluation`; the #81 proof
  was written for the flag on, so check that **I** itself does not use it.
- **Confidence**: Medium (source read at planning; T1 proves it)
