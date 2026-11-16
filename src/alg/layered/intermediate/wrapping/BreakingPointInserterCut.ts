// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';

/**
 * Internal representation of a 'cut', for convenience. Java's private nested `BreakingPointInserter.Cut`, in a prefixed
 * file for the file size limit. The recursions `selfOrNext`, `offsetPrev` and `offsetSuc` run along a linked chain of
 * cuts and are explicit loops with the Java visit order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/BreakingPointInserter.java
 */
export class Cut {
  /** The 'original' cut. */
  index: number;

  /** An suggestion (intermediate) for a better cut. */
  newIndex = 0;

  /** The numerically closest, smaller cut. */
  prev: Cut | null = null;
  /** The numerically closest, larger cut. */
  suc: Cut | null = null;

  /** Flag indicating whether {@link Cut.newIndex} is final. */
  assigned = false;

  constructor(index: number) {
    this.index = index;
  }

  selfOrNext(): Cut | null {
    // recursion `suc.selfOrNext()` along the chain
    let cut: Cut = this;
    while (cut.assigned) {
      if (cut.suc === null) {
        return null;
      }
      cut = cut.suc;
    }
    return cut;
  }

  next(): Cut | null {
    if (this.suc !== null) {
      return this.suc.selfOrNext();
    }
    return null;
  }

  /** Java overloads `offset()` and the private `offset(int)`; one implementation dispatches on the argument count. */
  offset(): void;
  offset(offset: number): void;
  offset(...args: [] | [number]): void {
    if (args.length === 1) {
      this.index += args[0];
      return;
    }
    if (!this.assigned) {
      throw new IllegalStateException('Cannot offset an unassigned cut.');
    }
    const offset = this.newIndex - this.index;
    this.offset(offset);
    this.offsetPrev(offset);
    this.offsetSuc(offset);
  }

  private offsetPrev(offset: number): void {
    // recursion `prev.offsetPrev(offset)` along the chain
    for (let cut = this.prev; cut !== null && !cut.assigned; cut = cut.prev) {
      cut.offset(offset);
    }
  }

  private offsetSuc(offset: number): void {
    // recursion `suc.offsetSuc(offset)` along the chain
    for (let cut = this.suc; cut !== null && !cut.assigned; cut = cut.suc) {
      cut.offset(offset);
    }
  }
}
