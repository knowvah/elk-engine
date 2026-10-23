// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { KVector } from '../math/KVector.js';
import { LabelSide } from '../options/LabelSide.js';
import { PortSide } from '../options/PortSide.js';
import { ElkUtil } from './ElkUtil.js';
import type { GraphAdapters } from './adapters/GraphAdapters.js';

/** Test-local `LabelAdapter` stub: only position and size are used by the label helpers. */
class StubLabel implements GraphAdapters.LabelAdapter<unknown> {
  constructor(
    private readonly position: KVector,
    private readonly size: KVector,
  ) {}
  getPosition(): KVector {
    return this.position;
  }
  getSize(): KVector {
    return this.size;
  }
  setSize(): void {
    throw new Error('unused');
  }
  setPosition(): void {
    throw new Error('unused');
  }
  getProperty<P>(_prop: IProperty<P>): P {
    throw new Error('unused');
  }
  hasProperty<P>(_prop: IProperty<P>): boolean {
    throw new Error('unused');
  }
  getVolatileId(): number {
    return 0;
  }
  setVolatileId(): void {
    throw new Error('unused');
  }
  getSide(): LabelSide {
    return LabelSide.UNKNOWN;
  }
  getText(): string {
    return '';
  }
}

/** Test-local `PortAdapter` stub: side, size and labels are what `getLabelsBounds`/`computeInsidePart` read. */
class StubPort implements GraphAdapters.PortAdapter<unknown> {
  constructor(
    private readonly side: PortSide,
    private readonly size: KVector,
    private readonly labels: StubLabel[],
  ) {}
  getSide(): PortSide {
    return this.side;
  }
  getSize(): KVector {
    return this.size;
  }
  getLabels(): Iterable<GraphAdapters.LabelAdapter<unknown>> {
    return this.labels;
  }
  getPosition(): KVector {
    throw new Error('unused');
  }
  setSize(): void {
    throw new Error('unused');
  }
  setPosition(): void {
    throw new Error('unused');
  }
  getProperty<P>(_prop: IProperty<P>): P {
    throw new Error('unused');
  }
  hasProperty<P>(_prop: IProperty<P>): boolean {
    throw new Error('unused');
  }
  getVolatileId(): number {
    return 0;
  }
  setVolatileId(): void {
    throw new Error('unused');
  }
  getMargin(): never {
    throw new Error('unused');
  }
  setMargin(): void {
    throw new Error('unused');
  }
  getIncomingEdges(): never {
    throw new Error('unused');
  }
  getOutgoingEdges(): never {
    throw new Error('unused');
  }
  hasCompoundConnections(): boolean {
    return false;
  }
}

const label = (x: number, y: number, w: number, h: number): StubLabel =>
  new StubLabel(new KVector(x, y), new KVector(w, h));
const PORT_SIZE = new KVector(2, 2);

describe('ElkUtil.getLabelsBounds', () => {
  // ElkUtil.java:625-645
  it('returns an empty rectangle without labels (:640-643)', () => {
    const bounds = ElkUtil.getLabelsBounds(new StubPort(PortSide.NORTH, PORT_SIZE, []));
    expect([bounds.x, bounds.y, bounds.width, bounds.height]).toEqual([0, 0, 0, 0]);
  });

  it('returns the bounds of a single label (:633-636)', () => {
    const bounds = ElkUtil.getLabelsBounds(new StubPort(PortSide.NORTH, PORT_SIZE, [label(2, 3, 4, 5)]));
    expect([bounds.x, bounds.y, bounds.width, bounds.height]).toEqual([2, 3, 4, 5]);
  });

  it('unions the bounds of several labels (:637-639)', () => {
    // x: 2..13 (max(6, 13)), y: -1..8 (max(8, 2))
    const port = new StubPort(PortSide.NORTH, PORT_SIZE, [label(2, 3, 4, 5), label(10, -1, 3, 3)]);
    const bounds = ElkUtil.getLabelsBounds(port);
    expect([bounds.x, bounds.y, bounds.width, bounds.height]).toEqual([2, -1, 11, 9]);
  });
});

describe('ElkUtil.computeInsidePart (port adapter)', () => {
  // ElkUtil.java:655-670, delegating to the five-argument overload with the labels' bounds
  it('uses the label bounds, the port size and its side (:656-659)', () => {
    expect(ElkUtil.computeInsidePart(new StubPort(PortSide.NORTH, PORT_SIZE, [label(3, 4, 10, 6)]), 1)).toBe(7);
    const two = [label(2, 3, 4, 5), label(10, -1, 3, 3)]; // bounds (2, -1, 11, 9)
    expect(ElkUtil.computeInsidePart(new StubPort(PortSide.WEST, PORT_SIZE, two), 1)).toBe(10);
    expect(ElkUtil.computeInsidePart(new StubPort(PortSide.EAST, PORT_SIZE, [label(-6, 0, 1, 1)]), 1)).toBe(5);
  });

  it('is 0 for a port without labels (empty bounds, :640-643)', () => {
    expect(ElkUtil.computeInsidePart(new StubPort(PortSide.NORTH, PORT_SIZE, []), 1)).toBe(0);
  });
});

describe('ElkUtil.computeInsidePart (five arguments)', () => {
  // ElkUtil.java:683-705; label at (3, 4) size 10x6, port size 2x2, border offset 1
  const inside = (side: PortSide, x = 3, y = 4): number =>
    ElkUtil.computeInsidePart(new KVector(x, y), new KVector(10, 6), new KVector(2, 2), 1, side);

  it.each([
    [PortSide.NORTH, 3, 4, 7], // max(0, 6 + 4 - (2 + 1)), :688
    [PortSide.NORTH, 3, -20, 0], // max(0, 6 - 20 - 3)
    [PortSide.SOUTH, 3, 4, 0], // max(0, -4 - 1), :692
    [PortSide.SOUTH, 3, -9, 8], // max(0, 9 - 1)
    [PortSide.EAST, -6, 4, 5], // max(0, 6 - 1), :696
    [PortSide.EAST, 3, 4, 0], // max(0, -3 - 1)
    [PortSide.WEST, 3, 4, 10], // max(0, 10 + 3 - (2 + 1)), :700
    [PortSide.WEST, -20, 4, 0], // max(0, 10 - 20 - 3)
    [PortSide.UNDEFINED, 3, 4, 0], // :686
  ])('is the inside part for %s at (%d, %d): %d', (side, x, y, expected) => {
    expect(inside(side, x, y)).toBe(expected);
  });
});
