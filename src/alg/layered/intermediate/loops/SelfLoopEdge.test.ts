// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { LEdge } from '../../graph/LEdge.js';
import { SelfLoopEdge } from './SelfLoopEdge.js';

/** The constructor throws until 7g, so the ported member is exercised on an instance built without it. */
function bare(): SelfLoopEdge {
  return Object.create(SelfLoopEdge.prototype) as SelfLoopEdge;
}

describe('SelfLoopEdge (staged for mission 7g)', () => {
  it('cannot be constructed yet', () => {
    expect(() => new SelfLoopEdge()).toThrow(UnsupportedOperationException);
    expect(() => new SelfLoopEdge()).toThrow('SelfLoopEdge is ported in mission 7g');
  });

  it('getLEdge returns the original edge', () => {
    const edge = new LEdge();
    const loop = bare();
    Object.defineProperty(loop, 'lEdge', { value: edge });
    expect(loop.getLEdge()).toBe(edge);
  });

  it('every other member throws, naming itself and the mission', () => {
    const loop = bare();
    const members = [
      'getSLHyperLoop',
      'setSLHyperLoop',
      'getSLSource',
      'getSLTarget',
      'isInline',
      'getLabelSide',
    ] as const;
    for (const member of members) {
      expect(() => loop[member](), member).toThrow(UnsupportedOperationException);
      expect(() => loop[member](), member).toThrow(`SelfLoopEdge.${member} is ported in mission 7g`);
    }
  });
});
