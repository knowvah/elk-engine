// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { KVector } from '../math/KVector.js';
import { Group } from './BoxLayoutProviderGroup.js';

// Expected values are traced from the nested class `BoxLayoutProvider.Group` (BoxLayoutProvider.java:687-808).

function node(width: number, height: number, x = 0, y = 0): ElkNode {
  const n = ElkGraphUtil.createNode(null);
  n.setDimensions(width, height);
  n.setLocation(x, y);
  return n;
}

/** A group of groups with an explicit bounding size, `right` and `bottom` (set by the packing in Java). */
function composite(members: Group[], size: KVector, right: Group[], bottom: Group[]): Group {
  const g = new Group(members);
  g.size = size;
  g.right = right;
  g.bottom = bottom;
  return g;
}

describe('Group: constructors (:701-711)', () => {
  it('wraps a node and moves it to the origin (:701-704)', () => {
    const n = node(30, 20, 7, 8);
    const g = new Group(n);
    expect(g.node).toBe(n);
    expect([n.getX(), n.getY()]).toEqual([0, 0]);
    expect([g.groups, g.size, g.bottom, g.right]).toEqual([null, null, null, null]);
  });

  it('copies the groups and starts with an empty size, bottom and right (:706-711)', () => {
    const members = [new Group(node(1, 1))];
    const g = new Group(members);
    members.push(new Group(node(2, 2)));
    expect(g.node).toBeNull();
    expect(g.groups).toHaveLength(1);
    expect([g.bottom, g.right]).toEqual([[], []]);
    expect([(g.size as KVector).x, (g.size as KVector).y]).toEqual([0, 0]);
  });
});

describe('Group: measures (:713-728)', () => {
  it('reads width, height and area from the node (:713-728)', () => {
    const g = new Group(node(30, 20));
    expect([g.getWidth(), g.getHeight(), g.area()]).toEqual([30, 20, 600]);
  });

  it('reads width, height and area from the size of a group of groups (:713-728)', () => {
    const g = composite([], new KVector(7, 5), [], []);
    expect([g.getWidth(), g.getHeight(), g.area()]).toEqual([7, 5, 35]);
  });
});

describe('Group: setWidth and setHeight (:737-766)', () => {
  it('sets the node width and height directly (:739-741, :755-757)', () => {
    const n = node(30, 20);
    const g = new Group(n);
    g.setWidth(50);
    g.setHeight(25);
    expect([n.getWidth(), n.getHeight()]).toEqual([50, 25]);
  });

  it('adds the width delta to every right-most inner group (:741-746)', () => {
    const a = node(10, 10);
    const b = node(20, 10);
    const c = node(15, 10);
    const [ga, gb, gc] = [new Group(a), new Group(b), new Group(c)] as [Group, Group, Group];
    const outer = composite([ga, gb, gc], new KVector(40, 10), [gb, gc], []);
    outer.setWidth(46); // delta 6
    expect([a.getWidth(), b.getWidth(), c.getWidth()]).toEqual([10, 26, 21]);
  });

  it('adds the height delta to every bottom-most inner group (:757-762)', () => {
    const a = node(10, 10);
    const b = node(10, 30);
    const [ga, gb] = [new Group(a), new Group(b)] as [Group, Group];
    const outer = composite([ga, gb], new KVector(10, 40), [], [ga, gb]);
    outer.setHeight(44); // delta 4
    expect([a.getHeight(), b.getHeight()]).toEqual([14, 34]);
  });

  it('recurses through nested groups (:741-746)', () => {
    const leaf = node(10, 10);
    const gl = new Group(leaf);
    const inner = composite([gl], new KVector(10, 10), [gl], [gl]);
    const outer = composite([inner], new KVector(10, 10), [inner], [inner]);
    outer.setWidth(13);
    outer.setHeight(18);
    expect([leaf.getWidth(), leaf.getHeight()]).toEqual([13, 18]);
  });
});

describe('Group: translate and translateInnerNodes (:773-797)', () => {
  it('adds the offsets to the node location, recursively for groups (:773-782)', () => {
    const a = node(1, 1);
    const b = node(1, 1);
    const g = new Group([new Group(a), new Group(b)]);
    g.translate(3, 4);
    g.translate(1, 1);
    expect([a.getX(), a.getY(), b.getX(), b.getY()]).toEqual([4, 5, 4, 5]);
  });

  it('moves the nested nodes of wrapped nodes, recursively for groups (:790-797)', () => {
    const a = node(10, 10, 2, 3);
    const childOfA = ElkGraphUtil.createNode(a);
    childOfA.setLocation(5, 6);
    const g = new Group([new Group(a)]);
    g.translateInnerNodes(7, 1);
    expect([childOfA.getX(), childOfA.getY()]).toEqual([12, 7]);
    expect([a.getX(), a.getY()]).toEqual([0, 0]);
  });
});

describe('Group: toString (:801-806)', () => {
  it('prints the node, or the list of the inner groups', () => {
    const a = node(1, 1);
    const b = node(2, 2);
    expect(new Group(a).toString()).toBe(a.toString());
    expect(new Group([new Group(a), new Group(b)]).toString()).toBe(`[${a.toString()}, ${b.toString()}]`);
  });
});
