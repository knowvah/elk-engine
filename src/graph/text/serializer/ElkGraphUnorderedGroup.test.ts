// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { groupMember, orderUnorderedGroup, type GroupMember } from './ElkGraphUnorderedGroup.js';
import { ElkFeature, ElkGraphTransientValueService } from './ElkGraphTransientValueService.js';
import { ElkGraphUtil } from '../../util/ElkGraphUtil.js';

function member(key: string, entryOptional: boolean, required: boolean, available = true): GroupMember<string> {
  return { key, available, entryOptional, required };
}

describe('orderUnorderedGroup', () => {
  it('writes nothing when no member holds a required value', () => {
    expect(orderUnorderedGroup([member('a', true, false), member('b', true, false)])).toEqual([]);
  });

  it('writes the members with a required entry first, in declaration order, and stops', () => {
    const members = [member('a', true, false), member('b', false, true), member('c', false, true)];
    expect(orderUnorderedGroup(members)).toEqual(['b', 'c']);
  });

  it('writes an optional member that sorts ahead of the only required one', () => {
    expect(orderUnorderedGroup([member('a', true, false), member('b', true, true)])).toEqual(['a', 'b']);
  });

  it('writes a required member behind a non-optional one only when it must', () => {
    expect(orderUnorderedGroup([member('a', true, true), member('b', false, true)])).toEqual(['b', 'a']);
  });

  it('never enters a member without a value to consume', () => {
    expect(orderUnorderedGroup([member('a', false, true, false), member('b', true, true)])).toEqual(['b']);
  });
});

describe('groupMember', () => {
  const service = new ElkGraphTransientValueService();

  it('is optional but available for an unset pair and required for a set one', () => {
    const node = ElkGraphUtil.createNode(null);
    const features = [ElkFeature.X, ElkFeature.Y];
    expect(groupMember(service, node, 'p', features)).toEqual(member('p', true, false));
    node.setY(3);
    expect(groupMember(service, node, 'p', features)).toEqual(member('p', true, true));
    node.setX(1);
    expect(groupMember(service, node, 'p', features)).toEqual(member('p', false, true));
  });

  it('is unavailable for a reference that is null', () => {
    const section = ElkGraphUtil.createEdgeSection(null);
    expect(groupMember(service, section, 'in', [ElkFeature.INCOMING_SHAPE])).toEqual(member('in', false, false, false));
  });
});
