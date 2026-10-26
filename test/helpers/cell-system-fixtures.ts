// SPDX-License-Identifier: EPL-2.0
import { AtomicCell } from '../../src/alg/common/nodespacing/cellsystem/AtomicCell.js';
import type { ElkPadding } from '../../src/core/math/ElkPadding.js';
import { KVector } from '../../src/core/math/KVector.js';
import type { LabelSide } from '../../src/core/options/LabelSide.js';
import type { GraphAdapters } from '../../src/core/util/adapters/GraphAdapters.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';

/** Builds an atomic cell with the given content area size that contributes to both minimum sizes. */
export function atomicCell(width: number, height: number, contributes = true): AtomicCell {
  const cell = new AtomicCell();
  cell.setMinimumContentAreaSize(new KVector(width, height), false);
  cell.setContributesToMinimumWidth(contributes);
  cell.setContributesToMinimumHeight(contributes);
  return cell;
}

/** Sets a cell padding (top, right, bottom, left) in place. */
export function pad(padding: ElkPadding, top: number, right: number, bottom: number, left: number): void {
  padding.set(top, right, bottom, left);
}

/** A label adapter that only knows its size and remembers the position it was given. */
export class FakeLabelAdapter implements GraphAdapters.LabelAdapter<null> {
  position: KVector = new KVector();
  readonly #size: KVector;

  constructor(width: number, height: number) {
    this.#size = new KVector(width, height);
  }

  getSize(): KVector {
    return this.#size;
  }

  setPosition(pos: KVector): void {
    this.position = pos;
  }

  getPosition(): KVector {
    return this.position;
  }

  setSize(size: KVector): void {
    this.#size.set(size);
  }

  getSide(): LabelSide {
    throw new Error('FakeLabelAdapter.getSide is not needed');
  }

  getText(): string {
    return '';
  }

  getProperty<P>(_prop: IProperty<P>): P {
    throw new Error('FakeLabelAdapter.getProperty is not needed');
  }

  hasProperty<P>(_prop: IProperty<P>): boolean {
    return false;
  }

  getVolatileId(): number {
    return 0;
  }

  setVolatileId(_volatileId: number): void {}
}
