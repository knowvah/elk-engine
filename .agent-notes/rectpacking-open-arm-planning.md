<!-- SPDX-License-Identifier: EPL-2.0 -->

# rectpacking-open-arm: planning observations (issue #81)

## Observation: an open-arm finding can go stale when the pin moves

- **Context**: planning #81, which 8c measured at `8aaa3c14`.
- **Finding**: the pin is now `8bca22f4`, which carries eclipse-elk/elk#1239 (`3f5e4f97`). Before #1239, `placeNextBeside`
  (`Compaction.java:412`) left a moved block's `parentRow` stale. That made `wasFromNextRow` true for blocks already in the current
  row, which were possibly multi-rect, and it is how 8c saw 299 multi-rect `nextBlock`s in 40,000 inputs. At the pin, every site
  that adds a block to a row sets `parentRow` (`:165`, `:324`, `:413`).
- **Impact**: re-check the reachability evidence of an "unreached" or "neither" row at the current pin before searching again.
  An upstream fix can turn an open arm into a dead one.
- **Confidence**: Medium (source read at planning; T1 proves it)

## Observation: a one-rect block's height never exceeds its minHeight

- **Context**: reading `Block.placeRectsIn(double, boolean)` for the arm's second operand.
- **Finding**: the wrap test needs `maxHeightInRow > 0` (`Block.java:269`), which is false before the first rect is placed. So one
  rect gives `Math.max(0, h)`, the same expression as `minHeight` (`:188`, `:369`), for every `h`, NaN included.
- **Impact**: the arm needs at least two rects in `nextBlock`. Negative spacing, which other arm rows use, does not help a one-rect
  block.
- **Confidence**: High
