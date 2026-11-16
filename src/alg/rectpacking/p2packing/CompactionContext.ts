// SPDX-License-Identifier: EPL-2.0
import type { BlockStack } from '../util/BlockStack.js';
import type { Block } from '../util/Block.js';
import type { RectRow } from '../util/RectRow.js';

/** What the loop of `compact` does after a step: Java `continue`, `break`, or run on to the next section. */
export type Step = 'continue' | 'break' | 'proceed';
export const CONTINUE: Step = 'continue';
export const BREAK: Step = 'break';
export const PROCEED: Step = 'proceed';

/**
 * The locals and parameters of Java's `Compaction.compact` that its sections share. The Java method is one 140-line body;
 * the repository's function limits force the sections into helpers, and Java's local variables become these fields. The
 * helpers keep their Java names; `ctx` stands for `(rows, row, boundingWidth, nextRowIndex, nodeNodeSpacing,
 * rowHeightReevaluation)`, which Java passes as separate parameters.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compaction.java
 */
export interface CompactContext {
  readonly rows: RectRow[];
  readonly row: RectRow;
  readonly boundingWidth: number;
  readonly nodeNodeSpacing: number;
  readonly rowHeightReevaluation: boolean;
  readonly nextRowIndex: number;
  somethingWasChanged: boolean;
  compactRowAgain: boolean;
  currentStack: BlockStack | null;
  blockId: number;
}

/** `block.getStack()` where Java dereferences it: an unset stack is a `NullPointerException` (`TypeError`, D10). */
export function stackOf(block: Block): BlockStack {
  const stack = block.getStack();
  if (stack === null) {
    throw new TypeError(
      'Cannot invoke "org.eclipse.elk.alg.rectpacking.util.BlockStack.updateDimension()" because the return value of "org.eclipse.elk.alg.rectpacking.util.Block.getStack()" is null',
    );
  }
  return stack;
}

/** Java `rows.remove(rows.get(index))`: `List.remove(Object)` is identity here (`RectRow` has no `equals`), first occurrence. */
export function removeRowObject(rows: RectRow[], row: RectRow): void {
  const at = rows.indexOf(row);
  if (at >= 0) {
    rows.splice(at, 1);
  }
}
