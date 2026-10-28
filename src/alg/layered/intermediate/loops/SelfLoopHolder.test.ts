// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { SelfLoopHolder } from './SelfLoopHolder.js';

/** The constructor throws until 7g, so the ported member is exercised on an instance built without it. */
function bare(): SelfLoopHolder {
  return Object.create(SelfLoopHolder.prototype) as SelfLoopHolder;
}

describe('SelfLoopHolder (staged for mission 7g)', () => {
  it('cannot be constructed yet', () => {
    const construct = SelfLoopHolder as unknown as new () => SelfLoopHolder;
    expect(() => new construct()).toThrow(UnsupportedOperationException);
    expect(() => new construct()).toThrow('SelfLoopHolder is ported in mission 7g');
  });

  it('getSLPortMap returns the port map of the holder', () => {
    const holder = bare();
    const map = new Map();
    Object.defineProperty(holder, 'slPorts', { value: map });
    expect(holder.getSLPortMap()).toBe(map);
  });

  it('the static members throw, naming themselves and the mission', () => {
    for (const member of ['install', 'needsSelfLoopProcessing'] as const) {
      expect(() => SelfLoopHolder[member](), member).toThrow(UnsupportedOperationException);
      expect(() => SelfLoopHolder[member](), member).toThrow(`SelfLoopHolder.${member} is ported in mission 7g`);
    }
  });

  it('every other instance member throws, naming itself and the mission', () => {
    const holder = bare();
    const members = ['getLNode', 'getSLHyperLoops', 'arePortsHidden', 'setPortsHidden', 'getRoutingSlotCount'] as const;
    for (const member of members) {
      expect(() => holder[member](), member).toThrow(UnsupportedOperationException);
      expect(() => holder[member](), member).toThrow(`SelfLoopHolder.${member} is ported in mission 7g`);
    }
  });
});
