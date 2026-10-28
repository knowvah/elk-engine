// SPDX-License-Identifier: EPL-2.0
// Node and port map lookups of ElkGraphImporter (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (group S14) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { LNode } from '../LNode.js';
import { lookup, lookupNode, type NodeAndPortMap } from './ElkGraphImporterMap.js';

describe('ElkGraphImporterMap (oracle site rows)', () => {
  it('finds no LNode for a node of a child that another algorithm lays out and rejects the edge', () => {
    // oracle: site/transform/misc/lookup-miss-other-algorithm; ElkGraphImporter.java:1090-1135 (transformEdge, map lookup)
    const run = runSiteRow('site/transform/misc/lookup-miss-other-algorithm');
    expect(run.exception('graph')).toEqual({
      class: 'UnsupportedGraphException',
      message:
        'The source or the target of edge ElkEdge "e1" ElkNode "a" (0.0,0.0 | 20.0,20.0) -> ElkNode "inside" (0.0,0.0 | 20.0,20.0) could not be found. This usually happens when an edge connects a node laid out by ELK Layered to a node in another level of hierarchy laid out by either another instance of ELK Layered or another layout algorithm alltogether. The former can be solved by setting the hierarchyHandling option to INCLUDE_CHILDREN.',
    });
  });

  // No oracle row reaches the null key: the importer never asks for the LNode of a missing parent. The case below
  // follows ElkGraphImporter.java, where nodeAndPortMap is a HashMap, whose get returns null for a missing key and
  // for the key null.
  it('answers null for the key null and for a key that was never put, like HashMap.get', () => {
    const elkgraph = ElkGraphUtil.createGraph();
    const known = ElkGraphUtil.createNode(elkgraph);
    const unknown = ElkGraphUtil.createNode(elkgraph);
    const lnode = new LNode(null);
    const map: NodeAndPortMap = new Map([[known, lnode]]);
    expect(lookup(map, null)).toBeNull();
    expect(lookup(map, unknown)).toBeNull();
    expect(lookup(map, known)).toBe(lnode);
    expect(lookupNode(map, null)).toBeNull();
    expect(lookupNode(map, known)).toBe(lnode);
  });
});
