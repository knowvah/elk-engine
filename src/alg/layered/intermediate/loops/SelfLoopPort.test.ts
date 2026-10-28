// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { SelfLoopPort } from './SelfLoopPort.js';

/** The constructor throws until 7g, so the ported members are exercised on an instance built without it. */
function bare(incoming: unknown[], outgoing: unknown[]): SelfLoopPort {
  const port = Object.create(SelfLoopPort.prototype) as SelfLoopPort;
  Object.defineProperty(port, 'incomingSLEdges', { value: incoming });
  Object.defineProperty(port, 'outgoingSLEdges', { value: outgoing });
  return port;
}

describe('SelfLoopPort (staged for mission 7g)', () => {
  it('cannot be constructed yet', () => {
    expect(() => new SelfLoopPort()).toThrow(UnsupportedOperationException);
    expect(() => new SelfLoopPort()).toThrow('SelfLoopPort is ported in mission 7g');
  });

  it('getIncomingSLEdges and getOutgoingSLEdges return their own lists', () => {
    const incoming: unknown[] = [];
    const outgoing: unknown[] = [];
    const port = bare(incoming, outgoing);
    expect(port.getIncomingSLEdges()).toBe(incoming);
    expect(port.getOutgoingSLEdges()).toBe(outgoing);
    expect(port.getIncomingSLEdges()).not.toBe(port.getOutgoingSLEdges());
  });

  it('every other member throws, naming itself and the mission', () => {
    const port = bare([], []);
    const members = ['getLPort', 'hadOnlySelfLoops', 'isHidden', 'setHidden', 'getSLNetFlow'] as const;
    for (const member of members) {
      expect(() => port[member](), member).toThrow(UnsupportedOperationException);
      expect(() => port[member](), member).toThrow(`SelfLoopPort.${member} is ported in mission 7g`);
    }
  });
});
